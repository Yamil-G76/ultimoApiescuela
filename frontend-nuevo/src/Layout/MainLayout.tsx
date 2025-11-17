import React, { Suspense } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../Layout/Navbar";

const MainLayout: React.FC = () => {
  // Podés leer el usuario desde localStorage si querés personalizar el título
  const rawUser = localStorage.getItem("user");
  let userName: string | null = null;
  if (rawUser) {
    try {
      const parsed = JSON.parse(rawUser) as { username?: string };
      userName = parsed.username ?? null;
    } catch {
      userName = null;
    }
  }

  return (
    <div className="app-layout">
      <Navbar />

      <div className="app-content">
        <header className="app-topbar">
          <div>
            <h1 className="topbar-title">ApiEscuela</h1>
            <p className="topbar-subtitle">
              {userName
                ? `Panel de ${userName}`
                : "Resumen general del estado de ApiEscuela."}
            </p>
          </div>
          {/* Aquí podrías agregar un avatar o botón si más adelante querés */}
        </header>

        <main className="app-main">
          <Suspense fallback={"Cargando..."}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
