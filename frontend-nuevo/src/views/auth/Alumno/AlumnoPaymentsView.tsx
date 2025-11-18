// src/views/auth/Alumno/AlumnoPaymentsView.tsx
import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BASE_URL } from "../../../config/backend";
import "../../../styles/alumno-payments.css";

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
  enrollmentId?: number;
  careerName?: string;
}

const AlumnoPaymentsView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { enrollmentId, careerName } = (location.state as LocationState) || {};

  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [includeAnulados, setIncludeAnulados] = useState(false);

  const [loadingPayments, setLoadingPayments] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef<boolean>(false);

  const formatFecha = (value?: string | null) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
  };

  // -----------------------------
  // Cargar pagos (scroll infinito)
  // -----------------------------
  const loadPayments = async (
    pageToLoad: number,
    reset = false,
    includeOverride?: boolean
  ) => {
    if (!enrollmentId) return;

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
        id_usuarioxcarrera: enrollmentId,
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
  // Toggle anulados
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
    if (!enrollmentId) return;
    setPage(1);
    setHasMore(true);
    void loadPayments(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrollmentId]);

  // -----------------------------
  // Sin enrollmentId (error de navegación)
  // -----------------------------
  if (!enrollmentId) {
    return (
      <div className="alumno-payments-page">
        <header className="page-header page-header--alumno-payments">
          <div>
            <h2 className="page-header-title">Mis pagos</h2>
            <p className="page-header-subtitle">
              No se encontró la inscripción seleccionada. Volvé a tus carreras
              para elegir una nuevamente.
            </p>
          </div>

          <button
            type="button"
            className="btn alumno-payments-back-btn"
            onClick={() => navigate("/alumno/careers")}
          >
            Volver a mis carreras
          </button>
        </header>

        <section className="alumno-payments-section">
          <div className="alumno-payments-card">
            <div className="alumno-payments-message alumno-payments-message--muted">
              No se encontró información de la inscripción.
            </div>
          </div>
        </section>
      </div>
    );
  }

  // -----------------------------
  // Render normal
  // -----------------------------
  return (
    <div className="alumno-payments-page">
      {/* Header principal tipo card */}
      <header className="page-header page-header--alumno-payments">
        <div>
          <h2 className="page-header-title">Mis pagos</h2>
          <p className="page-header-subtitle">
            Consultá el historial de pagos de tu carrera seleccionada.
          </p>
          {careerName && (
            <p className="page-header-subtitle page-header-subtitle--secondary">
              Carrera: <span className="alumno-payments-career">{careerName}</span>
            </p>
          )}
        </div>

        <button
          type="button"
          className="btn alumno-payments-back-btn"
          onClick={() => navigate("/alumno/careers")}
        >
          Volver a mis carreras
        </button>
      </header>

      {/* Card principal: filtro + tabla */}
      <section className="alumno-payments-section">
        <div className="alumno-payments-card">
          <div className="alumno-payments-card-header">
            <div>
              <h3 className="alumno-payments-card-title">Historial de pagos</h3>
              <p className="alumno-payments-card-subtitle">
                Los pagos más recientes aparecen primero. Podés elegir si ver o
                no los pagos anulados.
              </p>
            </div>

            <div className="alumno-payments-toggle">
              <div className="form-check form-switch">
                <input
                  id="switchAnuladosAlumno"
                  className="form-check-input"
                  type="checkbox"
                  checked={includeAnulados}
                  onChange={handleToggleAnulados}
                />
                <label
                  className="form-check-label"
                  htmlFor="switchAnuladosAlumno"
                >
                  {includeAnulados
                    ? "Mostrando pagos anulados"
                    : "Ocultando pagos anulados"}
                </label>
              </div>
            </div>
          </div>

          {paymentsError && (
            <div className="alert-box alert-error alumno-payments-alert">
              {paymentsError}
            </div>
          )}

          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="alumno-payments-table-wrapper"
          >
            {loadingPayments ? (
              <div className="alumno-payments-message alumno-payments-message--muted">
                Cargando pagos...
              </div>
            ) : (
              <>
                <table className="alumno-payments-table">
                  <thead>
                    <tr>
                      <th>Cuota</th>
                      <th>Fecha pago</th>
                      <th>Monto</th>
                      <th>Adelantado</th>
                      <th>Estado</th>
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
                      </tr>
                    ))}

                    {payments.length === 0 && (
                      <tr>
                        <td colSpan={5}>
                          <div className="alumno-payments-message alumno-payments-message--muted">
                            No hay pagos registrados para esta carrera.
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </>
            )}
          </div>

          {loadingMore && (
            <div className="alumno-payments-message alumno-payments-message--muted">
              Cargando más pagos...
            </div>
          )}

          {!loadingPayments && !loadingMore && !hasMore && payments.length > 0 && (
            <div className="alumno-payments-message alumno-payments-message--muted">
              No hay más pagos para cargar.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default AlumnoPaymentsView;