// src/router/AppRouter.tsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import PublicRoute from "./PublicRoute";
import ProtectedRoute from "./ProtectedRoute";
import MainLayout from "../Layout/MainLayout";

// Views
import LoginView from "../views/auth/LoginView";
import UsersListView from "../views/auth/admin/UsersListView";

// Noticias - Admin
import NewsCreateView from "../views/auth/admin/NewsCreateView";
import NewsListView from "../views/auth/admin/NewsListView";
import NewsEditView from "../views/auth/admin/NewsEditView";

// Noticias - Alumno
import NewsFeedView from "../views/auth/Alumno/NewsFedd";

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
          {/* ADMIN */}
          <Route path="/admin">
            <Route index element={<div>Dashboard Admin (TODO)</div>} />
            <Route path="users" element={<UsersListView />} />
            <Route path="careers" element={<div>Listado de carreras (TODO)</div>} />
            <Route path="payments" element={<div>Listado de pagos (TODO)</div>} />

            {/* Noticias Admin */}
            <Route path="news" element={<NewsListView />} />
            <Route path="news/create" element={<NewsCreateView />} />
            <Route path="news/:id/edit" element={<NewsEditView />} />
          </Route>

          {/* ALUMNO */}
          <Route path="/alumno">
            <Route index element={<div>Home Alumno (TODO)</div>} />

            {/* Noticias Alumno */}
            <Route path="news" element={<NewsFeedView />} />
          </Route>
        </Route>
      </Route>

      {/* Default */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default AppRouter;
