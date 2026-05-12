import React, { createContext, useContext, useState, useCallback } from "react";
import { User } from "../types";
import api from "../services/api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  googleLogin: (credential: string) => Promise<void>;
  logout: () => void;
}

interface SignupData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));

  const _persist = (accessToken: string, userData: User) => {
    if (!accessToken || typeof accessToken !== "string" || accessToken.trim() === "") {
      throw new Error("Invalid token received from server");
    }
    localStorage.setItem("token", accessToken);
    localStorage.setItem("user", JSON.stringify(userData));
    setToken(accessToken);
    setUser(userData);
  };

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post("/auth/login", { email, password });
    _persist(data.access_token, data.user);
  }, []);

  const signup = useCallback(async (formData: SignupData) => {
    const { data } = await api.post("/auth/signup", formData);
    _persist(data.access_token, data.user);
  }, []);

  const googleLogin = useCallback(async (credential: string) => {
    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    if (!clientId) throw new Error("Google OAuth client ID is not configured");
    const { data } = await api.post("/auth/google", { credential });
    if (!data.access_token) throw new Error("Google login failed: no token returned");
    _persist(data.access_token, data.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, signup, googleLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
