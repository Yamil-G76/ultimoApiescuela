// src/views/auth/admin/PaymentsListView.tsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "../../../config/backend";

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

  // Scroll infinito (igual que en UsersListView)
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
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Pagos</h2>
        <small className="text-muted">
          Historial de pagos (últimos primero)
        </small>
      </div>

      <form className="mb-3" onSubmit={handleSearchSubmit}>
        <div className="input-group">
          <input
            className="form-control"
            placeholder="Buscar por alumno, DNI, carrera..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn btn-outline-secondary" type="submit">
            Buscar
          </button>
        </div>
      </form>

      {error && <div className="alert alert-danger py-2">{error}</div>}

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
        {initialLoading ? (
          <div className="text-center text-muted py-3">
            Cargando pagos...
          </div>
        ) : (
          <>
            <table className="table table-striped table-hover mb-0">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Alumno</th>
                  <th>DNI</th>
                  <th>Carrera</th>
                  <th>Cuota</th>
                  <th>Monto</th>
                  <th>Estado</th>
                  <th style={{ width: "160px" }}>Acciones</th>
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
                    <td>{formatEstado(p)}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => handleGoToDetail(p)}
                      >
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                ))}

                {items.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center">
                      No se encontraron pagos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {loadingMore && (
              <div className="text-center text-muted py-2">
                Cargando más pagos...
              </div>
            )}

            {!hasMore && items.length > 0 && (
              <div className="text-center text-muted py-2">
                No hay más pagos para cargar.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentsListView;
