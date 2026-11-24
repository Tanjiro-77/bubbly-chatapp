import React, { createContext, useContext, useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import { UserProps, DecodedTokenProps } from "../types";
import { login as apiLogin, register as apiRegister } from "../services/authService";
import { connectSocket, disconnectSocket } from "../socket/socket";
import { updateProfile as emitUpdateProfile } from "../socket/socketEvents";

interface AuthContextType {
  user: UserProps | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, avatar?: string | null) => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<UserProps>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProps | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem("bubbly_token");
    if (savedToken) {
      try {
        const decoded = jwtDecode<DecodedTokenProps>(savedToken);
        if (decoded.exp && decoded.exp * 1000 < Date.now()) {
          console.warn("Token expired");
          localStorage.removeItem("bubbly_token");
          setIsLoading(false);
          return;
        }
        setToken(savedToken);
        setUser(decoded.user);
        connectSocket().catch(console.error);
      } catch (e) {
        console.error("Invalid stored token:", e);
        localStorage.removeItem("bubbly_token");
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await apiLogin(email, password);
    if (res.token) {
      localStorage.setItem("bubbly_token", res.token);
      setToken(res.token);
      const decoded = jwtDecode<DecodedTokenProps>(res.token);
      setUser(decoded.user);
      await connectSocket();
    }
  };

  const register = async (email: string, password: string, name: string, avatar?: string | null) => {
    const res = await apiRegister(email, password, name, avatar);
    if (res.token) {
      localStorage.setItem("bubbly_token", res.token);
      setToken(res.token);
      const decoded = jwtDecode<DecodedTokenProps>(res.token);
      setUser(decoded.user);
      await connectSocket();
    }
  };

  const logout = () => {
    localStorage.removeItem("bubbly_token");
    setToken(null);
    setUser(null);
    disconnectSocket();
  };

  const updateUser = (data: Partial<UserProps>) => {
    if (!user) return;
    const updated = { ...user, ...data };
    setUser(updated);
    emitUpdateProfile({ name: updated.name, avatar: updated.avatar });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
