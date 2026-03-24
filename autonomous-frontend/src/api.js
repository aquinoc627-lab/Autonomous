/**
 * Autonomous — API Client
 *
 * Centralised Axios instance with JWT interceptors for automatic
 * token attachment and 401 handling.
 */

import axios from "axios";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// ── Request interceptor: attach access token ──────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: handle 401 ──────────────────────────────
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      // Try refresh
      const refresh = localStorage.getItem("refresh_token");
      if (refresh && !err.config._retry) {
        err.config._retry = true;
        try {
          const { data } = await axios.post(`${API_BASE}/api/auth/refresh`, {
            refresh_token: refresh,
          });
          localStorage.setItem("access_token", data.access_token);
          localStorage.setItem("refresh_token", data.refresh_token);
          err.config.headers.Authorization = `Bearer ${data.access_token}`;
          return api(err.config);
        } catch {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          window.location.href = "/login";
        }
      } else {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────────
export const authAPI = {
  login: (username, password) =>
    api.post("/api/auth/login", { username, password }),
  me: () => api.get("/api/auth/me"),
  logout: (refreshToken) =>
    api.post("/api/auth/logout", { refresh_token: refreshToken }),
};

// ── Agents ────────────────────────────────────────────────────────
export const agentsAPI = {
  list: (params) => api.get("/api/agents", { params }),
  get: (id) => api.get(`/api/agents/${id}`),
  create: (data) => api.post("/api/agents", data),
  update: (id, data) => api.patch(`/api/agents/${id}`, data),
  delete: (id) => api.delete(`/api/agents/${id}`),
  missions: (id) => api.get(`/api/agents/${id}/missions`),
};

// ── Missions ──────────────────────────────────────────────────────
export const missionsAPI = {
  list: (params) => api.get("/api/missions", { params }),
  get: (id) => api.get(`/api/missions/${id}`),
  create: (data) => api.post("/api/missions", data),
  update: (id, data) => api.patch(`/api/missions/${id}`, data),
  delete: (id) => api.delete(`/api/missions/${id}`),
  agents: (id) => api.get(`/api/missions/${id}/agents`),
  assign: (missionId, agentId) =>
    api.post(`/api/missions/${missionId}/assign`, {
      agent_id: agentId,
      mission_id: missionId,
    }),
  revoke: (missionId, agentId) =>
    api.delete(`/api/missions/${missionId}/assign/${agentId}`),
};

// ── Banter ────────────────────────────────────────────────────────
export const banterAPI = {
  list: (params) => api.get("/api/banter", { params }),
  create: (data) => api.post("/api/banter", data),
  delete: (id) => api.delete(`/api/banter/${id}`),
};

// ── Analytics ─────────────────────────────────────────────────────
export const analyticsAPI = {
  overview: () => api.get("/api/analytics/overview"),
  activity: () => api.get("/api/analytics/activity"),
  health: () => api.get("/api/analytics/health"),
  presence: () => api.get("/api/analytics/presence"),
  audit: (params) => api.get("/api/analytics/audit", { params }),
};

// ── Autonomous Mode ───────────────────────────────────────────────
export const autonomousAPI = {
  getStatus: () => api.get("/api/autonomous"),
  toggle: (enabled) => api.post(`/api/autonomous?enabled=${enabled}`),
};

// ── Tool Arsenal ─────────────────────────────────────────────────
export const toolsAPI = {
  list: (params) => api.get("/api/tools", { params }),
  categories: () => api.get("/api/tools/categories"),
  stats: () => api.get("/api/tools/stats"),
  get: (id) => api.get(`/api/tools/${id}`),
  byOS: (os) => api.get(`/api/tools/os/${os}`),
  search: (query) => api.post("/api/tools/search", { query }),
  generate: (toolId, targetOs, params) =>
    api.post("/api/tools/generate", {
      tool_id: toolId,
      target_os: targetOs,
      params,
    }),
  confirm: (toolId, targetOs, params) =>
    api.post("/api/tools/confirm", {
      tool_id: toolId,
      target_os: targetOs,
      params,
      confirmation_code: "CONFIRM",
    }),
};

// ── Playbooks ────────────────────────────────────────────────────
export const playbooksAPI = {
  list: (params) => api.get("/api/playbooks", { params }),
  categories: () => api.get("/api/playbooks/categories"),
  stats: () => api.get("/api/playbooks/stats"),
  get: (id) => api.get(`/api/playbooks/${id}`),
  execute: (data) => api.post("/api/playbooks/execute", data),
  executions: () => api.get("/api/playbooks/executions/list"),
  getExecution: (id) => api.get(`/api/playbooks/executions/${id}`),
  stepAction: (execId, action) =>
    api.post(`/api/playbooks/executions/${execId}/step`, { action }),
};

// ── OSINT ─────────────────────────────────────────────────────────
export const osintAPI = {
  sherlock: (username) => api.get(`/api/osint/sherlock/${encodeURIComponent(username)}`),
};

// ── Ghost Protocol ───────────────────────────────────────────
export const ghostAPI = {
  status: () => api.get("/api/ghost/status"),
  toggle: (enable) => api.post(`/api/ghost/toggle?enable=${enable}`),
};

export default api;
