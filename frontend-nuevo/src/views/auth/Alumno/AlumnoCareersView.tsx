// src/views/auth/Alumno/AlumnoCareersView.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "../../../config/backend";
import "../../../styles/alumno-careers.css";

interface EnrollmentItem {
  id: number;               // id de usuarioxcarrera
  career_id: number;
  career_name: string;
  inicio_cursado?: string | null;
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

const AlumnoCareersView: React.FC = () => {
  const navigate = useNavigate();

  const [items, setItems] = useState<EnrollmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userIdStr = localStorage.getItem("user_id");

  const formatFecha = (value?: string | null) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString();
  };

  useEffect(() => {
    if (!userIdStr) {
      navigate("/login");
      return;
    }

    const loadEnrollments = async () => {
      setLoading(true);
      setError(null);

      try {
        const userId = parseInt(userIdStr, 10);
        const body = {
          user_id: userId,
          page: 1,
          page_size: 100, // más que suficiente para un alumno
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

        if (!data.success || !data.data) {
          throw new Error(data.message || "Error al obtener inscripciones");
        }

        setItems(data.data.items);
      } catch (err) {
        console.error(err);
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Error desconocido al cargar tus carreras");
        }
      } finally {
        setLoading(false);
      }
    };

    void loadEnrollments();
  }, [navigate, userIdStr]);

  const handleGoToPayments = (enrollment: EnrollmentItem) => {
    navigate("/alumno/payments", {
      state: {
        enrollmentId: enrollment.id,
        careerName: enrollment.career_name,
      },
    });
  };

  return (
    <div className="alumno-careers-page">
      {/* Header tipo card, consistente con el dashboard */}
      <header className="page-header page-header--alumno-careers">
        <div>
          <h2 className="page-header-title">Mis carreras</h2>
          <p className="page-header-subtitle">
            Consultá las carreras en las que estás inscripto y accedé a tus pagos.
          </p>
        </div>

        <button
          type="button"
          className="btn alumno-careers-back-btn"
          onClick={() => navigate("/alumno")}
        >
          Volver al dashboard
        </button>
      </header>

      {error && (
        <div className="alert-box alert-error alumno-careers-alert">
          {error}
        </div>
      )}

      {/* Card principal con tabla + scroll interno */}
      <section className="alumno-careers-section">
        <div className="alumno-careers-card">
          <div className="alumno-careers-card-header">
            <div>
              <h3 className="alumno-careers-card-title">Carreras activas</h3>
              <p className="alumno-careers-card-subtitle">
                Listado de inscripciones actuales. Desde acá podés ver los pagos de cada carrera.
              </p>
            </div>

            <span className="alumno-careers-pill">
              {items.length} {items.length === 1 ? "inscripción" : "inscripciones"}
            </span>
          </div>

          <div className="alumno-careers-table-wrapper">
            {loading ? (
              <div className="alumno-careers-message alumno-careers-message--muted">
                Cargando tus carreras...
              </div>
            ) : (
              <>
                <table className="alumno-careers-table">
                  <thead>
                    <tr>
                      <th style={{ width: "140px" }}>ID inscripción</th>
                      <th>Carrera</th>
                      <th style={{ width: "160px" }}>Inicio cursado</th>
                      <th style={{ width: "180px" }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((e) => (
                      <tr key={e.id}>
                        <td>{e.id}</td>
                        <td>{e.career_name}</td>
                        <td>{formatFecha(e.inicio_cursado || null)}</td>
                        <td>
                          <div className="alumno-careers-actions">
                            <button
                              className="btn alumno-careers-btn-payments"
                              type="button"
                              onClick={() => handleGoToPayments(e)}
                            >
                              Ver pagos
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {items.length === 0 && (
                      <tr>
                        <td colSpan={4}>
                          <div className="alumno-careers-message alumno-careers-message--muted">
                            Todavía no tenés carreras asignadas.
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default AlumnoCareersView;