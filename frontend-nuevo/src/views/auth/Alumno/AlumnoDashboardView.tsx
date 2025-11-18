// src/views/auth/Alumno/AlumnoHomeView.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "../../../config/backend";
import "../../../styles/alumno-home.css";

interface EnrollmentItem {
  id: number;
}

interface EnrollmentsData {
  items: EnrollmentItem[];
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
}

interface EnrollmentsResponse {
  success?: boolean;
  message?: string;
  data?: EnrollmentsData;
}

interface UserData {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
}

const AlumnoDashboardView: React.FC = () => {
  const navigate = useNavigate();

  const [user, setUser] = useState<UserData | null>(null);
  const [careersCount, setCareersCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const userIdStr = localStorage.getItem("user_id");

  useEffect(() => {
    if (!userIdStr) {
      navigate("/login");
      return;
    }

    const userStored = localStorage.getItem("user");
    if (userStored) {
      try {
        const u = JSON.parse(userStored) as UserData;
        setUser(u);
      } catch (e) {
        console.error("Error parseando user localStorage", e);
      }
    }

    const loadData = async () => {
      try {
        const userId = parseInt(userIdStr, 10);

        const body = {
          user_id: userId,
          page: 1,
          page_size: 1,
        };

        const res = await fetch(`${BASE_URL}/enrollments/by-user`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          throw new Error(`Error HTTP: ${res.status}`);
        }

        const data = (await res.json()) as EnrollmentsResponse;
        if (data.success && data.data) {
          setCareersCount(data.data.total_items);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [navigate, userIdStr]);

  const getNombreMostrable = () => {
    if (!user) return "";
    const nombre = [user.first_name, user.last_name].filter(Boolean).join(" ");
    if (nombre) return nombre;
    return user.username;
  };

  const renderInscripcionesText = () => {
    if (careersCount === null)
      return "Tus inscripciones se cargarán en unos instantes.";
    if (careersCount === 0) return "Todavía no estás inscripto a ninguna carrera.";
    if (careersCount === 1) return "Tenés 1 carrera activa.";
    return `Tenés ${careersCount} carreras activas.`;
  };

  return (
    <div className="alumno-home-page">
      {/* Header tipo card, consistente con el admin */}
      <header className="page-header page-header--alumno-home">
        <div>
          <h2 className="page-header-title">Bienvenido/a</h2>
          <p className="page-header-subtitle">
            {user ? getNombreMostrable() : "Alumno"}
          </p>
        </div>

        <div className="alumno-home-header-pill">
          {loading ? "Cargando tu información..." : renderInscripcionesText()}
        </div>
      </header>

      {/* Contenido principal */}
      {loading ? (
        <div className="alumno-home-loading">Cargando tu información...</div>
      ) : (
        <section className="alumno-home-grid">
          {/* Card Mis carreras */}
          <article className="alumno-home-card alumno-home-card--careers">
            <div className="alumno-home-card-header">
              <h3 className="alumno-home-card-title">Mis carreras</h3>
              <span className="alumno-home-card-badge">Inscripciones</span>
            </div>

            <p className="alumno-home-card-number">{careersCount ?? 0}</p>
            <p className="alumno-home-card-text">
              Consultá el detalle de tus carreras, fechas de inicio y pagos asociados.
            </p>

            <div className="alumno-home-card-actions">
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => navigate("/alumno/careers")}
              >
                Ver mis carreras
              </button>
            </div>
          </article>

          {/* Card Mi perfil */}
          <article className="alumno-home-card alumno-home-card--profile">
            <div className="alumno-home-card-header">
              <h3 className="alumno-home-card-title">Mi perfil</h3>
              <span className="alumno-home-chip-soft">Datos personales</span>
            </div>

            <p className="alumno-home-card-text">
              Revisá y actualizá tus datos de contacto para mantenerte siempre informado.
            </p>

            <div className="alumno-home-card-actions">
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => navigate("/alumno/profile")}
              >
                Ver perfil
              </button>
            </div>
          </article>

          {/* Card Noticias */}
          <article className="alumno-home-card alumno-home-card--news">
            <div className="alumno-home-card-header">
              <h3 className="alumno-home-card-title">Noticias</h3>
              <span className="alumno-home-chip-soft alumno-home-chip-soft--news">
                Novedades
              </span>
            </div>

            <p className="alumno-home-card-text">
              Enterate de las últimas noticias y comunicados importantes de la institución.
            </p>

            <div className="alumno-home-card-actions">
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => navigate("/alumno/news")}
              >
                Ver noticias
              </button>
            </div>
          </article>
        </section>
      )}
    </div>
  );
};

export default AlumnoDashboardView;