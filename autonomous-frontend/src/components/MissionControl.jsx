import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

export default function MissionControl() {
  const [name, setName] = useState('');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (newName) => axios.post(`http://localhost:8000/api/missions/?name=${newName}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['missions-list-all']);
      setName('');
    }
  });

  return (
    <div style={{ padding: '20px', backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b' }}>
      <h3 style={{ color: '#10b981', fontSize: '10px', marginBottom: '15px', letterSpacing: '1px' }}>UPLINK_NEW_NODE</h3>
      <div style={{ display: 'flex', gap: '10px' }}>
        <input 
          value={name}
          onChange={(e) => setName(e.target.value.toUpperCase())}
          placeholder="NODE_IDENTIFIER..."
          style={{ flex: 1, backgroundColor: '#020617', border: '1px solid #1e293b', color: '#10b981', padding: '8px', fontSize: '11px', outline: 'none', fontFamily: 'monospace' }}
        />
        <button 
          onClick={() => name && mutation.mutate(name)}
          style={{ backgroundColor: '#10b981', color: '#020617', border: 'none', padding: '0 15px', fontWeight: 'bold', fontSize: '10px', cursor: 'pointer', borderRadius: '4px' }}
        >
          {mutation.isLoading ? 'CONNECTING...' : 'INITIALIZE'}
        </button>
      </div>
    </div>
  );
}
