// src/views/auth/admin/UsersListView.tsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "../../../config/backend";
import "../../../styles/users.css";

interface UserItem {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  dni?: string;
  email?: string;
  type: string; // "admin" | "alumno"
}

type PaginatedUsersResponse = {
  success?: boolean;
  message?: string;
  data?: {
    items: UserItem[];
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
    has_next: boolean;
  };
};

const UsersListView: React.FC = () => {
  const [items, setItems] = useState<UserItem[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef<boolean>(false);

  const navigate = useNavigate();

  // -------------------------------------------------
  // Cargar alumnos con paginado (scroll infinito)
  // -------------------------------------------------
  const loadUsers = async (pageToLoad: number, reset = false) => {
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
      const token = localStorage.getItem("token");

      const body = {
        page: pageToLoad,
        page_size: 20,
        search: search || null,
      };

      const res = await fetch(`${BASE_URL}/users/paginated`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error(`Error HTTP: ${res.status}`);
      }

      const data = (await res.json()) as PaginatedUsersResponse;

      if (!data.success || !data.data) {
        throw new Error(data.message || "Error al obtener alumnos");
      }

      const { items: newItems, has_next, page: returnedPage } = data.data;

      if (pageToLoad === 1 || reset) {
        setItems(newItems);
      } else {
        setItems((prev) => [...prev, ...newItems]);
      }

      setPage(returnedPage);
      setHasMore(has_next);
    } catch (err: unknown) {
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

  // -------------------------------------------------
  // Manejo de scroll del panel
  // -------------------------------------------------
  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const nearBottom = scrollTop + clientHeight >= scrollHeight - 100;

    if (nearBottom && hasMore && !loadingRef.current) {
      void loadUsers(page + 1);
    }
  };

  // Primera carga
  useEffect(() => {
    void loadUsers(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------------------------------------
  // Handlers
  // -------------------------------------------------
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setHasMore(true);
    void loadUsers(1, true);
  };

  const handleCreate = () => {
    navigate("/admin/users/create");
  };

  const handleEdit = (id: number) => {
    navigate(`/admin/users/${id}/edit`);
  };

  const handleEnrollments = (id: number) => {
    navigate(`/admin/users/${id}/enrollments`);
  };

  const handleDelete = async (id: number) => {
    const ok = window.confirm("¿Seguro que querés eliminar este alumno?");
    if (!ok) return;

    try {
      const res = await fetch(`${BASE_URL}/users/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        console.error("Error eliminando alumno");
        alert("No se pudo eliminar el alumno");
        return;
      }

      setItems((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      console.error(err);
      alert("Error eliminando el alumno");
    }
  };

  // -------------------------------------------------
  // Render
  // -------------------------------------------------
  return (
    <div className="user-page">
      {/* Header principal */}
      <header className="page-header">
        <div>
          <h2 className="page-header-title">Gestión de alumnos</h2>
          <p className="page-header-subtitle">
            Administrá los alumnos registrados y sus inscripciones a carreras.
          </p>
        </div>

        <button
          className="btn btn-primary page-header-cta"
          type="button"
          onClick={handleCreate}
        >
          + Nuevo alumno
        </button>
      </header>

      {/* Buscador */}
      <section className="user-search">
        <form className="user-search-form" onSubmit={handleSearchSubmit}>
          <div className="user-search-input-wrapper">
            <input
              className="form-input user-search-input"
              placeholder="Buscar por nombre, usuario, DNI o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="btn btn-outline" type="submit">
              Buscar
            </button>
          </div>
          <p className="user-search-hint">
            Tip: podés filtrar por nombre, apellido, DNI o email del alumno.
          </p>
        </form>
      </section>

      {error && (
        <div className="alert-box alert-error">
          <span>{error}</span>
        </div>
      )}

      {/* Panel con tabla y scroll interno */}
      <div
        ref={scrollContainerRef}
        className="user-list-container"
        onScroll={handleScroll}
      >
        {initialLoading ? (
          <div className="user-list-message user-list-message--muted">
            Cargando alumnos...
          </div>
        ) : (
          <>
            <table className="user-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Usuario</th>
                  <th>Nombre y apellido</th>
                  <th>DNI</th>
                  <th>Email</th>
                  <th style={{ width: "260px" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((u) => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>{u.username}</td>
                    <td>
                      {u.first_name} {u.last_name}
                    </td>
                    <td>{u.dni}</td>
                    <td>{u.email}</td>
                    <td>
                      <div className="user-table-actions">
                        <button
                          type="button"
                          className="btn user-btn-edit"
                          onClick={() => handleEdit(u.id)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="btn user-btn-enroll"
                          onClick={() => handleEnrollments(u.id)}
                        >
                          Carreras
                        </button>
                        <button
                          type="button"
                          className="btn user-btn-delete"
                          onClick={() => handleDelete(u.id)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {items.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="user-list-message user-list-message--muted"
                    >
                      No se encontraron alumnos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {loadingMore && (
              <div className="user-list-message user-list-message--muted">
                Cargando más alumnos...
              </div>
            )}

            {!hasMore && items.length > 0 && (
              <div className="user-list-message user-list-message--muted">
                No hay más alumnos para cargar.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default UsersListView;