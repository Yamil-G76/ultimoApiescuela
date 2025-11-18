// src/Layout/Navbar.tsx
import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  FiHome,
  FiBookOpen,
  FiCreditCard,
  FiBell,
  FiUsers,
  FiLogOut,
  FiMenu,
} from "react-icons/fi";

type UserType = "admin" | "alumno";

type MenuItem = {
  to: string;
  label: string;
  icon: React.ReactNode;
  exact?: boolean;
  isSub?: boolean;
};

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  // ====== LÓGICA DE ROL =======================================
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

  const rawUser = localStorage.getItem("user");
  let userName = "Usuario";
  if (rawUser) {
    try {
      const parsed = JSON.parse(rawUser) as {
        username?: string;
        first_name?: string;
        last_name?: string;
      };
      const nombre =
        [parsed.first_name, parsed.last_name].filter(Boolean).join(" ") ||
        parsed.username;
      if (nombre) userName = nombre;
    } catch {
      // ignore
    }
  }

  const userInitials = userName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("user_id");
    localStorage.removeItem("user_type");
    navigate("/login");
  };

  const handleGoToProfile = () => {
    if (isAdmin) {
      navigate("/admin/profile");
    } else {
      navigate("/alumno/profile");
    }
  };

  // ====== MENÚS ======================================================
  const adminMenu: MenuItem[] = [
    {
      to: basePath,
      label: "Inicio",
      icon: <FiHome />,
      exact: true,
    },
    {
      to: "/admin/careers",
      label: "Carreras",
      icon: <FiBookOpen />,
    },
    {
      to: "/admin/payments",
      label: "Pagos",
      icon: <FiCreditCard />,
    },
    {
      to: "/admin/news",
      label: "Noticias",
      icon: <FiBell />,
    },
    {
      to: "/admin/users",
      label: "Usuarios",
      icon: <FiUsers />,
    },
    // 👇 Mi perfil ya NO va en el menú, se maneja desde el footer
  ];

  const alumnoMenu: MenuItem[] = [
    {
      to: basePath,
      label: "Inicio",
      icon: <FiHome />,
      exact: true,
    },
    // "Mi perfil" va en el footer
    {
      to: "/alumno/careers",
      label: "Mis carreras",
      icon: <FiBookOpen />,
    },
    {
      to: "/alumno/payments",
      label: "Mis pagos",
      icon: <FiCreditCard />,
    },
    {
      to: "/alumno/news",
      label: "Noticias",
      icon: <FiBell />,
    },
  ];

  const menuItems = isAdmin ? adminMenu : alumnoMenu;

  // ====== RENDER =====================================================
  return (
    <aside className={`sidebar ${collapsed ? "sidebar--collapsed" : ""}`}>
      <div className="sidebar-top">
        <button
          type="button"
          className="sidebar-toggle"
          onClick={() => setCollapsed((prev) => !prev)}
          aria-label="Alternar menú"
        >
          <FiMenu />
        </button>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) =>
                `sidebar-item ${item.isSub ? "sidebar-item--sub" : ""} ${
                  isActive ? "sidebar-item--active" : ""
                }`
              }
              data-label={item.label}
            >
              <div className="sidebar-item-icon">{item.icon}</div>
              {!collapsed && (
                <span className="sidebar-item-label">{item.label}</span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* FOOTER: perfil + cerrar sesión */}
      <div className="sidebar-footer">
        <button
          type="button"
          className="sidebar-item sidebar-item--profile"
          data-label={userName}
          onClick={handleGoToProfile}
        >
          <div className="sidebar-item-icon sidebar-item-icon--avatar">
            <span>{userInitials}</span>
          </div>
          {!collapsed && (
            <div className="sidebar-profile-text">
              <div className="sidebar-profile-name">{userName}</div>
              <div className="sidebar-profile-role">
                {isAdmin ? "Administrador" : "Alumno"}
              </div>
            </div>
          )}
        </button>

        <button
          type="button"
          className="sidebar-item sidebar-item--logout"
          onClick={handleLogout}
          data-label="Cerrar sesión"
        >
          <div className="sidebar-item-icon">
            <FiLogOut />
          </div>
          {!collapsed && (
            <span className="sidebar-item-label">Cerrar sesión</span>
          )}
        </button>
      </div>
    </aside>
  );
};

export default Navbar;