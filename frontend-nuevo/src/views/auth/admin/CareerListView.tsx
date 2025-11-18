// src/views/auth/admin/CareerListView.tsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "../../../config/backend";
import "../../../styles/careers.css";

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

  // Scroll infinito SOLO dentro del wrapper de la tabla
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
    <div className="career-page">
      {/* Header superior */}
      <header className="page-header">
        <div>
          <h2 className="page-header-title">Carreras</h2>
          <p className="page-header-subtitle">
            Administrá las carreras activas y su información básica.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={handleCreate}
          type="button"
        >
          + Nueva carrera
        </button>
      </header>

      {/* Card con tabla + buscador adentro */}
      <section className="career-table-card">
        <header className="career-table-card-header">
          <div>
            <h3 className="career-table-title">Listado de carreras</h3>
            <p className="career-table-subtitle">
              Buscá por nombre y desplazate para ver más carreras.
            </p>
          </div>

          <form
            className="career-search-inline"
            onSubmit={handleSearchSubmit}
          >
            <input
              className="form-input career-search-input"
              placeholder="Buscar carrera..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="btn btn-outline career-search-btn" type="submit">
              Buscar
            </button>
          </form>
        </header>

        {error && <div className="alert-box alert-error">{error}</div>}

        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="career-table-wrapper"
        >
          {initialLoading ? (
            <div className="list-message list-message--muted">
              Cargando carreras...
            </div>
          ) : (
            <>
              <table className="table-modern career-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Costo mensual</th>
                    <th>Duración (meses)</th>
                    <th>Inicio cursado</th>
                    <th style={{ width: "300px" }}>Acciones</th>
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
                      <td className="career-table-actions">
                        <button
                          className="btn btn-small career-btn-edit"
                          type="button"
                          onClick={() => handleEdit(c.id)}
                        >
                          Editar
                        </button>
                        <button
                          className="btn btn-small career-btn-history"
                          type="button"
                          onClick={() => handleViewPrices(c.id)}
                        >
                          Historial precios
                        </button>
                        <button
                          className="btn btn-small career-btn-delete"
                          type="button"
                          onClick={() => handleDelete(c.id)}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}

                  {items.length === 0 && (
                    <tr>
                      <td colSpan={6}>
                        <div className="list-message list-message--muted">
                          No se encontraron carreras.
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {loadingMore && (
                <div className="list-message list-message--muted">
                  Cargando más carreras...
                </div>
              )}

              {!hasMore && items.length > 0 && (
                <div className="list-message list-message--muted">
                  No hay más carreras para cargar.
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default CareerListView;