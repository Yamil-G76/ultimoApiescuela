// src/router/PublicRoute.tsx
import { Navigate, Outlet } from "react-router-dom";

const PublicRoute: React.FC = () => {
  const token = localStorage.getItem("token");

  if (token) {
    // Podrías leer user/role de localStorage si querés redirigir distinto
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
};

export default PublicRoute;
