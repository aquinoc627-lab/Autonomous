import React from 'react';
import { Link } from 'wouter';
import { useAuthStore } from '../store/authStore';
export default function DashboardView() {
  const { operatorId, terminateSession } = useAuthStore();
  return (
    <div className="min-h-screen bg-slate-950 p-10 text-white font-sans">
      <div className="max-w-[1600px] mx-auto flex justify-between items-center border-b border-slate-800 pb-6 mb-10">
        <h1 className="text-xl font-bold text-emerald-500">theCORE OPS</h1>
        <div className="flex items-center gap-6">
          <Link href="/xr-space" className="text-indigo-400 hover:underline">Launch XR</Link>
          <span className="font-mono text-slate-400">{operatorId}</span>
          <button onClick={terminateSession} className="text-red-400 border border-red-900/30 px-3 py-1 rounded hover:bg-red-900/20">LOGOUT</button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl text-center"><p className="text-slate-500 text-sm">ENCRYPTION</p><p className="text-2xl font-mono text-emerald-400 tracking-tighter">SECURE (AES-256)</p></div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl text-center"><p className="text-slate-500 text-sm">THROUGHPUT</p><p className="text-2xl font-mono">4.2 TB/s</p></div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl text-center"><p className="text-slate-500 text-sm">ANOMALIES</p><p className="text-2xl font-mono text-white">0</p></div>
      </div>
    </div>
  );
}
