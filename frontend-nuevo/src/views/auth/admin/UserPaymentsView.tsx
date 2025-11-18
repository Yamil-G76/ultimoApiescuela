// src/views/auth/admin/UserPaymentsView.tsx
import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { BASE_URL } from "../../../config/backend";
import "../../../styles/payments.css";

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
  const [adelantadoFlag, setAdelantadoFlag] = useState(false);
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
        adelantado: adelantadoFlag,
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
      setAdelantadoFlag(false);

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
    <div className="payments-page user-payments-page">
      {/* Header tipo card como en otras vistas */}
      <header className="page-header page-header--payments user-payments-header">
        <div className="user-payments-header-main">
          <h2 className="page-header-title">Pagos del alumno</h2>
          <p className="page-header-subtitle">
            Gestioná los pagos de la inscripción seleccionada.
          </p>
        </div>

        <div className="user-payments-header-inline">
          <div className="user-payments-header-extra">
            {loadingUser ? (
              <span>Cargando alumno...</span>
            ) : userError ? (
              <span className="text-error">{userError}</span>
            ) : (
              user && (
                <>
                  <span>
                    <strong>Alumno:</strong> {formatHeaderAlumno()}
                  </span>
                  {user.dni && (
                    <span>
                      <strong>DNI:</strong> {user.dni}
                    </span>
                  )}
                </>
              )
            )}

            {loadingEnrollment ? (
              <span>Cargando carrera...</span>
            ) : enrollmentError ? (
              <span className="text-error">{enrollmentError}</span>
            ) : (
              enrollment && (
                <span>
                  <strong>Carrera:</strong> {formatHeaderCarrera()}
                </span>
              )
            )}
          </div>

          <button
            className="btn user-payments-back-btn"
            type="button"
            onClick={handleBack}
          >
            Volver
          </button>
        </div>
      </header>

      {/* Card formulario registrar pago */}
      <section className="user-payments-form">
        <div className="payments-card user-payments-form-card">
          <div className="payments-card-header">
            <h3 className="payments-card-title">Registrar nuevo pago</h3>
            <p className="payments-card-subtitle">
              Cargá el número de cuota, la fecha y marcá si es pago adelantado.
            </p>
          </div>

          <div className="user-payments-form-grid">
            <div className="user-payments-form-field">
              <label htmlFor="numeroCuota">N° de cuota</label>
              <input
                id="numeroCuota"
                type="number"
                min={1}
                className="form-input"
                placeholder="Ej: 1"
                value={numeroCuota}
                onChange={(e) => setNumeroCuota(e.target.value)}
              />
            </div>

            <div className="user-payments-form-field">
              <label htmlFor="fechaPago">Fecha de pago</label>
              <input
                id="fechaPago"
                type="date"
                className="form-input"
                value={fechaPago}
                onChange={(e) => setFechaPago(e.target.value)}
              />
              <small className="user-payments-hint">
                Si la dejás vacía, se usa la fecha actual.
              </small>
            </div>

            <div className="user-payments-form-field user-payments-adelantado">
              <label className="user-payments-checkbox-label">
                <input
                  type="checkbox"
                  checked={adelantadoFlag}
                  onChange={(e) => setAdelantadoFlag(e.target.checked)}
                />
                Pago adelantado
              </label>
              <small className="user-payments-hint">
                Marcá si corresponde a una cuota futura.
              </small>
            </div>

            <div className="user-payments-form-field user-payments-form-actions">
              <button
                className="btn btn-primary"
                onClick={handleCreatePayment}
                disabled={saving || !!enrollmentError}
                type="button"
              >
                {saving ? "Guardando..." : "Registrar pago"}
              </button>
            </div>

            <div className="user-payments-toggle">
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
      </section>

      {/* Card listado de pagos */}
      <section className="user-payments-list">
        <div className="payments-card user-payments-list-card">
          <div className="payments-card-header">
            <h3 className="payments-card-title">Historial de pagos</h3>
            <p className="payments-card-subtitle">
              Pagos de esta inscripción, del más reciente al más antiguo.
            </p>
          </div>

          {paymentsError && (
            <div className="alert-box alert-error user-payments-alert">
              {paymentsError}
            </div>
          )}

          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="payments-table-scroll user-payments-table-scroll"
          >
            {loadingPayments ? (
              <div className="payments-message payments-message--muted">
                Cargando pagos...
              </div>
            ) : (
              <>
                <table className="payments-table">
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
                        <td>
                          <span
                            className={
                              p.anulado
                                ? "payments-status-pill payments-status-pill--canceled"
                                : "payments-status-pill payments-status-pill--active"
                            }
                          >
                            {p.anulado ? "Anulado" : "Activo"}
                          </span>
                        </td>
                        <td>
                          {!p.anulado && (
                            <button
                              className="btn user-payments-btn-cancel"
                              type="button"
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
                        <td colSpan={6}>
                          <div className="payments-message payments-message--muted">
                            No hay pagos registrados para esta inscripción.
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {loadingMore && (
                  <div className="payments-message payments-message--muted">
                    Cargando más pagos...
                  </div>
                )}

                {!hasMore && payments.length > 0 && (
                  <div className="payments-message payments-message--muted">
                    No hay más pagos para cargar.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default UserPaymentsView