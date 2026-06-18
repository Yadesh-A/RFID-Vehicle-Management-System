import React, { useEffect, useRef, useState } from 'react';
import { createWorker } from 'tesseract.js';
import { getApiUrl, API_CONFIG } from '../config/api.js';

const PREFERRED_CAM_KEY = 'ven_preferred_camera_deviceId';

export default function PlateScanner({ backendUrl = `${import.meta.env.VITE_API_BASE_URL.replace('/api', '')}:5000` }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const workerRef = useRef(null);

  const [status, setStatus] = useState('Loading OCR worker…');
  const [workerReady, setWorkerReady] = useState(false);
  const [running, setRunning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastPlate, setLastPlate] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [preferredDeviceId, setPreferredDeviceId] = useState(
    localStorage.getItem(PREFERRED_CAM_KEY) || ''
  );

  // ---------- TESSERACT INIT ----------
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setStatus('Loading OCR worker…');
        const worker = await createWorker({
          workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js',
          corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core.wasm.js',
          langPath: '/tesseract',   // 👈 looks inside public/tesseract/
        });

        workerRef.current = worker;

        setStatus('Loading language…');
        await worker.loadLanguage('eng');

        setStatus('Initializing OCR…');
        await worker.initialize('eng');

        await worker.setParameters({
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789- ',
          tessedit_pageseg_mode: '7',
          user_defined_dpi: '300',
          preserve_interword_spaces: '1',
        });

        if (!cancelled) {
          setWorkerReady(true);
          setStatus('OCR ready');
        }
      } catch (e) {
        console.error('Tesseract init error:', e);
        setStatus('OCR load failed (see console).');
      }
    })();

    return () => {
      cancelled = true;
      (async () => { try { await workerRef.current?.terminate(); } catch {} })();
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- CAMERA ----------
  const describeMediaError = (err) => {
    if (!err) return 'Unknown error.';
    const n = err.name || '';
    if (n === 'NotAllowedError' || n === 'PermissionDeniedError') return 'Permission denied — allow camera in site settings.';
    if (n === 'NotFoundError' || n === 'OverconstrainedError') return 'No matching camera found. Pick another device.';
    if (n === 'NotReadableError' || n === 'TrackStartError') return 'Camera is in use by another app (Zoom/Teams).';
    return `${n}: ${err.message || String(err)}`;
  };

  const listVideoInputs = async () => {
    const devs = await navigator.mediaDevices.enumerateDevices();
    const vids = devs.filter(d => d.kind === 'videoinput');
    setDevices(vids);

    const preferredPresent = vids.some(d => d.deviceId === preferredDeviceId);
    const firstId = vids[0]?.deviceId || '';
    setSelectedDeviceId(preferredPresent ? preferredDeviceId : firstId);
    return vids;
  };

  const startWithDeviceId = async (deviceId) => {
    const constraints = deviceId
      ? { video: { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false }
      : { video: true, audio: false };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    const v = videoRef.current;
    if (v) {
      v.srcObject = stream;
      v.muted = true;
      v.playsInline = true;
      await v.play().catch(()=>{});
    }
    setRunning(true);
    setStatus('Camera started');
    setErrorMsg('');
  };

  const startCamera = async () => {
    setStatus('Requesting camera…');
    setErrorMsg('');
    try {
      if (preferredDeviceId) {
        try { await startWithDeviceId(preferredDeviceId); return; } catch {}
      }
      if (selectedDeviceId) {
        try { await startWithDeviceId(selectedDeviceId); return; } catch {}
      }
      await startWithDeviceId('');
      await listVideoInputs();
    } catch (err) {
      console.error('startCamera failed:', err);
      setStatus('Camera failed to start');
      setErrorMsg(describeMediaError(err));
      await listVideoInputs();
    }
  };

  const stopCamera = () => {
    const v = videoRef.current;
    try {
      const s = v?.srcObject;
      if (s) s.getTracks().forEach(t => t.stop());
      if (v) v.srcObject = null;
    } catch {}
    setRunning(false);
    setStatus('Camera stopped');
  };

  // Auto-start camera once
  useEffect(() => {
    (async () => {
      await listVideoInputs();
      if (!running) {
        try { await startCamera(); } catch {}
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const savePreferred = () => {
    if (!selectedDeviceId) return;
    localStorage.setItem(PREFERRED_CAM_KEY, selectedDeviceId);
    setPreferredDeviceId(selectedDeviceId);
    setStatus('Saved this camera as default.');
  };

  // ---------- SERVER TEST ----------
  const testSave = async () => {
    try {
      const r = await fetch(backendUrl, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ plate: 'TEST-1234', entry_type: 'entry' })
      });
      const j = await r.json();
      setStatus(r.ok ? 'Test save OK (check Django admin)' : 'Test save failed: ' + (j.detail || 'unknown'));
    } catch (e) {
      console.error('Test save error:', e);
      setStatus('Test save failed (see console)');
    }
  };

  // ---------- CAPTURE + OCR ----------
  const captureAndOCR = async () => {
    if (!workerReady) { setStatus('OCR not ready'); return; }
    if (!running) { setStatus('Start camera first'); return; }
    if (isProcessing) return;

    setIsProcessing(true);
    setStatus('Capturing…');

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const cropW = canvas.width * 0.9;
      const cropH = canvas.height * 0.35;
      const sx = (canvas.width - cropW) / 2;
      const sy = canvas.height * 0.55;

      const crop = document.createElement('canvas');
      crop.width = Math.round(cropW);
      crop.height = Math.round(cropH);
      crop.getContext('2d').drawImage(canvas, sx, sy, cropW, cropH, 0, 0, crop.width, crop.height);

      const dataUrl = crop.toDataURL('image/jpeg', 0.92);

      setStatus('Running OCR…');
      const { data: { text } } = await workerRef.current.recognize(dataUrl);
      const cleaned = (text || '').toUpperCase().replace(/[^A-Z0-9- ]/g, '').trim();

      if (cleaned) {
        setLastPlate(cleaned);
        setStatus(`Detected: ${cleaned} — saving…`);
        try {
          const resp = await fetch(backendUrl, {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ plate: cleaned, entry_type: 'entry' })
          });
          const j = await resp.json();
          setStatus(resp.ok ? `Saved: ${cleaned}` : 'Server save failed: ' + (j.detail || 'unknown'));
        } catch (e) {
          console.warn('Send to backend failed', e);
          setStatus('Detected but failed to send to server');
        }
      } else {
        setStatus('No readable text detected. Try better light / closer frame.');
      }
    } catch (e) {
      console.error('Capture/OCR error', e);
      setStatus('OCR/capture error (see console)');
    } finally {
      setIsProcessing(false);
    }
  };

  // Auto-capture every 3s
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => captureAndOCR(), 3000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, workerReady]);

  // ---------- UI ----------
  return (
    <div style={{ padding: 12, maxWidth: 1100 }}>
      <h2>Number Plate Scanner</h2>

      <div style={{ padding:'8px 12px', border:'1px solid #ddd', borderRadius:6, marginBottom:10, background:'#f8f8f8' }}>
        <strong>Status:</strong> {status}
        {errorMsg && <div style={{ marginTop: 6, color: 'crimson' }}><strong>Error:</strong> {errorMsg}</div>}
      </div>

      <div style={{ display:'flex', gap:16 }}>
        {/* Left: video */}
        <div style={{ flex: 1 }}>
          <video
            ref={videoRef}
            style={{ width:'100%', height:380, background:'#fafafa', border:'1px solid #ddd' }}
            playsInline
            muted
            autoPlay
          />
          <div style={{ marginTop:8, display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
            <button onClick={running ? stopCamera : startCamera}>
              {running ? 'Stop Camera' : 'Start Camera'}
            </button>
            <button onClick={captureAndOCR} disabled={!running || !workerReady || isProcessing}>
              Capture now
            </button>
            <button onClick={testSave}>Test Save (no camera)</button>

            {/* Camera picker */}
            <label style={{ marginLeft: 12 }}>
              Camera:&nbsp;
              <select
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                style={{ maxWidth: 360 }}
              >
                {devices.length === 0 && <option value="">(no cameras found)</option>}
                {devices.map(d => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Camera ${d.deviceId.slice(0,6)}…`}
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={() => { stopCamera(); setTimeout(startCamera, 150); }}
              disabled={!selectedDeviceId}
            >
              Use selected
            </button>
            <button onClick={savePreferred} disabled={!selectedDeviceId}>
              Set as default
            </button>
          </div>
        </div>

        {/* Right: last plate */}
        <div style={{ width: 360 }}>
          <strong>Last detected plate:</strong>
          <div style={{ marginTop: 6, padding: 8, border: '1px solid #ccc', minHeight: 40 }}>
            {lastPlate || '<none detected yet>'}
          </div>
        </div>
      </div>

      <canvas ref={canvasRef} style={{ display:'none' }} />
    </div>
  );
}
