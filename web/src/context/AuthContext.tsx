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

  useEffect(() => {
    if (!token) return;
    const handleProfileUpdated = (res: any) => {
      if (res?.success && res?.data?.token) {
        try {
          const decoded = jwtDecode<DecodedTokenProps>(res.data.token);
          localStorage.setItem("bubbly_token", res.data.token);
          setToken(res.data.token);
          setUser(decoded.user);
        } catch (err) {
          console.error("Invalid updated profile token:", err);
        }
      }
    };
    emitUpdateProfile(handleProfileUpdated);
    return () => {
      emitUpdateProfile(handleProfileUpdated, true);
    };
  }, [token]);

  const completeSession = async (resToken: string) => {
    localStorage.setItem("bubbly_token", resToken);
    const decoded = jwtDecode<DecodedTokenProps>(resToken);
    const socketPromise = connectSocket().catch((err) => console.warn("Socket connection deferred:", err));
    setToken(resToken);
    setUser(decoded.user);
    await socketPromise;
  };

  const login = async (email: string, password: string) => {
    const res = await apiLogin(email, password);
    if (res.token) {
      await completeSession(res.token);
    }
  };

  const register = async (email: string, password: string, name: string, avatar?: string | null) => {
    const res = await apiRegister(email, password, name, avatar);
    if (res.token) {
      await completeSession(res.token);
    }
  };

  const logout = () => {
    localStorage.removeItem("bubbly_token");
    localStorage.removeItem("bubbly_cache_conversations");
    localStorage.removeItem("bubbly_cache_stories");
    localStorage.removeItem("bubbly_cache_contacts");
    localStorage.removeItem("bubbly_locked_chats");
    setToken(null);
    setUser(null);
    disconnectSocket();
  };

  const updateUser = (data: Partial<UserProps>) => {
    if (!user) return;
    const updated = { ...user, ...data };
    setUser(updated);
    emitUpdateProfile({
      name: updated.name,
      avatar: updated.avatar ?? undefined,
    });
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
