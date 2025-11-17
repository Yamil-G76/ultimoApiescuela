// src/views/auth/admin/CareerListView.tsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "../../../config/backend";

interface CareerItem {
  id: number;
  name: string;
  costo_mensual: number;
  duracion_meses: number;
  inicio_cursado?: string | null;
}

interface PaginatedCareersResponse {
  success?: boolean;
  message?: string;
  data?: {
    items: CareerItem[];
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
    has_next: boolean;
  };
}

const CareerListView: React.FC = () => {
  const [items, setItems] = useState<CareerItem[]>([]);
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
    return d.toLocaleDateString();
  };

  // ---------------------------------
  // Cargar carreras (paginado)
  // ---------------------------------
  const loadCareers = async (pageToLoad: number, reset = false) => {
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

      const data = (await res.json()) as PaginatedCareersResponse;

      if (!data.success || !data.data) {
        throw new Error(data.message || "Error al obtener carreras");
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

  // Scroll infinito
  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const nearBottom = scrollTop + clientHeight >= scrollHeight - 100;

    if (nearBottom && hasMore && !loadingRef.current) {
      void loadCareers(page + 1);
    }
  };

  useEffect(() => {
    void loadCareers(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------
  // Handlers
  // ---------------------------------
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setHasMore(true);
    void loadCareers(1, true);
  };

  const handleCreate = () => {
    navigate("/admin/careers/create");
  };

  const handleEdit = (id: number) => {
    navigate(`/admin/careers/${id}/edit`);
  };

  const handleViewPrices = (id: number) => {
    navigate(`/admin/careers/${id}/prices`);
  };

  const handleDelete = async (id: number) => {
    const ok = window.confirm("¿Seguro que querés eliminar esta carrera?");
    if (!ok) return;

    try {
      const res = await fetch(`${BASE_URL}/careers/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        console.error("Error eliminando carrera");
        alert("No se pudo eliminar la carrera");
        return;
      }

      setItems((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error(err);
      alert("Error eliminando la carrera");
    }
  };

  // ---------------------------------
  // Render
  // ---------------------------------
  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Carreras</h2>
        <button className="btn btn-primary" onClick={handleCreate}>
          + Nueva carrera
        </button>
      </div>

      <form className="mb-3" onSubmit={handleSearchSubmit}>
        <div className="input-group">
          <input
            className="form-control"
            placeholder="Buscar por nombre de carrera..."
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
          height: "70vh",
          overflowY: "auto",
          border: "1px solid #dee2e6",
          borderRadius: "0.5rem",
          backgroundColor: "#ffffff",
          padding: "0.75rem",
        }}
      >
        {initialLoading ? (
          <div className="text-center text-muted py-3">
            Cargando carreras...
          </div>
        ) : (
          <>
            <table className="table table-striped table-hover mb-0">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Costo mensual</th>
                  <th>Duración (meses)</th>
                  <th>Inicio cursado</th>
                  <th style={{ width: "250px" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id}>
                    <td>{c.id}</td>
                    <td>{c.name}</td>
                    <td>${c.costo_mensual}</td>
                    <td>{c.duracion_meses}</td>
                    <td>{formatFecha(c.inicio_cursado || null)}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline-primary me-2"
                        onClick={() => handleEdit(c.id)}
                      >
                        Editar
                      </button>
                      <button
                        className="btn btn-sm btn-outline-secondary me-2"
                        onClick={() => handleViewPrices(c.id)}
                      >
                        Historial precios
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDelete(c.id)}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}

                {items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center">
                      No se encontraron carreras.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {loadingMore && (
              <div className="text-center text-muted py-2">
                Cargando más carreras...
              </div>
            )}

            {!hasMore && items.length > 0 && (
              <div className="text-center text-muted py-2">
                No hay más carreras para cargar.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CareerListView;
