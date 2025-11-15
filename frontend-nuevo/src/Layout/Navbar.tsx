// src/components/layout/Navbar.tsx
import React from "react";
import { NavLink, useNavigate } from "react-router-dom";

const Navbar: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    // si guardás user/role, también borrarlos
    localStorage.removeItem("user");
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
          <small>Panel administrador</small>
        </div>

        <nav className="nav flex-column p-2">
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
