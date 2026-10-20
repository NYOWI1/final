/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useEffect, useState } from "react";
const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");
export const UserContext = createContext(null);
export function UserProvider({ children }) {
  const [token, setToken] = useState(() => sessionStorage.getItem("course-token"));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const clear = useCallback(() => { sessionStorage.removeItem("course-token"); setToken(null); setUser(null); }, []);
  const api = useCallback(async (path, options = {}) => {
    let response;
    try {
      response = await fetch(`${API_URL}/api${path}`, { ...options, headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers,
      } });
    } catch { throw new Error("Cannot reach the API. Check that the backend is running and VITE_API_URL is correct."); }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401 && path !== "/auth/login") clear();
      throw new Error(data.message || `Request failed (${response.status})`);
    }
    return data;
  }, [token, clear]);
  useEffect(() => {
    let active = true;
    if (!token) { setLoading(false); return; }
    api("/user").then(data => { if (active) setUser(data.user); })
      .catch(() => { if (active) clear(); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, api, clear]);
  async function login(login, password) {
    const data = await api("/auth/login", { method: "POST", body: JSON.stringify({ login, password }) });
    sessionStorage.setItem("course-token", data.token);
    setToken(data.token); setUser(data.user);
  }
  async function logout() { try { await api("/auth/logout", { method: "POST" }); } finally { clear(); } }
  return <UserContext.Provider value={{ user, loading, login, logout, api }}>{children}</UserContext.Provider>;
}
