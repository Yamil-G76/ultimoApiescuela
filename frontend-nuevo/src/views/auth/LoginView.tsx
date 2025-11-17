import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

// 1) Tipos
type LoginUser = {
  id: number;
  username: string;
  type: "admin" | "alumno";
};

type LoginResponse = {
  success?: boolean;
  message?: string;
  data?: {
    token?: string;
    usuario?: LoginUser;
    user?: LoginUser;
    access_token?: string;
  };
  token?: string;
  usuario?: LoginUser;
  user?: LoginUser;
  access_token?: string;
};

// 2) Constantes backend
const BACKEND_IP = "127.0.0.1";
const BACKEND_PORT = "8000";
const ENDPOINT = "/login";
const URL = `http://${BACKEND_IP}:${BACKEND_PORT}${ENDPOINT}`;

const LoginView: React.FC = () => {
  // 3) Hooks
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // 4) Funciones internas
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      console.log("[Login] Enviando a:", URL);

      const res = await fetch(URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      console.log("[Login] Status respuesta:", res.status);

      let data: LoginResponse;

      try {
        data = (await res.json()) as LoginResponse;
        console.log("[Login] JSON respuesta:", data);
      } catch (jsonError) {
        console.error("[Login] Error parseando JSON:", jsonError);
        setError("Respuesta inválida del servidor");
        return;
      }

      // Si el servidor responde con error HTTP
      if (!res.ok) {
        setError(data.message || `Error HTTP ${res.status}`);
        return;
      }

      // Si el backend no manda success, lo tratamos como error
      if (data.success === false) {
        setError(data.message || "Credenciales incorrectas");
        return;
      }

      // Intentar obtener token y usuario de distintas formas
      const token =
        data.data?.token ??
        data.data?.access_token ??
        data.token ??
        data.access_token;

      const usuario =
        data.data?.usuario ??
        data.data?.user ??
        data.usuario ??
        data.user;

      if (!token || !usuario) {
        console.error("[Login] Respuesta sin token o usuario válido:", data);
        setError("Respuesta inválida del servidor (falta token o usuario)");
        return;
      }

      if (!usuario.type) {
        console.error("[Login] Usuario sin 'type' en la respuesta:", usuario);
        setError("Respuesta inválida: el usuario no tiene rol (type)");
        return;
      }

      // 👉 Guardar token y usuario + id y type por separado
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(usuario));
      localStorage.setItem("user_id", String(usuario.id));
      localStorage.setItem("user_type", usuario.type);

      // Redirigir según el rol
      if (usuario.type === "admin") {
        navigate("/admin");
      } else {
        navigate("/alumno");
      }
    } catch (error) {
      console.error("[Login] Error de red u otro:", error);
      setError("Error conectando con el servidor");
    } finally {
      setLoading(false);
    }
  };

  // 5) JSX
  return (
    <div
      className="d-flex align-items-center justify-content-center"
      style={{ minHeight: "100vh", backgroundColor: "#e9f2ff" }}
    >
      <div
        className="card shadow-sm"
        style={{ width: "100%", maxWidth: "380px" }}
      >
        <div className="card-body">
          <h4 className="card-title mb-3 text-center">
            Ingreso a ApiEscuela
          </h4>
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Usuario</label>
              <input
                type="text"
                className="form-control"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Contraseña</label>
              <input
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && <div className="alert alert-danger py-2">{error}</div>}

            <button
              type="submit"
              className="btn btn-primary w-100"
              disabled={loading}
            >
              {loading ? "Ingresando..." : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
