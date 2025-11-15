// src/layout/MainLayout.tsx
import React, { Suspense } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../Layout/Navbar";

const MainLayout: React.FC = () => {
  return (
    <div className="d-flex" style={{ minHeight: "100vh" }}>
      <Navbar />
      <div className="flex-grow-1 d-flex flex-column">
        {/* Podrías tener un topbar si querés, de momento solo contenido */}
        <main className="p-3" style={{ backgroundColor: "#f5f7fb" }}>
          <Suspense fallback={"Cargando..."}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
