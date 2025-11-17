import React from "react";
import { NavLink, useNavigate } from "react-router-dom";

const Navbar: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("user_id");
    localStorage.removeItem("user_type");
    navigate("/login");
  };

  // Detectar rol
  const rawUser = localStorage.getItem("user");
  let role: "admin" | "alumno" = "admin";

  if (rawUser) {
    try {
      const parsed = JSON.parse(rawUser);
      if (parsed.type === "alumno") {
        role = "alumno";
      }
    } catch (e) {
      console.error("[Navbar] Error parseando user:", e);
    }
  }

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
            {role === "admin" ? "Panel administrador" : "Panel alumno"}
          </small>
        </div>

        <nav className="nav flex-column p-2">
          {role === "admin" ? (
            <>
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `nav-link text-white ${isActive ? "fw-bold" : ""}`
                }
              >
                Dashboard
              </NavLink>
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

              {/* Noticias Admin */}
              <NavLink
                to="/admin/news"
                className={({ isActive }) =>
                  `nav-link text-white ${isActive ? "fw-bold" : ""}`
                }
              >
                Noticias
              </NavLink>
              <NavLink
                to="/admin/news/create"
                className={({ isActive }) =>
                  `nav-link text-white ${isActive ? "fw-bold" : ""}`
                }
              >
                Crear noticia
              </NavLink>
            </>
          ) : (
            <>
              <NavLink
                to="/alumno"
                className={({ isActive }) =>
                  `nav-link text-white ${isActive ? "fw-bold" : ""}`
                }
              >
                Inicio
              </NavLink>

              <NavLink
                to="/alumno/news"
                className={({ isActive }) =>
                  `nav-link text-white ${isActive ? "fw-bold" : ""}`
                }
              >
                Noticias
              </NavLink>

              {/* A futuro: Pagos del alumno, Mis carreras, etc. */}
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
