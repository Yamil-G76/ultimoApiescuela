// src/views/auth/admin/UserPaymentsView.tsx
import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
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

interface PaymentItem {
  id: number;
  numero_cuota: number;
  fecha_pago?: string | null;
  monto: number;
  adelantado: boolean;
  anulado: boolean;
}

interface PaymentsData {
  id_usuarioxcarrera: number;
  items: PaymentItem[];
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
}

interface PaymentsResponse {
  success?: boolean;
  message?: string;
  data?: PaymentsData;
}

interface LocationState {
  from?: "global-payments" | "user-enrollments";
}

const UserPaymentsView: React.FC = () => {
  const { userId, enrollmentId } = useParams<{
    userId: string;
    enrollmentId: string;
  }>();

  const location = useLocation();
  const navigate = useNavigate();

  const { from } = (location.state as LocationState | null) || {};

  const userIdNum = userId ? parseInt(userId, 10) : 0;
  const enrollmentIdNum = enrollmentId ? parseInt(enrollmentId, 10) : 0;

  const [user, setUser] = useState<UserData | null>(null);
  const [enrollment, setEnrollment] = useState<EnrollmentItem | null>(null);

  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [includeAnulados, setIncludeAnulados] = useState(true);

  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingEnrollment, setLoadingEnrollment] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [userError, setUserError] = useState<string | null>(null);
  const [enrollmentError, setEnrollmentError] = useState<string | null>(null);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // refs para scroll infinito
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef<boolean>(false);

  // Campos para crear pago
  const [numeroCuota, setNumeroCuota] = useState("");
  const [fechaPago, setFechaPago] = useState(""); // input type="date"
  const [saving, setSaving] = useState(false);

  // -----------------------------
  // Helpers
  // -----------------------------
  const formatFecha = (value?: string | null) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
  };

  const formatHeaderAlumno = () => {
    if (!user) return "";
    const nombre = [user.first_name, user.last_name].filter(Boolean).join(" ");
    if (nombre) {
      return `${nombre} (${user.username})`;
    }
    return user.username;
  };

  const formatHeaderCarrera = () => {
    if (!enrollment) return "";
    return enrollment.career_name;
  };

  // -----------------------------
  // Back inteligente según origen
  // -----------------------------
  const handleBack = () => {
    if (from === "global-payments") {
      navigate("/admin/payments");
    } else if (from === "user-enrollments" && userIdNum) {
      navigate(`/admin/users/${userIdNum}/enrollments`);
    } else {
      navigate(-1);
    }
  };

  // -----------------------------
  // Cargar usuario
  // -----------------------------
  const loadUser = async () => {
    if (!userIdNum) return;
    setLoadingUser(true);
    setUserError(null);

    try {
      const res = await fetch(`${BASE_URL}/users/${userIdNum}`);
      if (!res.ok) {
        throw new Error(`Error HTTP: ${res.status}`);
      }

      const data = await res.json();
      setUser(data.data as UserData);
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        setUserError(err.message);
      } else {
        setUserError("Error desconocido al cargar usuario");
      }
    } finally {
      setLoadingUser(false);
    }
  };

  // -----------------------------
  // Cargar info de inscripción
  // -----------------------------
  const loadEnrollment = async () => {
    if (!userIdNum || !enrollmentIdNum) return;

    setLoadingEnrollment(true);
    setEnrollmentError(null);

    try {
      const body = {
        user_id: userIdNum,
        page: 1,
        page_size: 100,
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

      const found = data.data.items.find((e) => e.id === enrollmentIdNum);
      if (!found) {
        setEnrollmentError("Inscripción no encontrada para este alumno");
      } else {
        setEnrollment(found);
      }
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        setEnrollmentError(err.message);
      } else {
        setEnrollmentError("Error desconocido al cargar inscripción");
      }
    } finally {
      setLoadingEnrollment(false);
    }
  };

  // -----------------------------
  // Cargar pagos de la inscripción (con scroll infinito)
  // -----------------------------
  const loadPayments = async (
    pageToLoad: number,
    reset = false,
    includeOverride?: boolean
  ) => {
    if (!enrollmentIdNum) return;

    if (loadingRef.current) return;
    if (!hasMore && !reset && pageToLoad !== 1) return;

    const includeFlag = includeOverride ?? includeAnulados;

    loadingRef.current = true;

    if (pageToLoad === 1 || reset) {
      setLoadingPayments(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const body = {
        id_usuarioxcarrera: enrollmentIdNum,
        page: pageToLoad,
        page_size: 20,
        include_anulados: includeFlag,
      };

      const res = await fetch(`${BASE_URL}/payments/by-enrollment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error(`Error HTTP: ${res.status}`);
      }

      const data = (await res.json()) as PaymentsResponse;

      if (!data.success || !data.data) {
        throw new Error(data.message || "Error al obtener pagos");
      }

      const { items: newItems, has_next, page: returnedPage } = data.data;

      if (pageToLoad === 1 || reset) {
        setPayments(newItems);
      } else {
        setPayments((prev) => [...prev, ...newItems]);
      }

      setPage(returnedPage);
      setHasMore(has_next);
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        setPaymentsError(err.message);
      } else {
        setPaymentsError("Error desconocido al cargar pagos");
      }
    } finally {
      loadingRef.current = false;
      setLoadingPayments(false);
      setLoadingMore(false);
    }
  };

  // -----------------------------
  // Scroll handler (infinito)
  // -----------------------------
  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const nearBottom = scrollTop + clientHeight >= scrollHeight - 100;

    if (nearBottom && hasMore && !loadingRef.current) {
      void loadPayments(page + 1);
    }
  };

  // -----------------------------
  // Crear pago
  // -----------------------------
  const handleCreatePayment = async () => {
    if (!enrollmentIdNum) return;

    const cuotaNum = parseInt(numeroCuota, 10);
    if (!cuotaNum || cuotaNum <= 0) {
      alert("Ingresá un número de cuota válido (>= 1)");
      return;
    }

    setSaving(true);

    try {
      const fecha =
        fechaPago && fechaPago.trim().length > 0
          ? new Date(fechaPago)
          : null;

      const body: {
        id_usuarioxcarrera: number;
        numero_cuota: number;
        fecha_pago?: string;
        adelantado: boolean;
      } = {
        id_usuarioxcarrera: enrollmentIdNum,
        numero_cuota: cuotaNum,
        adelantado: false,
      };

      if (fecha) {
        body.fecha_pago = fecha.toISOString();
      }

      const res = await fetch(`${BASE_URL}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error("Error creando pago:", errData);
        if ((errData as { detail?: unknown }).detail) {
          alert(String((errData as { detail?: unknown }).detail));
        } else {
          alert("No se pudo crear el pago");
        }
        return;
      }

      // reseteo inputs
      setNumeroCuota("");
      setFechaPago("");

      // recargar primera página
      setPage(1);
      setHasMore(true);
      await loadPayments(1, true);
      alert("Pago registrado correctamente");
    } catch (err) {
      console.error(err);
      alert("Error registrando pago");
    } finally {
      setSaving(false);
    }
  };

  // -----------------------------
  // Anular pago
  // -----------------------------
  const handleCancelPayment = async (paymentId: number) => {
    const ok = window.confirm("¿Seguro que querés anular este pago?");
    if (!ok) return;

    try {
      const res = await fetch(`${BASE_URL}/payments/${paymentId}/cancel`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ motivo: null }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error("Error anulando pago:", errData);
        if ((errData as { detail?: unknown }).detail) {
          alert(String((errData as { detail?: unknown }).detail));
        } else {
          alert("No se pudo anular el pago");
        }
        return;
      }

      setPayments((prev) =>
        prev.map((p) =>
          p.id === paymentId ? { ...p, anulado: true } : p
        )
      );
      alert("Pago anulado correctamente");
    } catch (err) {
      console.error(err);
      alert("Error anulando el pago");
    }
  };

  // -----------------------------
  // Toggle incluir/ocultar anulados
  // -----------------------------
  const handleToggleAnulados = () => {
    const nuevoValor = !includeAnulados;
    setIncludeAnulados(nuevoValor);
    setPage(1);
    setHasMore(true);
    void loadPayments(1, true, nuevoValor);
  };

  // -----------------------------
  // useEffect inicial
  // -----------------------------
  useEffect(() => {
    void loadUser();
    void loadEnrollment();
    setPage(1);
    setHasMore(true);
    void loadPayments(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, enrollmentId]);

  // -----------------------------
  // Render
  // -----------------------------
  return (
    <div className="container mt-4">
      {/* Encabezado */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h2 className="mb-0">Pagos del alumno</h2>

          {loadingUser ? (
            <small className="text-muted">Cargando alumno...</small>
          ) : userError ? (
            <small className="text-danger">{userError}</small>
          ) : (
            user && (
              <div>
                <small className="text-muted">
                  {formatHeaderAlumno()}{" "}
                  {user.dni ? `— DNI: ${user.dni}` : ""}
                </small>
              </div>
            )
          )}

          {loadingEnrollment ? (
            <div>
              <small className="text-muted">Cargando carrera...</small>
            </div>
          ) : enrollmentError ? (
            <div>
              <small className="text-danger">{enrollmentError}</small>
            </div>
          ) : (
            enrollment && (
              <div>
                <small className="text-muted">
                  Carrera: {formatHeaderCarrera()}
                </small>
              </div>
            )
          )}
        </div>

        <button className="btn btn-secondary" onClick={handleBack}>
          Volver
        </button>
      </div>

      {/* Formulario para registrar pago */}
      <div className="card mb-3">
        <div className="card-body">
          <h5 className="card-title">Registrar nuevo pago</h5>

          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label">N° de cuota</label>
              <input
                type="number"
                min={1}
                className="form-control"
                placeholder="Ej: 1"
                value={numeroCuota}
                onChange={(e) => setNumeroCuota(e.target.value)}
              />
            </div>

            <div className="col-md-3">
              <label className="form-label">Fecha de pago</label>
              <input
                type="date"
                className="form-control"
                value={fechaPago}
                onChange={(e) => setFechaPago(e.target.value)}
              />
              <small className="text-muted">
                Si la dejás vacía, se usa la fecha actual.
              </small>
            </div>

            <div className="col-md-3 d-flex align-items-end">
              <button
                className="btn btn-primary w-100"
                onClick={handleCreatePayment}
                disabled={saving || !!enrollmentError}
              >
                {saving ? "Guardando..." : "Registrar pago"}
              </button>
            </div>

            <div className="col-md-3 d-flex align-items-end">
              <div className="form-check form-switch">
                <input
                  id="switchAnulados"
                  className="form-check-input"
                  type="checkbox"
                  checked={includeAnulados}
                  onChange={handleToggleAnulados}
                />
                <label
                  className="form-check-label"
                  htmlFor="switchAnulados"
                >
                  {includeAnulados
                    ? "Mostrando pagos anulados"
                    : "Ocultando pagos anulados"}
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de pagos */}
      <div className="card">
        <div className="card-body">
          <h5 className="card-title">Historial de pagos</h5>

          {paymentsError && (
            <div className="alert alert-danger py-2 mb-2">
              {paymentsError}
            </div>
          )}

          {loadingPayments ? (
            <div className="text-muted">Cargando pagos...</div>
          ) : (
            <>
              <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                style={{
                  height: "70vh",           // 👉 igual que la tabla de alumnos
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
                      <th>Cuota</th>
                      <th>Fecha pago</th>
                      <th>Monto</th>
                      <th>Adelantado</th>
                      <th>Estado</th>
                      <th style={{ width: "140px" }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td>{p.numero_cuota}</td>
                        <td>{formatFecha(p.fecha_pago || null)}</td>
                        <td>${p.monto}</td>
                        <td>{p.adelantado ? "Sí" : "No"}</td>
                        <td>{p.anulado ? "Anulado" : "Activo"}</td>
                        <td>
                          {!p.anulado && (
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleCancelPayment(p.id)}
                            >
                              Anular
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}

                    {payments.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center">
                          No hay pagos registrados para esta inscripción.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {loadingMore && (
                <div className="text-center text-muted py-2">
                  Cargando más pagos...
                </div>
              )}

              {!hasMore && payments.length > 0 && (
                <div className="text-center text-muted py-2">
                  No hay más pagos para cargar.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserPaymentsView;
