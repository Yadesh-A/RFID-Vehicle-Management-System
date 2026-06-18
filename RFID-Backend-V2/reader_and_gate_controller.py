import threading
import time
import requests
import serial
import re
from collections import OrderedDict
from datetime import datetime

# ================= CONFIGURATION =================
# Hardware Ports
ENTRY_READER_PORT = 'COM10'
EXIT_READER_PORT  = 'COM3'
RELAY_PORT        = '/dev/ttyACM0'
RELAY_BAUD        = 115200
READER_BAUD       = 115200 

# API Configuration
DJANGO_API_URL    = 'http://127.0.0.1:8000/api/scan/'

# Logic Settings (Optimized)
QUIET_GAP_MS         = 80    # Wait 80ms for data burst to finish
DUPLICATE_SCAN_DELAY = 5.0   # How long to ignore the same tag (API Debounce)
CROSS_GATE_DELAY     = 40    # Passback prevention time
AUTO_CLOSE_MS        = 5000  # Gate auto-close timer

# ================= GLOBAL LOCKS =================
recent_global_scans = {}
global_lock = threading.Lock()

# ================= HELPER FUNCTIONS =================
def log(ctx, msg, level="INFO"):
    ts = datetime.now().strftime("%H:%M:%S")
    icon = "✅" if level == "SUCCESS" else "❌" if level == "ERROR" else "⚠️" if level == "WARN" else "ℹ️"
    print(f"[{ts}] [{ctx:^8}] {icon} {msg}", flush=True)

def is_cross_gate_duplicate(tag_id):
    now = time.time()
    with global_lock:
        if tag_id in recent_global_scans:
            if now - recent_global_scans[tag_id] < CROSS_GATE_DELAY:
                return True
        recent_global_scans[tag_id] = now
        expired = [k for k, v in recent_global_scans.items() if now - v > CROSS_GATE_DELAY]
        for k in expired: del recent_global_scans[k]
        return False

# ================= RELAY CONTROLLER =================
class SharedRelayController:
    def __init__(self, port, baud):
        self.port = port
        self.baud = baud
        self.lock = threading.Lock()
        self.serial_port = None
        self.timer = None
        self.connect()

    def connect(self):
        try:
            self.serial_port = serial.Serial(self.port, self.baud, timeout=1)
            time.sleep(2)
            log("RELAY", f"Connected {self.port}", "SUCCESS")
        except:
            log("RELAY", "Connect failed", "ERROR")

    def send(self, cmd):
        with self.lock:
            try:
                if self.serial_port and self.serial_port.is_open:
                    self.serial_port.write(f"{cmd}\n".encode())
                    time.sleep(0.05)
            except: pass

    def allow(self):
        log("RELAY", "Gate OPEN", "SUCCESS")
        self.send("UP"); self.send("allow")
        if self.timer: self.timer.cancel()
        self.timer = threading.Timer(AUTO_CLOSE_MS / 1000, self.close)
        self.timer.start()

    def deny(self):
        log("RELAY", "Gate DENIED", "ERROR")
        self.send("notallow")

    def close(self):
        log("RELAY", "Gate AUTO CLOSE", "INFO")
        self.send("DOWN"); time.sleep(0.3); self.send("DOWN"); self.send("notallow")
        
    def close_port(self):
        if self.serial_port: self.serial_port.close()

# ================= READER THREAD (STABILITY MODE) =================
class RFIDReaderThread(threading.Thread):
    def __init__(self, name, port, gate, relay):
        super().__init__(daemon=True)
        self.name = name
        self.port = port
        self.gate = gate
        self.relay = relay
        self.recent = OrderedDict()
        self.lock = threading.Lock()
        
        # Stability Buffers
        self.e2_candidate = None 
        self.ven_candidate = None
        
        # 🔥 PERFECTED REGEX: Looks for "VEN" followed strictly by 9 digits and 2 letters.
        # This ignores the hardware garbage characters completely.
        self.re_ven = re.compile(r"VEN(\d{9}[A-Z]{2})", re.IGNORECASE)

    def run(self):
        log(self.name, f"Opening {self.port} @ {READER_BAUD}")
        try:
            self.serial_conn = serial.Serial(self.port, READER_BAUD, timeout=0.05)
        except Exception as e:
            log(self.name, f"Port error: {e}", "ERROR")
            return

        buffer = bytearray()
        last_byte_time = time.monotonic()

        print(f"[{self.name}] Reader loop started...")

        while True:
            try:
                n = self.serial_conn.in_waiting
                if n > 0:
                    chunk = self.serial_conn.read(n)
                    buffer.extend(chunk)
                    last_byte_time = time.monotonic()
                else:
                    time_since_data = (time.monotonic() - last_byte_time) * 1000
                    
                    if len(buffer) > 0 and time_since_data > QUIET_GAP_MS:
                        self.process_frame(bytes(buffer))
                        buffer.clear() 

                time.sleep(0.005) 

            except Exception as e:
                if "device reports readiness" not in str(e):
                    log(self.name, f"Loop error: {e}", "ERROR")
                time.sleep(1)

    def process_frame(self, data_frame):
        tag_found = False
        
        # --- PATH 1: E2 BINARY SEARCH ---
        i = 0
        raw_len = len(data_frame)
        
        while i < raw_len:
            if data_frame[i] == 0xE2 and i + 12 <= raw_len:
                epc_bytes = data_frame[i : i+12]
                epc_hex = epc_bytes.hex().upper()
                
                # Ghost Filter
                if "CF00" in epc_hex or "FD" in epc_hex:
                    i += 1; continue

                if epc_hex == self.e2_candidate:
                    print(f"[{self.name}] 🔍 E2 TAG VERIFIED: {epc_hex}")
                    self.handle_tag(epc_hex)
                    tag_found = True
                    i += 12 
                else:
                    self.e2_candidate = epc_hex
                    i += 1 
            else:
                i += 1

        # --- PATH 2: VEN TEXT SEARCH ---
        if not tag_found:
            clean_bytes = bytes([b for b in data_frame if 32 <= b <= 126])
            try:
                text_stream = clean_bytes.decode('ascii', errors='ignore')
                
                for match in self.re_ven.finditer(text_stream):
                    
                    # match.group(1) holds exactly the 9 digits and 2 letters (e.g., 202600001BN)
                    # We inject the missing "QR" so it matches your database!
                    final_tag = f"VENQR{match.group(1).upper()}"
                    
                    if final_tag == self.ven_candidate:
                        print(f"[{self.name}] 🔍 VEN TAG VERIFIED: {final_tag}")
                        self.handle_tag(final_tag)
                        break 
                    else:
                        self.ven_candidate = final_tag
                        break
            except:
                pass

    def is_local_duplicate(self, tag):
        with self.lock:
            if tag in self.recent and time.time() - self.recent[tag] < DUPLICATE_SCAN_DELAY:
                return True
            self.recent[tag] = time.time()
            if len(self.recent) > 50: self.recent.popitem(last=False)
            return False

    def handle_tag(self, tag):
        if self.is_local_duplicate(tag): return 
        if is_cross_gate_duplicate(tag):
            log(self.name, f"Blocked 40s: {tag}", "WARN")
            return
        
        log(self.name, f"VALID TAG → {tag}", "SUCCESS")
        threading.Thread(target=self.send_api, args=(tag,)).start()

    def send_api(self, tag):
        try:
            r = requests.post(DJANGO_API_URL, json={"tag_id": tag, "gate": self.gate, "action": self.gate}, timeout=2)
            if r.status_code == 200 and r.json().get("success"):
                log(self.name, f"GRANTED: {r.json().get('vehicle','Unknown')}", "SUCCESS")
                self.relay.allow()
            elif r.status_code == 409:
                log(self.name, "PASSBACK", "WARN"); self.relay.deny()
            else:
                log(self.name, f"DENIED ({tag})", "ERROR"); self.relay.deny()
        except:
            log(self.name, "API Error", "ERROR"); self.relay.deny()

# ================= MAIN =================
if __name__ == "__main__":
    print("\n🚀 UNIFIED GATE CONTROLLER (GHOST-PROOF MODE)\n")
    relay = SharedRelayController(RELAY_PORT, RELAY_BAUD)
    entry = RFIDReaderThread("ENTRY", ENTRY_READER_PORT, "ENTRY", relay)
    exit_  = RFIDReaderThread("EXIT",  EXIT_READER_PORT,  "EXIT",  relay)
    entry.start(); exit_.start()
    while True: time.sleep(1)