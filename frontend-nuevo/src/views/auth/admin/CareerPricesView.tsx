// src/views/auth/admin/CareerPricesView.tsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BASE_URL } from "../../../config/backend";

interface CareerData {
  id: number;
  name: string;
  costo_mensual: number;
  duracion_meses: number;
  inicio_cursado?: string | null;
}

interface PriceItem {
  id: number;
  monto: number;
  fecha_desde: string;
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

const CareerPricesView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const careerId = id ? parseInt(id, 10) : 0;

  const [career, setCareer] = useState<CareerData | null>(null);
  const [prices, setPrices] = useState<PriceItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [loadingCareer, setLoadingCareer] = useState(true);
  const [loadingPrices, setLoadingPrices] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [careerError, setCareerError] = useState<string | null>(null);
  const [pricesError, setPricesError] = useState<string | null>(null);

  const formatFecha = (value?: string | null) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
  };

  // -----------------------------
  // Cargar datos de carrera
  // -----------------------------
  const loadCareer = async () => {
    if (!careerId) return;
    setLoadingCareer(true);
    setCareerError(null);

    try {
      const res = await fetch(`${BASE_URL}/careers/${careerId}`);
      if (!res.ok) {
        throw new Error(`Error HTTP: ${res.status}`);
      }

      const data = await res.json();
      setCareer(data.data as CareerData);
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        setCareerError(err.message);
      } else {
        setCareerError("Error desconocido al cargar carrera");
      }
    } finally {
      setLoadingCareer(false);
    }
  };

  // -----------------------------
  // Cargar historial de precios
  // -----------------------------
  const loadPrices = async (pageToLoad: number) => {
    if (!careerId) return;

    if (!hasMore && pageToLoad !== 1) return;

    if (pageToLoad === 1) {
      setLoadingPrices(true);
      setPricesError(null);
    } else {
      setLoadingMore(true);
    }

    try {
      const body = {
        id_carrera: careerId,
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

      const { items: newItems, has_next, page: returnedPage } = data.data;

      if (pageToLoad === 1) {
        setPrices(newItems);
      } else {
        setPrices((prev) => [...prev, ...newItems]);
      }

      setPage(returnedPage);
      setHasMore(has_next);
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        setPricesError(err.message);
      } else {
        setPricesError("Error desconocido al cargar historial");
      }
    } finally {
      setLoadingPrices(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    void loadCareer();
    void loadPrices(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleBack = () => {
    navigate("/admin/careers");
  };

  return (
    <div className="container mt-4">
      {/* Encabezado */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h2 className="mb-0">Historial de precios</h2>
          {loadingCareer ? (
            <small className="text-muted">Cargando carrera...</small>
          ) : careerError ? (
            <small className="text-danger">{careerError}</small>
          ) : (
            career && (
              <>
                <div>
                  <small className="text-muted">
                    {career.name} — ${career.costo_mensual} / mes —{" "}
                    {career.duracion_meses} meses
                  </small>
                </div>
              </>
            )
          )}
        </div>
        <button className="btn btn-secondary" onClick={handleBack}>
          Volver a carreras
        </button>
      </div>

      {/* Tabla historial */}
      <div className="card">
        <div className="card-body">
          <h5 className="card-title">Cambios de precio</h5>

          {pricesError && (
            <div className="alert alert-danger py-2 mb-2">
              {pricesError}
            </div>
          )}

          {loadingPrices ? (
            <div className="text-muted">Cargando historial...</div>
          ) : (
            <>
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
                      <th>Monto</th>
                      <th>Vigente desde</th>
                      <th>Registrado el</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prices.map((p) => (
                      <tr key={p.id}>
                        <td>{p.id}</td>
                        <td>${p.monto}</td>
                        <td>{formatFecha(p.fecha_desde)}</td>
                        <td>{formatFecha(p.created_at || null)}</td>
                      </tr>
                    ))}

                    {prices.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center">
                          No hay historial de precios para esta carrera.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {hasMore && prices.length > 0 && (
                <div className="text-center mt-3">
                  <button
                    className="btn btn-outline-secondary"
                    onClick={() => void loadPrices(page + 1)}
                    disabled={loadingMore}
                  >
                    {loadingMore ? "Cargando..." : "Cargar más"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CareerPricesView;
