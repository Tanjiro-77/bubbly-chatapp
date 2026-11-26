import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { CallProvider } from "./context/CallContext";
import { BubblyDialogHost } from "./components/common/BubblyDialog";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <CallProvider>
          <App />
          <BubblyDialogHost />
        </CallProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
