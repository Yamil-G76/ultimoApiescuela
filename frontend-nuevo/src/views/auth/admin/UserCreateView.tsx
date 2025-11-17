import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "../../../config/backend";

const UserCreateView = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dni, setDni] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState<"admin" | "alumno">("alumno");
  const [saving, setSaving] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async () => {
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
        alert(errData.detail || "No se pudo crear el usuario");
        return;
      }

      alert("Usuario creado correctamente");
      navigate("/admin/users");
    } catch (err) {
      console.error(err);
      alert("Error creando usuario");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mt-4">
      <h2>Nuevo usuario</h2>

      <div className="row">
        <div className="col-md-6">
          <div className="mb-3">
            <label className="form-label">Usuario</label>
            <input
              className="form-control"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Contraseña</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Rol</label>
            <select
              className="form-select"
              value={type}
              onChange={(e) => setType(e.target.value as "admin" | "alumno")}
            >
              <option value="alumno">Alumno</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>

        <div className="col-md-6">
          <div className="mb-3">
            <label className="form-label">Nombre</label>
            <input
              className="form-control"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Apellido</label>
            <input
              className="form-control"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>

          <div className="mb-3">
            <label className="form-label">DNI</label>
            <input
              className="form-control"
              value={dni}
              onChange={(e) => setDni(e.target.value)}
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>
      </div>

      <button
        className="btn btn-primary me-2"
        onClick={handleSubmit}
        disabled={saving}
      >
        {saving ? "Guardando..." : "Guardar"}
      </button>

      <button
        className="btn btn-secondary"
        onClick={() => navigate("/admin/users")}
      >
        Cancelar
      </button>
    </div>
  );
};

export default UserCreateView;
