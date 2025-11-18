// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import AppRouter from "./routes/AppRouter";

// 🔹 Estilos globales de ApiEscuela (sin Bootstrap)
import "./styles/variables.css";
import "./styles/layout.css";
import "./styles/sidevar.css";
import "./styles/login.css";
import "./styles/dashboard.css";
import "./styles/careers.css";
import "./styles/career-prices.css";
import "./styles/news.css"
const rootElement = document.getElementById("root") as HTMLElement;

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  </React.StrictMode>
);
