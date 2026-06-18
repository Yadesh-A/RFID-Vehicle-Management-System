import React from 'react';
import VehicleAdmin from '../components/VehicleAdmin'; // This component handles the CRUD operations
import PlateScanner from '../components/PlateScanner'; // This is the plate scanner

export default function AdminPage() {
  return (
    <div style={{ padding: '20px' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>Admin Dashboard</h1>

      {/* Section 1: Vehicle & Driver Management */}
      <section style={{ marginBottom: '40px', padding: '20px', border: '1px solid #eee', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <VehicleAdmin />
      </section>

      {/* Section 2: Live Plate Scanner */}
      <section style={{ padding: '20px', border: '1px solid #eee', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <PlateScanner />
      </section>
    </div>
  );
}