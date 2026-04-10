import { create } from 'zustand';
interface TelemetryState {
  linkStatus: string;
  throughput: number;
  anomalies: number;
  activeNodes: number;
  updateTelemetry: (data: Partial<TelemetryState>) => void;
}
export const useTelemetryStore = create<TelemetryState>((set) => ({
  linkStatus: 'INITIALIZING...',
  throughput: 0.0,
  anomalies: 0,
  activeNodes: 0,
  updateTelemetry: (data) => set((state) => ({ ...state, ...data })),
}));
