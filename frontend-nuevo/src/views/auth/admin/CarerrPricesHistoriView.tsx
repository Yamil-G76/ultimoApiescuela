// src/views/auth/admin/CareerPricesHistoryView.tsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BASE_URL } from "../../../config/backend";

interface PriceItem {
  id: number;
  monto: number;
  fecha_desde?: string | null;
  created_at?: string | null;
}

interface PricesData {
  id_carrera: number;
  career_name: string;
  items: PriceItem[];
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
}

interface PricesResponse {
  success?: boolean;
  message?: string;
  data?: PricesData;
}

const CareerPricesHistoryView: React.FC = () => {
  const { id } = useParams<{ id: string }>(); // id de la carrera
  const navigate = useNavigate();

  const careerIdNum = id ? parseInt(id, 10) : 0;

  const [careerName, setCareerName] = useState<string>("");
  const [items, setItems] = useState<PriceItem[]>([]);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef<boolean>(false);

  const formatFecha = (value?: string | null) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
  };

  const formatMonto = (m: number) => `$${m}`;

  // ---------------------------------
  // Cargar historial de precios (scroll infinito)
  // ---------------------------------
  const loadPrices = async (pageToLoad: number, reset = false) => {
    if (!careerIdNum) return;

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
        id_carrera: careerIdNum,
        page: pageToLoad,
        page_size: 20,
      };

      const res = await fetch(`${BASE_URL}/careers/prices/paginated`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error(`Error HTTP: ${res.status}`);
      }

      const data = (await res.json()) as PricesResponse;

      if (!data.success || !data.data) {
        throw new Error(data.message || "Error al obtener historial de precios");
      }

      const { items: newItems, has_next, page: returnedPage, career_name } =
        data.data;

      if (!careerName && career_name) {
        setCareerName(career_name);
      }

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

  // ---------------------------------
  // Scroll infinito
  // ---------------------------------
  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const nearBottom = scrollTop + clientHeight >= scrollHeight - 100;

    if (nearBottom && hasMore && !loadingRef.current) {
      void loadPrices(page + 1);
    }
  };

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    void loadPrices(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleBack = () => {
    navigate("/admin/careers");
  };

  // ---------------------------------
  // Render
  // ---------------------------------
  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h2 className="mb-0">Historial de precios</h2>
          {careerName && (
            <small className="text-muted">
              Carrera: {careerName}
            </small>
          )}
        </div>

        <button className="btn btn-secondary" onClick={handleBack}>
          Volver a carreras
        </button>
      </div>

      {error && <div className="alert alert-danger py-2">{error}</div>}

      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        style={{
          height: "70vh", // misma altura/estilo que alumnos y pagos
          overflowY: "auto",
          border: "1px solid #dee2e6",
          borderRadius: "0.5rem",
          backgroundColor: "#ffffff",
          padding: "0.75rem",
        }}
      >
        {initialLoading ? (
          <div className="text-center text-muted py-3">
            Cargando historial de precios...
          </div>
        ) : (
          <>
            <table className="table table-striped table-hover mb-0">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Monto</th>
                  <th>Vigente desde</th>
                  <th>Creado en</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p, idx) => (
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td>
                      {formatMonto(p.monto)}
                      {idx === 0 && (
                        <span className="badge bg-success ms-2">
                          Actual
                        </span>
                      )}
                    </td>
                    <td>{formatFecha(p.fecha_desde || null)}</td>
                    <td>{formatFecha(p.created_at || null)}</td>
                  </tr>
                ))}

                {items.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center">
                      Esta carrera todavía no tiene historial de precios.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {loadingMore && (
              <div className="text-center text-muted py-2">
                Cargando más registros...
              </div>
            )}

            {!hasMore && items.length > 0 && (
              <div className="text-center text-muted py-2">
                No hay más registros para cargar.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CareerPricesHistoryView;
