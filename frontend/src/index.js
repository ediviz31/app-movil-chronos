import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";
import { registerServiceWorker } from "@/utils/pushClient";

// Registrar el Service Worker para PWA + Web Push
// (no-op si el navegador no lo soporta)
registerServiceWorker();

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
