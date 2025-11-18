// src/views/auth/admin/PaymentsListView.tsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "../../../config/backend";
import "../../../styles/payments.css";

interface PaymentRow {
  id: number;
  numero_cuota: number;
  fecha_pago?: string | null;
  monto: number;
  adelantado: boolean;
  anulado: boolean;
  id_usuarioxcarrera: number;
  user_id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  dni?: string;
  email?: string;
  career_id: number;
  career_name: string;
}

interface PaginatedPaymentsResponse {
  success?: boolean;
  message?: string;
  data?: {
    items: PaymentRow[];
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
    has_next: boolean;
  };
}

const PaymentsListView: React.FC = () => {
  const [items, setItems] = useState<PaymentRow[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef<boolean>(false);

  const navigate = useNavigate();

  const formatFecha = (value?: string | null) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
  };

  const formatAlumno = (p: PaymentRow) => {
    const nombre = [p.first_name, p.last_name].filter(Boolean).join(" ");
    if (nombre) {
      return `${nombre} (${p.username})`;
    }
    return p.username;
  };

  const formatEstado = (p: PaymentRow) => (p.anulado ? "Anulado" : "Activo");

  // ---------------------------------
  // Cargar pagos (paginado + scroll infinito)
  // ---------------------------------
  const loadPayments = async (pageToLoad: number, reset = false) => {
    if (loadingRef.current) return;
    if (!hasMore && !reset && pageToLoad !== 1) return;

    loadingRef.current = true;
    setError(null);

    if (pageToLoad === 1 && reset) {
      setInitialLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const body = {
        page: pageToLoad,
        page_size: 20,
        search: search || null,
      };

      const res = await fetch(`${BASE_URL}/payments/paginated`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error(`Error HTTP: ${res.status}`);
      }

      const data = (await res.json()) as PaginatedPaymentsResponse;

      if (!data.success || !data.data) {
        throw new Error(data.message || "Error al obtener pagos");
      }

      const { items: newItems, has_next, page: returnedPage } = data.data;

      if (pageToLoad === 1 || reset) {
        setItems(newItems);
      } else {
        setItems((prev) => [...prev, ...newItems]);
      }

      setPage(returnedPage);
      setHasMore(has_next);
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error desconocido");
      }
    } finally {
      loadingRef.current = false;
      setInitialLoading(false);
      setLoadingMore(false);
    }
  };

  // Scroll infinito solo dentro de la tabla
  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const nearBottom = scrollTop + clientHeight >= scrollHeight - 100;

    if (nearBottom && hasMore && !loadingRef.current) {
      void loadPayments(page + 1);
    }
  };

  useEffect(() => {
    void loadPayments(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------
  // Handlers
  // ---------------------------------
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setHasMore(true);
    void loadPayments(1, true);
  };

  const handleGoToDetail = (row: PaymentRow) => {
    navigate(
      `/admin/users/${row.user_id}/enrollments/${row.id_usuarioxcarrera}/payments`,
      {
        state: { from: "global-payments" },
      }
    );
  };

  // ---------------------------------
  // Render
  // ---------------------------------
  return (
    <div className="container mt-4 payments-page">
      {/* Header */}
      <header className="page-header page-header--payments">
        <div>
          <h2 className="page-header-title">Gestión de pagos</h2>
          <p className="page-header-subtitle">
            Historial de pagos registrados, del más reciente al más antiguo.
          </p>
        </div>

      </header>

      {/* Buscador */}
      <section className="payments-search">
        <form className="payments-search-form" onSubmit={handleSearchSubmit}>
          <div className="payments-search-input-wrapper">
            <input
              className="form-input payments-search-input"
              placeholder="Buscar por alumno, DNI, carrera..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              className="btn btn-outline payments-search-btn"
              type="submit"
            >
              Buscar
            </button>
          </div>
          <p className="payments-search-hint">
            Tip: podés buscar por nombre de alumno, DNI o nombre de carrera.
          </p>
        </form>
      </section>

      {error && (
        <div className="alert-box alert-error payments-alert-error">
          {error}
        </div>
      )}

      {/* Card + tabla normal dentro */}
      <section className="payments-list">
        <div className="payments-card">
          <div className="payments-card-header">
            <h3 className="payments-card-title">Pagos registrados</h3>
            <p className="payments-card-subtitle">
              Revisá los pagos y accedé al detalle de cada alumno.
            </p>
          </div>

          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="payments-table-scroll"
          >
            {initialLoading ? (
              <div className="payments-message payments-message--muted">
                Cargando pagos...
              </div>
            ) : (
              <>
                <table className="payments-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Alumno</th>
                      <th>DNI</th>
                      <th>Carrera</th>
                      <th>Cuota</th>
                      <th>Monto</th>
                      <th>Estado</th>
                      <th style={{ width: "150px" }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((p) => (
                      <tr key={p.id}>
                        <td>{formatFecha(p.fecha_pago || null)}</td>
                        <td>{formatAlumno(p)}</td>
                        <td>{p.dni}</td>
                        <td>{p.career_name}</td>
                        <td>{p.numero_cuota}</td>
                        <td>${p.monto}</td>
                        <td>
                          <span
                            className={
                              p.anulado
                                ? "payments-pill payments-pill--cancelled"
                                : "payments-pill payments-pill--active"
                            }
                          >
                            {formatEstado(p)}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn payments-btn-detail"
                            onClick={() => handleGoToDetail(p)}
                          >
                            Ver detalle
                          </button>
                        </td>
                      </tr>
                    ))}

                    {items.length === 0 && (
                      <tr>
                        <td colSpan={8} className="payments-message">
                          No se encontraron pagos.
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

                {!hasMore && items.length > 0 && (
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

export default PaymentsListView;