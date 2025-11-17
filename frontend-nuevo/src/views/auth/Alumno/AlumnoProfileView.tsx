// src/views/auth/Alumno/AlumnoProfileView.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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

const AlumnoProfileView: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userIdStr = localStorage.getItem("user_id");

  useEffect(() => {
    if (!userIdStr) {
      navigate("/login");
      return;
    }

    const loadUser = async () => {
      try {
        const userId = parseInt(userIdStr, 10);
        const res = await fetch(`${BASE_URL}/users/${userId}`);

        if (!res.ok) {
          throw new Error(`Error HTTP: ${res.status}`);
        }

        const data = await res.json();
        setUser(data.data as UserData);
      } catch (err) {
        console.error(err);
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Error desconocido al cargar usuario");
        }
      } finally {
        setLoading(false);
      }
    };

    void loadUser();
  }, [navigate, userIdStr]);

  if (loading) {
    return <div className="container mt-4">Cargando datos...</div>;
  }

  if (error || !user) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger">
          {error ?? "No se pudieron cargar tus datos"}
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <h2>Mi perfil</h2>

      <div className="row mt-3">
        <div className="col-md-6">
          <div className="mb-3">
            <label className="form-label">Usuario</label>
            <input
              className="form-control"
              value={user.username}
              disabled
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Nombre</label>
            <input
              className="form-control"
              value={user.first_name ?? ""}
              disabled
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Apellido</label>
            <input
              className="form-control"
              value={user.last_name ?? ""}
              disabled
            />
          </div>
        </div>

        <div className="col-md-6">
          <div className="mb-3">
            <label className="form-label">DNI</label>
            <input
              className="form-control"
              value={user.dni ?? ""}
              disabled
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Email</label>
            <input
              className="form-control"
              value={user.email ?? ""}
              disabled
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Rol</label>
            <input
              className="form-control"
              value={user.type}
              disabled
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlumnoProfileView;
