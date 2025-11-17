// src/views/auth/Alumno/AlumnoHomeView.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "../../../config/backend";

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

const AlumnoHomeView: React.FC = () => {
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

  return (
    <div className="container mt-4">
      <h2>Bienvenido/a</h2>
      <p className="lead">
        {user ? getNombreMostrable() : "Alumno"}
      </p>

      {loading ? (
        <p>Cargando tu información...</p>
      ) : (
        <>
          <div className="row g-3">
            <div className="col-md-4">
              <div className="card shadow-sm">
                <div className="card-body">
                  <h5 className="card-title">Mis carreras</h5>
                  <p className="card-text display-6">
                    {careersCount ?? 0}
                  </p>
                  <button
                    className="btn btn-primary"
                    onClick={() => navigate("/alumno/careers")}
                  >
                    Ver carreras
                  </button>
                </div>
              </div>
            </div>

            <div className="col-md-4">
              <div className="card shadow-sm">
                <div className="card-body">
                  <h5 className="card-title">Mis datos</h5>
                  <p className="card-text">
                    Consultá tus datos personales.
                  </p>
                  <button
                    className="btn btn-outline-primary"
                    onClick={() => navigate("/alumno/profile")}
                  >
                    Ver perfil
                  </button>
                </div>
              </div>
            </div>

            <div className="col-md-4">
              <div className="card shadow-sm">
                <div className="card-body">
                  <h5 className="card-title">Noticias</h5>
                  <p className="card-text">
                    Novedades y comunicaciones de la institución.
                  </p>
                  <button
                    className="btn btn-outline-primary"
                    onClick={() => navigate("/alumno/news")}
                  >
                    Ver noticias
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AlumnoHomeView;
