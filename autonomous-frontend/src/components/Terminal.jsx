import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const BANNER = 'AUTONOMOUS CORE OS v2.0\n-----------------------\nTYPE "HELP" OR "TOOLS" TO BEGIN';

export default function Terminal() {
  const [history, setHistory] = useState([BANNER, '']);
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [history]);

  const runCommand = async (cmd) => {
    const cleanCmd = cmd.trim();
    if (!cleanCmd) return;

    if (cleanCmd.toLowerCase() === 'tools') {
      try {
        const res = await axios.get('http://localhost:8000/api/tools');
        const toolList = res.data.map(t => ' > [' + t.category + '] ' + t.id + ' (' + t.supported_os + ') - ' + t.description);
        setHistory(prev => [...prev, '--- AVAILABLE ARSENAL ---', ...toolList]);
      } catch (err) {
        setHistory(prev => [...prev, 'ERROR: UPLINK_FAILURE_TO_ARSENAL']);
      }
      return;
    }

    if (cleanCmd.startsWith('ask ')) {
      const prompt = cleanCmd.replace('ask ', '');
      try {
        const res = await axios.post('http://localhost:8000/api/ai/generate-command', { prompt });
        setHistory(prev => [...prev, 'AI_SUGGESTION: ' + res.data.tool, 'COMMAND: ' + res.data.command]);
        setInput(res.data.command);
      } catch (err) {
        setHistory(prev => [...prev, 'AI_ERROR: UNABLE TO MAP INTENT.']);
      }
      return;
    }

    try {
      const res = await axios.post('http://localhost:8000/api/terminal/execute', { command: cleanCmd });
      const output = res.data.stdout || res.data.stderr || 'Done.';
      setHistory(prev => [...prev, 'operator@autonomous:~$ ' + cleanCmd, output]);
    } catch (err) {
      setHistory(prev => [...prev, 'ERROR: CORE_ENGINE_OFFLINE']);
    }
  };

  return (
    <div ref={scrollRef} style={{ backgroundColor: '#020617', color: '#10b981', padding: '20px', height: '100%', fontFamily: 'monospace', overflowY: 'auto', border: '1px solid #1e293b', borderRadius: '8px' }}>
      {history.map((line, i) => (
        <div key={i} style={{ whiteSpace: 'pre-wrap', marginBottom: '5px' }}>
          {line.includes(' > [') ? (
            <span onClick={() => setInput(line.split('] ')[1].split(' (')[0] + ' ')} style={{ cursor: 'pointer', textDecoration: 'underline' }}>{line}</span>
          ) : line}
        </div>
      ))}
      <div style={{ display: 'flex', marginTop: '10px' }}>
        <span style={{ color: '#64748b' }}>operator@autonomous:~$ </span>
        <input 
          autoFocus 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          onKeyDown={(e) => { if (e.key === 'Enter') { setHistory(prev => [...prev, 'operator@autonomous:~$ ' + input]); runCommand(input); setInput(''); } }} 
          style={{ background: 'none', border: 'none', color: '#10b981', outline: 'none', flex: 1, fontFamily: 'monospace' }} 
        />
      </div>
    </div>
  );
}
