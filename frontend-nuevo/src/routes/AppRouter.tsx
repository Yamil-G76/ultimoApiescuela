// src/router/AppRouter.tsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import PublicRoute from "./PublicRoute";
import ProtectedRoute from "./ProtectedRoute";
import MainLayout from "../Layout/MainLayout";

// Views
import LoginView from "../views/auth/LoginView";
import UsersListView from "../views/auth/admin/UsersListView";
// Más adelante: DashboardView, CareersListView, PaymentsListView, etc.

const AppRouter: React.FC = () => {
  return (
    <Routes>
      {/* Rutas públicas */}
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginView />} />
      </Route>

      {/* Rutas protegidas */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/admin">
            <Route index element={<div>Dashboard Admin (TODO)</div>} />
            <Route path="users" element={<UsersListView />} />
            <Route path="careers" element={<div>Listado de carreras (TODO)</div>} />
            <Route path="payments" element={<div>Listado de pagos (TODO)</div>} />
          </Route>

          <Route path="/alumno">
            <Route index element={<div>Home Alumno (TODO)</div>} />
          </Route>
        </Route>
      </Route>

      {/* Default */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default AppRouter;
