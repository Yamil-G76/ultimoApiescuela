// src/components/layout/Navbar.tsx
import React from "react";
import { NavLink, useNavigate } from "react-router-dom";

type UserType = "admin" | "alumno";

const Navbar: React.FC = () => {
  const navigate = useNavigate();

  // Detectar rol desde localStorage
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

  const isAdmin = userType === "admin";
  const basePath = isAdmin ? "/admin" : "/alumno";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("user_id");
    localStorage.removeItem("user_type");
    navigate("/login");
  };

  return (
    <aside
      className="d-flex flex-column justify-content-between"
      style={{
        width: "260px",
        background: "linear-gradient(180deg, #0d6efd 0%, #0dcaf0 100%)",
        color: "#fff",
      }}
    >
      <div>
        <div className="p-3 border-bottom border-light">
          <h5 className="mb-0">ApiEscuela</h5>
          <small>
            {isAdmin ? "Panel administrador" : "Panel alumno"}
          </small>
        </div>

        <nav className="nav flex-column p-2">
          {/* DASHBOARD / HOME */}
          <NavLink
            to={basePath}
            className={({ isActive }) =>
              `nav-link text-white ${isActive ? "fw-bold" : ""}`
            }
            end
          >
            {isAdmin ? "Dashboard" : "Inicio"}
          </NavLink>

          {isAdmin ? (
            <>
              {/* MENU ADMIN */}
              <NavLink
                to="/admin/users"
                className={({ isActive }) =>
                  `nav-link text-white ${isActive ? "fw-bold" : ""}`
                }
              >
                Alumnos / Usuarios
              </NavLink>

              <NavLink
                to="/admin/careers"
                className={({ isActive }) =>
                  `nav-link text-white ${isActive ? "fw-bold" : ""}`
                }
              >
                Carreras
              </NavLink>

              <NavLink
                to="/admin/payments"
                className={({ isActive }) =>
                  `nav-link text-white ${isActive ? "fw-bold" : ""}`
                }
              >
                Pagos
              </NavLink>

              <NavLink
                to="/admin/news"
                className={({ isActive }) =>
                  `nav-link text-white ${isActive ? "fw-bold" : ""}`
                }
              >
                Noticias
              </NavLink>
            </>
          ) : (
            <>
              {/* MENU ALUMNO */}
              <NavLink
                to="/alumno/profile"
                className={({ isActive }) =>
                  `nav-link text-white ${isActive ? "fw-bold" : ""}`
                }
              >
                Mi perfil
              </NavLink>

              <NavLink
                to="/alumno/careers"
                className={({ isActive }) =>
                  `nav-link text-white ${isActive ? "fw-bold" : ""}`
                }
              >
                Mis carreras
              </NavLink>

              <NavLink
                to="/alumno/payments"
                className={({ isActive }) =>
                  `nav-link text-white ${isActive ? "fw-bold" : ""}`
                }
              >
                Mis pagos
              </NavLink>

              <NavLink
                to="/alumno/news"
                className={({ isActive }) =>
                  `nav-link text-white ${isActive ? "fw-bold" : ""}`
                }
              >
                Noticias
              </NavLink>
            </>
          )}
        </nav>
      </div>

      <div className="p-3 border-top border-light">
        <button
          className="btn btn-outline-light btn-sm w-100"
          onClick={handleLogout}
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
};

export default Navbar;
