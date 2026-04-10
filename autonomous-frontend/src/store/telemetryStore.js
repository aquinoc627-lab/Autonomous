import { create } from 'zustand';

export const useTelemetryStore = create((set) => ({
  linkStatus: 'INITIALIZING...',
  throughput: 0.0,
  anomalies: 0,
  activeNodes: 0,
  updateTelemetry: (data) => set((state) => ({ ...state, ...data })),
}));
