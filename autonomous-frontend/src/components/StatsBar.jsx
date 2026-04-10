import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export default function StatsBar() {
  const { data: stats } = useQuery({
    queryKey: ['system-stats'],
    queryFn: () => axios.get('http://localhost:8000/api/system/stats').then(res => res.data),
    refetchInterval: 2000
  });

  const Stat = ({ label, value }) => (
    <div style={{ display: 'flex', gap: '10px', fontSize: '10px', borderLeft: '1px solid #1e293b', paddingLeft: '15px' }}>
      <span style={{ color: '#64748b' }}>{label}:</span>
      <span style={{ color: '#10b981', fontWeight: 'bold' }}>{value}%</span>
    </div>
  );

  return (
    <div style={{ display: 'flex', gap: '20px', padding: '10px 40px', backgroundColor: '#020617', borderBottom: '1px solid #1e293b' }}>
      <Stat label="CPU_LOAD" value={stats?.cpu || 0} />
      <Stat label="MEM_UTIL" value={stats?.ram || 0} />
      <Stat label="DSK_SYNC" value={stats?.disk || 0} />
      <div style={{ marginLeft: 'auto', fontSize: '10px', color: '#10b981' }}>SYSTEM_STATUS: {stats?.status}</div>
    </div>
  );
}
