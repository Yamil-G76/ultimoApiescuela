// src/router/PublicRoute.tsx
import { Navigate, Outlet } from "react-router-dom";

type UserType = "admin" | "alumno";

const PublicRoute: React.FC = () => {
  const token = localStorage.getItem("token");

  if (token) {
    // Detectar tipo de usuario
    let userType: UserType = "alumno";

    const storedType = localStorage.getItem("user_type");
    if (storedType === "admin" || storedType === "alumno") {
      userType = storedType;
    } else {
      const rawUser = localStorage.getItem("user");
      if (rawUser) {
        try {
          const parsed = JSON.parse(rawUser) as { type?: string };
          if (parsed.type === "admin" || parsed.type === "alumno") {
            userType = parsed.type;
          }
        } catch (e) {
          console.error("Error parseando user desde localStorage:", e);
        }
      }
    }

    const target = userType === "admin" ? "/admin" : "/alumno";
    return <Navigate to={target} replace />;
  }

  return <Outlet />;
};

export default PublicRoute;
