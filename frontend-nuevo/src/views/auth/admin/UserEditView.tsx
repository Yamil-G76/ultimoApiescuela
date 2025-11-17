import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BASE_URL } from "../../../config/backend";

interface UserData {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  dni?: string;
  email?: string;
  type: string;
}

const UserEditView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [user, setUser] = useState<UserData | null>(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState(""); // opcional
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dni, setDni] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState<"admin" | "alumno">("alumno");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await fetch(`${BASE_URL}/users/${id}`);
        if (!res.ok) {
          console.error("Error obteniendo usuario");
          setLoading(false);
          return;
        }

        const data = await res.json();
        const u: UserData = data.data;

        setUser(u);
        setUsername(u.username);
        setFirstName(u.first_name || "");
        setLastName(u.last_name || "");
        setDni(u.dni || "");
        setEmail(u.email || "");
        setType((u.type as "admin" | "alumno") || "alumno");
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadUser();
    }
  }, [id]);

  const handleSubmit = async () => {
    if (!id) return;

    setSaving(true);
    try {
      const res = await fetch(`${BASE_URL}/users/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          // si mandamos string vacío, en el back podés tratarlo como "no cambiar"
          password: password || null,
          first_name: firstName,
          last_name: lastName,
          dni,
          email,
          type,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error("Error actualizando usuario:", errData);
        alert(errData.detail || "No se pudo actualizar el usuario");
        return;
      }

      alert("Usuario actualizado correctamente");
      navigate("/admin/users");
    } catch (err) {
      console.error(err);
      alert("Error actualizando el usuario");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="container mt-4">Cargando usuario...</div>;
  }

  if (!user) {
    return <div className="container mt-4">Usuario no encontrado</div>;
  }

  return (
    <div className="container mt-4">
      <h2>Editar usuario</h2>

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
            <label className="form-label">
              Contraseña (dejar vacío para no cambiar)
            </label>
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
        {saving ? "Guardando..." : "Guardar cambios"}
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

export default UserEditView;
