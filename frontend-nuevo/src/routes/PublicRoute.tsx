import { Navigate, Outlet } from "react-router-dom";

const PublicRoute: React.FC = () => {
  const token = localStorage.getItem("token");

  if (token) {
    // Si ya está logueado, lo mandamos según su rol
    const rawUser = localStorage.getItem("user");
    let type: "admin" | "alumno" | undefined;

    if (rawUser) {
      try {
        const parsed = JSON.parse(rawUser);
        type = parsed.type;
      } catch (e) {
        console.error("[PublicRoute] Error parseando user:", e);
      }
    }

    if (type === "alumno") {
      return <Navigate to="/alumno" replace />;
    }

    // Por defecto, admin
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
};

export default PublicRoute;
