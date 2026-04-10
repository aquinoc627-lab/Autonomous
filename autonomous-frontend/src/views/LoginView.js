import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuthStore } from '../store/authStore';

export default function LoginView() {
  const [, setLocation] = useLocation();
  const { authenticate } = useAuthStore();
  const [username, setUsername] = useState('');

  const handleHandshake = (e) => {
    e.preventDefault();
    authenticate(username || 'Operator-V');
    setLocation('/dashboard');
  };

  return (
    <div style={{ backgroundColor: '#0f172a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'monospace' }}>
      <form onSubmit={handleHandshake} style={{ border: '1px solid #1e293b', padding: '40px', borderRadius: '12px', background: '#0f172a', width: '350px', textAlign: 'center' }}>
        <h1 style={{ color: '#10b981' }}>theCORE</h1>
        <p style={{ fontSize: '10px', color: '#64748b', marginBottom: '20px' }}>SECURE ACCESS PROTOCOL</p>
        <input 
          type="text" 
          placeholder="OPERATOR ID" 
          style={{ width: '100%', background: '#000', border: '1px solid #334155', color: '#fff', padding: '10px', marginBottom: '10px' }} 
          onChange={(e) => setUsername(e.target.value)}
        />
        <button type="submit" style={{ width: '100%', background: '#10b981', color: '#000', fontWeight: 'bold', padding: '10px', border: 'none', cursor: 'pointer' }}>
          LOGIN
        </button>
      </form>
    </div>
  );
}
