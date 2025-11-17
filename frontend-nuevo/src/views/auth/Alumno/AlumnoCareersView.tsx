// src/views/auth/Alumno/AlumnoCareersView.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "../../../config/backend";

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
    <div className="container mt-4">
      <h2>Mis carreras</h2>

      {error && <div className="alert alert-danger py-2">{error}</div>}

      {loading ? (
        <div className="text-muted">Cargando tus carreras...</div>
      ) : (
        <div
          style={{
            height: "70vh",
            overflowY: "auto",
            border: "1px solid #dee2e6",
            borderRadius: "0.5rem",
            backgroundColor: "#ffffff",
            padding: "0.75rem",
          }}
        >
          <table className="table table-striped table-hover mb-0">
            <thead>
              <tr>
                <th>ID inscripción</th>
                <th>Carrera</th>
                <th>Inicio cursado</th>
                <th style={{ width: "160px" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((e) => (
                <tr key={e.id}>
                  <td>{e.id}</td>
                  <td>{e.career_name}</td>
                  <td>{formatFecha(e.inicio_cursado || null)}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => handleGoToPayments(e)}
                    >
                      Ver pagos
                    </button>
                  </td>
                </tr>
              ))}

              {items.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center">
                    Todavía no tenés carreras asignadas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AlumnoCareersView;
