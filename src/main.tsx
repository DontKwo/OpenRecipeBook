import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app/App";
import { applyThemeAndAccent } from "./styles/themeManager";
import "./styles/theme.css";

applyThemeAndAccent();

const rootElement = document.getElementById("root");
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
