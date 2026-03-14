import React from "react";
import SwarmView from "./SwarmView.jsx";
import MissionTimeline from "./MissionTimeline.jsx";
import BanterPanel from "./BanterPanel.jsx";
import "./neonTheme.css";

function App() {
  return (
    <div className="App">
      <SwarmView />
      <MissionTimeline />
      <BanterPanel />
    </div>
  );
}
export default App;
