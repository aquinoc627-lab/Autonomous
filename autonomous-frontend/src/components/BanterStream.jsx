import React, { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { banterAPI } from '../api';

export default function BanterStream() {
  const scrollRef = useRef(null);
  const { data: messages } = useQuery({
    queryKey: ['banter-logs'],
    queryFn: () => banterAPI.list().then(res => res.data),
    refetchInterval: 3000 
  });

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  return (
    <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '15px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <p style={{ color: '#10b981', fontSize: '10px', fontWeight: 'bold', marginBottom: '10px', textTransform: 'uppercase' }}>
        CORE_LOG_STREAM // AUTONOMOUS_NODE
      </p>
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', fontSize: '11px', fontFamily: 'monospace' }}>
        {messages?.map((msg, i) => (
          <div key={i} style={{ marginBottom: '8px' }}>
            <span style={{ color: '#64748b', marginRight: '5px' }}>[{new Date(msg.created_at || Date.now()).toLocaleTimeString([], {hour12:false})}]</span>
            <span style={{ color: '#cbd5e1' }}>{msg.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
