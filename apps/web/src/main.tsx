import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { initI18n } from "./lib/i18n.js";
import { initTheme } from "./lib/theme.js";
import "./styles.css";

initI18n();
initTheme();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
