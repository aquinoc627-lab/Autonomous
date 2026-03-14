import React, { useEffect, useState } from "react";

export default function BanterPanel() {
  const [banter, setBanter] = useState([]);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/banter")
      .then(r => r.json())
      .then(data => setBanter(Array.isArray(data.banter) ? data.banter : []));
  }, []);

  return (
    <div style={{ border: "2px solid #f0f", margin: 10, padding: 10 }}>
      <h2>Banter Panel</h2>
      <ul>
        {banter.map((b, i) => (
          <li key={i}>{b}</li>
        ))}
      </ul>
    </div>
  );
}
