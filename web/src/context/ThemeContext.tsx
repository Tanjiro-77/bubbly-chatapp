import React, { createContext, useContext, useState, useEffect } from "react";

type ThemeMode = "light" | "dark" | "bubbly";

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    return (localStorage.getItem("bubbly_theme") as ThemeMode) || "light";
  });

  const [soundEnabled, setSoundEnabledState] = useState<boolean>(() => {
    const s = localStorage.getItem("bubbly_sound_enabled");
    return s !== null ? s === "true" : true;
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark", "bubbly");
    if (theme === "dark") {
      root.classList.add("dark");
    } else if (theme === "bubbly") {
      root.classList.add("dark", "bubbly-mode");
    } else {
      root.classList.add("light");
    }
    localStorage.setItem("bubbly_theme", theme);
  }, [theme]);

  const setTheme = (t: ThemeMode) => setThemeState(t);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === "light" ? "dark" : "light"));
  };

  const setSoundEnabled = (enabled: boolean) => {
    setSoundEnabledState(enabled);
    localStorage.setItem("bubbly_sound_enabled", String(enabled));
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        soundEnabled,
        setSoundEnabled,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
};
