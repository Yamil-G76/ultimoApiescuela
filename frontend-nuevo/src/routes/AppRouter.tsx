// src/router/AppRouter.tsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import PublicRoute from "./PublicRoute";
import ProtectedRoute from "./ProtectedRoute";
import MainLayout from "../Layout/MainLayout";

// Views
import LoginView from "../views/auth/LoginView";

// Usuarios - Admin
import UsersListView from "../views/auth/admin/UsersListView";
import UserCreateView from "../views/auth/admin/UserCreateView";
import UserEditView from "../views/auth/admin/UserEditView";
import UserEnrollmentsView from "../views/auth/admin/UserEnrollmentsView";

// Carreras - Admin
import CareersListView from "../views/auth/admin/CareerListView";
import CareerCreateView from "../views/auth/admin/CareerCreateView";
import CareerEditView from "../views/auth/admin/CareerEditView";
import CareerPricesHistoryView from "../views/auth/admin/CareerHistoryPrice";

// Pagos - Admin
import PaymentsListView from "../views/auth/admin/PaymentListView";
import UserPaymentsView from "../views/auth/admin/UserPaymentsView";

// Noticias - Admin
import NewsCreateView from "../views/auth/admin/NewsCreateView";
import NewsListView from "../views/auth/admin/NewsListView";
import NewsEditView from "../views/auth/admin/NewsEditView";

// Noticias - Alumno
import NewsFeedView from "../views/auth/Alumno/NewsFedd";

// Alumno - vistas nuevas
import AlumnoDashboardView from "../views/auth/Alumno/AlumnoDashboardView";
import AlumnoProfileView from "../views/auth/Alumno/AlumnoProfileView";
import AlumnoCareersView from "../views/auth/Alumno/AlumnoCareersView";
import AlumnoPaymentsView from "../views/auth/Alumno/AlumnoPaymentsView";

// Dashboard Admin
import AdminDashboardView from "../views/auth/admin/AdminDashboardView";

// ✅ Perfil Admin
import AdminProfileView from "../views/auth/admin/AdminProfile";

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
            {/* Dashboard admin */}
            <Route index element={<AdminDashboardView />} />

            {/* Perfil admin */}
            <Route path="profile" element={<AdminProfileView />} />

            {/* Usuarios */}
            <Route path="users" element={<UsersListView />} />
            <Route path="users/create" element={<UserCreateView />} />
            <Route path="users/:id/edit" element={<UserEditView />} />
            <Route
              path="users/:id/enrollments"
              element={<UserEnrollmentsView />}
            />

            {/* Carreras */}
            <Route path="careers" element={<CareersListView />} />
            <Route path="careers/create" element={<CareerCreateView />} />
            <Route path="careers/:id/edit" element={<CareerEditView />} />
            <Route
              path="careers/:id/prices"
              element={<CareerPricesHistoryView />}
            />

            {/* Pagos */}
            <Route path="payments" element={<PaymentsListView />} />
            <Route
              path="users/:userId/enrollments/:enrollmentId/payments"
              element={<UserPaymentsView />}
            />

            {/* Noticias Admin */}
            <Route path="news" element={<NewsListView />} />
            <Route path="news/create" element={<NewsCreateView />} />
            <Route path="news/:id/edit" element={<NewsEditView />} />
          </Route>

          {/* ALUMNO */}
          <Route path="/alumno">
            <Route index element={<AlumnoDashboardView />} />
            <Route path="profile" element={<AlumnoProfileView />} />
            <Route path="careers" element={<AlumnoCareersView />} />
            <Route path="payments" element={<AlumnoPaymentsView />} />
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