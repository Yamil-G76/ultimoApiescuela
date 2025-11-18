import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "../../../config/backend";
import "../../../styles/users.css";

const UserCreateView: React.FC = () => {
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dni, setDni] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState<"admin" | "alumno">("alumno");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const navigate = useNavigate();

  const validate = (): boolean => {
    const newErrors: string[] = [];

    if (!username.trim()) newErrors.push("El usuario es obligatorio");
    if (!firstName.trim()) newErrors.push("El nombre es obligatorio");
    if (!lastName.trim()) newErrors.push("El apellido es obligatorio");

    if (!dni.trim()) {
      newErrors.push("El DNI es obligatorio");
    } else if (!/^\d+$/.test(dni.trim())) {
      newErrors.push("El DNI debe ser numérico");
    } else if (dni.trim().length < 7 || dni.trim().length > 9) {
      newErrors.push("El DNI debe tener entre 7 y 9 dígitos");
    }

    if (!email.trim()) {
      newErrors.push("El email es obligatorio");
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      newErrors.push("El email no tiene un formato válido");
    }

    if (!password.trim()) {
      newErrors.push("La contraseña es obligatoria");
    } else if (password.length < 6) {
      newErrors.push("La contraseña debe tener al menos 6 caracteres");
    }

    if (!["admin", "alumno"].includes(type)) {
      newErrors.push("El rol debe ser 'admin' o 'alumno'");
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      const res = await fetch(`${BASE_URL}/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
          first_name: firstName,
          last_name: lastName,
          dni,
          email,
          type,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error("Error creando usuario:", errData);
        if ((errData as { detail?: unknown }).detail) {
          setErrors([String((errData as { detail?: unknown }).detail)]);
        } else {
          setErrors(["No se pudo crear el usuario"]);
        }
        return;
      }

      alert("Usuario creado correctamente");
      navigate("/admin/users");
    } catch (err) {
      console.error(err);
      setErrors(["Error creando usuario"]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="user-page">
      {/* Header tipo card */}
      <header className="page-header">
        <div>
          <h2 className="page-header-title">Nuevo alumno </h2>
          <p className="page-header-subtitle">
            Registrá un nuevo alumno  con sus datos de acceso.
          </p>
        </div>
      </header>

      {/* Errores */}
      {errors.length > 0 && (
        <div className="alert-box alert-error">
          <ul className="alert-list">
            {errors.map((e, idx) => (
              <li key={idx}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Card de formulario */}
      <div className="user-form-card">
        <div className="user-form-card-header">
          <span className="user-form-chip">Datos de la cuenta</span>
          <span className="user-form-caption">
            Completá usuario, contraseña, rol y datos personales.
          </span>
        </div>

        <div className="user-form-grid">
          {/* Columna izquierda: acceso */}
          <div className="user-form-column">
            {/* Usuario */}
            <div className="user-form-field">
              <label className="user-form-label">Usuario</label>
              <input
                className="user-form-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ej: alumno1"
              />
            </div>

            {/* Contraseña */}
            <div className="user-form-field">
              <label className="user-form-label">Contraseña</label>
              <input
                type="password"
                className="user-form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
              <span className="user-form-hint">Mínimo 6 caracteres.</span>
            </div>

            {/* Rol */}
            <div className="user-form-field">
              <label className="user-form-label">Rol</label>
              <select
                className="user-form-input user-form-select"
                value={type}
                onChange={(e) => setType(e.target.value as "admin" | "alumno")}
              >
                <option value="alumno">Alumno</option>
  
              </select>
            </div>
          </div>

          {/* Columna derecha: datos personales */}
          <div className="user-form-column">
            {/* Nombre */}
            <div className="user-form-field">
              <label className="user-form-label">Nombre</label>
              <input
                className="user-form-input"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Nombre"
              />
            </div>

            {/* Apellido */}
            <div className="user-form-field">
              <label className="user-form-label">Apellido</label>
              <input
                className="user-form-input"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Apellido"
              />
            </div>

            {/* DNI */}
            <div className="user-form-field">
              <label className="user-form-label">DNI</label>
              <input
                className="user-form-input"
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                placeholder="Solo números"
              />
            </div>

            {/* Email */}
            <div className="user-form-field">
              <label className="user-form-label">Email</label>
              <input
                type="email"
                className="user-form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@correo.com"
              />
            </div>
          </div>
        </div>

        <div className="user-form-actions">
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={saving}
            type="button"
          >
            {saving ? "Guardando..." : "Guardar usuario"}
          </button>

          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => navigate("/admin/users")}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserCreateView;