import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { TERMINAL_BANNER } from './TerminalBanner';

export default function Terminal() {
  const [history, setHistory] = useState([TERMINAL_BANNER, 'TYPE "HELP" OR "TOOLS" TO BEGIN', '']);
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
        const toolList = res.data.map(t => ` > [${t.category}] ${t.id} (${t.supported_os}) - ${t.description}`);
        setHistory(prev => [...prev, '--- AVAILABLE ARSENAL ---', ...toolList, 'TIP: CLICK A TOOL NAME TO INITIALIZE.']);
      } catch (err) {
        setHistory(prev => [...prev, 'ERROR: COULD NOT RETRIEVE ARSENAL']);
      }
      return;
    }

    if (cleanCmd.startsWith('ask ')) {
      const prompt = cleanCmd.replace('ask ', '');
      try {
        const res = await axios.post('http://localhost:8000/api/ai/generate-command', { prompt });
        setHistory(prev => [...prev, `AI_SUGGESTION: Use ${res.data.tool}`, `COMMAND: ${res.data.command}`, '--- PRESS ENTER TO EXECUTE ---']);
        setInput(res.data.command);
      } catch (err) {
        setHistory(prev => [...prev, 'AI_ERROR: UNABLE TO MAP INTENT.']);
      }
      return;
    }

    try {
      const res = await axios.post('http://localhost:8000/api/terminal/execute', { command: cleanCmd });
      const output = res.data.stdout || res.data.stderr || 'Command executed.';
      setHistory(prev => [...prev, ...output.split('\n')]);
    } catch (err) {
      setHistory(prev => [...prev, 'ERROR: UPLINK_FAILURE_TO_CORE']);
    }
  };

  return (
    <div ref={scrollRef} style={{ backgroundColor: '#020617', color: '#10b981', padding: '20px', height: '100%', fontFamily: 'monospace', fontSize: '12px', overflowY: 'auto', border: '1px solid #1e293b', borderRadius: '8px' }}>
      {history.map((line, i) => (
        <div key={i} style={{ marginBottom: '4px', minHeight: '1em', whiteSpace: 'pre-wrap' }}>
          {line.includes(' > [') ? (
            <span onClick={() => setInput(line.split('] ')[1].split(' (')[0] + ' ')} style={{ cursor: 'pointer', textDecoration: 'underline' }}>{line}</span>
          ) : line}
        </div>
      ))}
      <div style={{ display: 'flex', marginTop: '10px' }}>
        <span style={{ marginRight: '10px', color: '#64748b' }}>operator@autonomous:~$</span>
        <input autoFocus value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { setHistory(prev => [...prev, `operator@autonomous:~$ ${input}`]); runCommand(input); setInput(''); } }} style={{ background: 'none', border: 'none', color: '#10b981', outline: 'none', flex: 1, fontFamily: 'monospace' }} />
      </div>
    </div>
  );
}
