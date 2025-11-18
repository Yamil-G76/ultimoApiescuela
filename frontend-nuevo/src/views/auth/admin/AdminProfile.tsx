import React, { useMemo } from "react";
import "../../../styles/profile.css";

interface StoredUser {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  dni?: string;
  type?: string;
}

const AdminProfileView: React.FC = () => {
  const rawUser = localStorage.getItem("user");

  let user: StoredUser | null = null;
  if (rawUser) {
    try {
      user = JSON.parse(rawUser) as StoredUser;
    } catch {
      user = null;
    }
  }

  const fullName = useMemo(() => {
    if (!user) return "";
    const name = [user.first_name, user.last_name].filter(Boolean).join(" ");
    return name || user.username || "";
  }, [user]);

  const initials = useMemo(() => {
    if (!fullName) return "AD";
    return fullName
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [fullName]);

  return (
    <div className="profile-page">
      {/* HEADER */}
      <header className="page-header page-header--profile">
        <div className="profile-header-main">
          <h2 className="page-header-title">Mi perfil</h2>
          <p className="page-header-subtitle">
            Información de tu cuenta de administrador en ApiEscuela.
          </p>
        </div>

        <div className="profile-header-avatar">
          <div className="profile-avatar-circle">
            <span>{initials}</span>
          </div>
          <div className="profile-avatar-text">
            <span className="profile-avatar-name">
              {fullName || "Administrador"}
            </span>
            <span className="profile-avatar-role">Administrador</span>
          </div>
        </div>
      </header>

      {/* GRID DE CARDS */}
      <section className="profile-grid">
        {/* DATOS PERSONALES */}
        <article className="profile-card profile-card--info">
          <div className="profile-card-header">
            <h3 className="profile-card-title">Datos personales</h3>
            <p className="profile-card-subtitle">
              Información básica que se muestra en el sistema.
            </p>
          </div>

          <div className="profile-card-body profile-fields-grid">
            <div className="profile-field">
              <span className="profile-field-label">Nombre y apellido</span>
              <span className="profile-field-value">
                {fullName || "-"}
              </span>
            </div>

            <div className="profile-field">
              <span className="profile-field-label">Usuario</span>
              <span className="profile-field-value">
                {user?.username || "-"}
              </span>
            </div>

            <div className="profile-field">
              <span className="profile-field-label">Email</span>
              <span className="profile-field-value">
                {user?.email || "-"}
              </span>
            </div>

            <div className="profile-field">
              <span className="profile-field-label">DNI</span>
              <span className="profile-field-value">
                {user?.dni || "-"}
              </span>
            </div>
          </div>
        </article>

        {/* CUENTA / SEGURIDAD */}
        <article className="profile-card profile-card--account">
          <div className="profile-card-header">
            <h3 className="profile-card-title">Cuenta y seguridad</h3>
            <p className="profile-card-subtitle">
              Resumen de tu acceso como administrador.
            </p>
          </div>

          <div className="profile-card-body">
            <div className="profile-field">
              <span className="profile-field-label">Rol</span>
              <span className="profile-field-pill">Administrador</span>
            </div>

            <div className="profile-field">
              <span className="profile-field-label">ID interno</span>
              <span className="profile-field-value">
                {user?.id ?? "-"}
              </span>
            </div>

            <div className="profile-actions-row">
              <button
                type="button"
                className="btn profile-btn-outline"
                disabled
              >
                Cambiar contraseña (próximamente)
              </button>
            </div>

            <p className="profile-footer-hint">
              Esta sección se podrá usar más adelante para actualizar tu
              contraseña u otros datos sensibles.
            </p>
          </div>
        </article>
      </section>
    </div>
  );
};

export default AdminProfileView;