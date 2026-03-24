import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./AuthContext";
import { ToastProvider } from "./ToastContext";
import Layout from "./Layout";
import Login from "./Login";
import AutonomousView from "./AutonomousView";
import Missions from "./Missions";
import Agents from "./Agents";
import Banter from "./Banter";
import Analytics from "./Analytics";
import AgentLab from "./AgentLab";
import ToolArsenal from "./ToolArsenal";
import Playbooks from "./Playbooks";
import Terminal from "./Terminal";
import KnowledgeGraph from "./KnowledgeGraph";
import Osint from "./Osint";
import "./neonTheme.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "var(--neon-cyan)" }}>
        Loading...
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "var(--neon-cyan)" }}>
        Initializing Autonomous...
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AutonomousView />} />
        <Route path="missions" element={<Missions />} />
        <Route path="agents" element={<Agents />} />
        <Route path="lab" element={<AgentLab />} />
        <Route path="arsenal" element={<ToolArsenal />} />
        <Route path="playbooks" element={<Playbooks />} />
        <Route path="terminal" element={<Terminal />} />
        <Route path="knowledge" element={<KnowledgeGraph />} />
        <Route path="banter" element={<Banter />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="osint" element={<Osint />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
