import React from "react";
import ReactDOM from "react-dom/client";
import App from "./client/app/App";
import { ApiClientsProvider } from "./client/app/providers/ApiClientsProvider";
import { AuthProvider } from "./client/features/auth/AuthContext";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <ApiClientsProvider>
        <App />
      </ApiClientsProvider>
    </AuthProvider>
  </React.StrictMode>
);
