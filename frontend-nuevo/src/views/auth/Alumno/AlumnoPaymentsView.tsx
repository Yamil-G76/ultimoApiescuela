// src/views/auth/Alumno/AlumnoPaymentsView.tsx
import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BASE_URL } from "../../../config/backend";

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
  // Render
  // -----------------------------
  if (!enrollmentId) {
    return (
      <div className="container mt-4">
        <div className="alert alert-warning">
          No se encontró información de la inscripción.
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => navigate("/alumno/careers")}
        >
          Volver a mis carreras
        </button>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      {/* Encabezado */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h2 className="mb-0">Mis pagos</h2>
          {careerName && (
            <small className="text-muted">
              Carrera: {careerName}
            </small>
          )}
        </div>

        <button
          className="btn btn-secondary"
          onClick={() => navigate("/alumno/careers")}
        >
          Volver a mis carreras
        </button>
      </div>

      {/* Filtro anulados */}
      <div className="card mb-3">
        <div className="card-body d-flex justify-content-between align-items-center">
          <div>
            <h5 className="card-title mb-0">Historial de pagos</h5>
            <small className="text-muted">
              Los más recientes aparecen primero.
            </small>
          </div>

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

      {/* Lista de pagos */}
      <div className="card">
        <div className="card-body">
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
                        <td>{p.anulado ? "Anulado" : "Activo"}</td>
                      </tr>
                    ))}

                    {payments.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center">
                          No hay pagos registrados para esta carrera.
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

export default AlumnoPaymentsView;
