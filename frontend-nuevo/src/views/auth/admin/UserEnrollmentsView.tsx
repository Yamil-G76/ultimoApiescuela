// src/views/auth/admin/UserEnrollmentsView.tsx
import React, { useEffect, useState } from "react";
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

interface CareerOption {
  id: number;
  name: string;
}

interface EnrollmentItem {
  id: number;               // id de usuarioxcarrera
  career_id: number;
  career_name: string;
  inicio_cursado?: string | null;
}

interface PaginatedEnrollmentsData {
  items: EnrollmentItem[];
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
}

interface PaginatedEnrollmentsResponse {
  success?: boolean;
  message?: string;
  data?: PaginatedEnrollmentsData;
}

interface CareersPaginatedData {
  items: CareerOption[];
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
}

interface CareersPaginatedResponse {
  success?: boolean;
  message?: string;
  data?: CareersPaginatedData;
}

const UserEnrollmentsView: React.FC = () => {
  const { id } = useParams<{ id: string }>(); // id del usuario
  const navigate = useNavigate();

  const [user, setUser] = useState<UserData | null>(null);

  const [enrollments, setEnrollments] = useState<EnrollmentItem[]>([]);
  const [enrollLoading, setEnrollLoading] = useState(true);
  const [enrollError, setEnrollError] = useState<string | null>(null);

  const [careers, setCareers] = useState<CareerOption[]>([]);
  const [careersLoading, setCareersLoading] = useState(true);
  const [careersError, setCareersError] = useState<string | null>(null);

  const [selectedCareerId, setSelectedCareerId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const userIdNum = id ? parseInt(id, 10) : 0;

  // -------------------------------
  // Cargar datos de usuario
  // -------------------------------
  const loadUser = async () => {
    if (!userIdNum) return;

    try {
      const res = await fetch(`${BASE_URL}/users/${userIdNum}`);
      if (!res.ok) {
        console.error("Error obteniendo usuario");
        return;
      }

      const data = await res.json();
      const u: UserData = data.data;
      setUser(u);
    } catch (err) {
      console.error(err);
    }
  };

  // -------------------------------
  // Cargar inscripciones del usuario
  // -------------------------------
  const loadEnrollments = async () => {
    if (!userIdNum) return;

    setEnrollLoading(true);
    setEnrollError(null);

    try {
      const body = {
        user_id: userIdNum,
        page: 1,
        page_size: 50,
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

      const data = (await res.json()) as PaginatedEnrollmentsResponse;

      if (!data.success || !data.data) {
        throw new Error(data.message || "Error al obtener inscripciones");
      }

      setEnrollments(data.data.items);
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        setEnrollError(err.message);
      } else {
        setEnrollError("Error desconocido al cargar inscripciones");
      }
    } finally {
      setEnrollLoading(false);
    }
  };

  // -------------------------------
  // Cargar carreras disponibles
  // -------------------------------
  const loadCareers = async () => {
    setCareersLoading(true);
    setCareersError(null);

    try {
      const body = {
        page: 1,
        page_size: 100,
        search: null as string | null,
      };

      const res = await fetch(`${BASE_URL}/careers/paginated`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error(`Error HTTP: ${res.status}`);
      }

      const data = (await res.json()) as CareersPaginatedResponse;

      if (!data.success || !data.data) {
        throw new Error(data.message || "Error al obtener carreras");
      }

      setCareers(data.data.items);
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        setCareersError(err.message);
      } else {
        setCareersError("Error desconocido al cargar carreras");
      }
    } finally {
      setCareersLoading(false);
    }
  };

  // -------------------------------
  // useEffect inicial
  // -------------------------------
  useEffect(() => {
    void loadUser();
    void loadEnrollments();
    void loadCareers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // -------------------------------
  // Crear nueva inscripción
  // -------------------------------
  const handleAddEnrollment = async () => {
    if (!userIdNum) return;

    const careerIdNum = parseInt(selectedCareerId, 10);
    if (!careerIdNum) {
      alert("Seleccioná una carrera antes de asignar");
      return;
    }

    const yaInscripto = enrollments.some(
      (e) => e.career_id === careerIdNum
    );
    if (yaInscripto) {
      alert("Este alumno ya está inscripto en esa carrera");
      return;
    }

    setSaving(true);

    try {
      const body = {
        user_id: userIdNum,
        career_id: careerIdNum,
      };

      const res = await fetch(`${BASE_URL}/enrollments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error("Error creando inscripción:", errData);
        if ((errData as { detail?: unknown }).detail) {
          alert(String((errData as { detail?: unknown }).detail));
        } else {
          alert("No se pudo crear la inscripción");
        }
        return;
      }

      await loadEnrollments();
      alert("Carrera asignada correctamente");
    } catch (err) {
      console.error(err);
      alert("Error asignando carrera");
    } finally {
      setSaving(false);
    }
  };

  // -------------------------------
  // Eliminar inscripción
  // -------------------------------
  const handleDeleteEnrollment = async (enrollmentId: number) => {
    const ok = window.confirm("¿Seguro que querés quitar esta carrera al alumno?");
    if (!ok) return;

    try {
      const res = await fetch(`${BASE_URL}/enrollments/${enrollmentId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        console.error("Error eliminando inscripción");
        alert("No se pudo quitar la inscripción");
        return;
      }

      setEnrollments((prev) => prev.filter((e) => e.id !== enrollmentId));
    } catch (err) {
      console.error(err);
      alert("Error quitando la inscripción");
    }
  };

  const formatFecha = (value?: string | null) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString();
  };

  const handleBack = () => {
    navigate("/admin/users");
  };

  const handleViewPayments = (enrollmentId: number) => {
    if (!userIdNum) return;
    navigate(
      `/admin/users/${userIdNum}/enrollments/${enrollmentId}/payments`,
      {
        state: { from: "user-enrollments" },
      }
    );
  };

  return (
    <div className="container mt-4">
      {/* Encabezado */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h2 className="mb-0">Inscripciones del alumno</h2>
          {user && (
            <small className="text-muted">
              {user.username} — {user.first_name} {user.last_name}{" "}
              {user.dni ? `(${user.dni})` : ""}
            </small>
          )}
        </div>
        <button className="btn btn-secondary" onClick={handleBack}>
          Volver a usuarios
        </button>
      </div>

      {/* Selector de carrera + botón agregar */}
      <div className="card mb-3">
        <div className="card-body">
          <h5 className="card-title">Asignar nueva carrera</h5>

          {careersError && (
            <div className="alert alert-danger py-2 mb-2">
              {careersError}
            </div>
          )}

          <div className="row g-2 align-items-end">
            <div className="col-md-6">
              <label className="form-label">Carrera</label>
              <select
                className="form-select"
                value={selectedCareerId}
                onChange={(e) => setSelectedCareerId(e.target.value)}
                disabled={careersLoading}
              >
                <option value="">-- Seleccionar carrera --</option>
                {careers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-3">
              <button
                className="btn btn-primary w-100"
                onClick={handleAddEnrollment}
                disabled={saving || careersLoading}
              >
                {saving ? "Asignando..." : "Asignar carrera"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de inscripciones */}
      <div className="card">
        <div className="card-body">
          <h5 className="card-title">Carreras actuales</h5>

          {enrollError && (
            <div className="alert alert-danger py-2 mb-2">
              {enrollError}
            </div>
          )}

          {enrollLoading ? (
            <div className="text-muted">Cargando inscripciones...</div>
          ) : (
            <div
              style={{
                maxHeight: "60vh",
                overflowY: "auto",
              }}
            >
              <table className="table table-striped table-hover mb-0">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Carrera</th>
                    <th>Inicio cursado (carrera)</th>
                    <th style={{ width: "220px" }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollments.map((e) => (
                    <tr key={e.id}>
                      <td>{e.id}</td>
                      <td>{e.career_name}</td>
                      <td>{formatFecha(e.inicio_cursado || null)}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-outline-primary me-2"
                          onClick={() => handleViewPayments(e.id)}
                        >
                          Ver pagos
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDeleteEnrollment(e.id)}
                        >
                          Quitar
                        </button>
                      </td>
                    </tr>
                  ))}

                  {enrollments.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center">
                        Este alumno todavía no tiene carreras asignadas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserEnrollmentsView;
