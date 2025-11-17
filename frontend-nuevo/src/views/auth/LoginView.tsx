// src/views/auth/LoginView.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

// Tipos
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

// Backend
const BACKEND_IP = "127.0.0.1";
const BACKEND_PORT = "8000";
const ENDPOINT = "/login";
const URL = `http://${BACKEND_IP}:${BACKEND_PORT}${ENDPOINT}`;

const LoginView: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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

      if (!res.ok) {
        setError(data.message || `Error HTTP ${res.status}`);
        return;
      }

      if (data.success === false) {
        setError(data.message || "Credenciales incorrectas");
        return;
      }

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

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(usuario));
      localStorage.setItem("user_id", String(usuario.id));
      localStorage.setItem("user_type", usuario.type);

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

  return (
    <div className="login-page">
      {/* blobs de fondo */}
      <div className="login-bg-blob login-bg-blob-1" />
      <div className="login-bg-blob login-bg-blob-2" />
      <div className="login-bg-blob login-bg-blob-3" />

      <div className="login-layout">
        {/* Columna izquierda */}
        <div className="login-left">
          <div className="login-left-content">
            <h1 className="login-welcome-title">BIENVENIDO</h1>
            <h2 className="login-welcome-subtitle">SISTEMA APIESCUELA</h2>
            <p className="login-subtitle-extra">
              Más de 60 años formando estudiantes comprometidos con su comunidad
              y preparados para el mundo del trabajo. Un espacio académico que
              combina tradición, innovación y excelencia educativa.
            </p>
          </div>
        </div>

        {/* Columna derecha */}
        <div className="login-right">
          <div className="login-card">
            <h3 className="login-brand">ApiEscuela</h3>
            <h4 className="login-heading">Iniciar sesión</h4>

            <form className="login-form" onSubmit={handleSubmit}>
              {/* Usuario */}
              <div className="login-field">
                <input
                  type="text"
                  className="login-input"
                  placeholder="Ingresa tu usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              {/* Password con ojo */}
              <div className="login-field">
                <div className="login-password-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="login-input login-password-input"
                    placeholder="Contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />

                  <button
                    type="button"
                    className="login-eye-btn"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? (
                      // Ojo tachado
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        fill="none"
                        strokeWidth="2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3 3l18 18"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M10.5 10.5a3 3 0 104.243 4.243"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9.88 5.1A10.05 10.05 0 0112 5c5.5 0 10 4.5 10 10"
                        />
                      </svg>
                    ) : (
                      // Ojo normal
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        fill="none"
                        strokeWidth="2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M1.5 12s4-7.5 10.5-7.5 10.5 7.5 10.5 7.5-4 7.5-10.5 7.5S1.5 12 1.5 12z"
                        />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {error && <div className="login-error">{error}</div>}

              {/* Recuérdame (solo visual) */}
              <div className="login-aux">
                <label className="login-remember">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Recuérdame</span>
                </label>
              </div>

              <button
                type="submit"
                className="login-submit"
                disabled={loading}
              >
                {loading ? "Ingresando..." : "Iniciar sesión"}
              </button>

              <button
                type="button"
                className="login-link-button login-forgot"
              >
                ¿Olvidaste tu contraseña?
              </button>

              <p className="login-footer-text">
                ¿No tienes una cuenta?{" "}
                <button type="button" className="login-link-button">
                  Inscribirse
                </button>
              </p>
            </form>
          </div>
        </div>
      </div>

      <footer className="login-page-footer">
        © 2025 ApiEscuela — Sistema de Gestión Académica
      </footer>
    </div>
  );
};

export default LoginView;
