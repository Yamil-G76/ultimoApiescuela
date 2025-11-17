import React, { useEffect, useRef, useState } from "react";
import UsersDataView from "../../../components/data/UsersDataView";
import type { User } from "../../../components/data/UsersDataView";
// 1) Tipos
type PaginatedUsersResponse = {
  success?: boolean;
  message?: string;
  data?: {
    items: User[];
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
    has_next: boolean;
  };
};

// 2) Constantes backend
const BACKEND_IP = "127.0.0.1";
const BACKEND_PORT = "8000";
const ENDPOINT = "/users/paginated";
const URL = `http://${BACKEND_IP}:${BACKEND_PORT}${ENDPOINT}`;

// 3) Hooks (useState, useRef, useEffect)
const UsersListView: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef<boolean>(false);

  // 4) Funciones internas

  const getUsersPag = async (page: number) => {
    if (loadingRef.current) return;
    if (!hasMore && page !== 1) return;

    loadingRef.current = true;
    setError(null);

    try {
      const token = localStorage.getItem("token");

      const body = {
        page,
        page_size: 20,
      };

      const res = await fetch(URL, {
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
        throw new Error(data.message || "Error al obtener usuarios");
      }

      const { items, has_next, page: returnedPage } = data.data;

      if (page === 1) {
        setUsers(items);
      } else {
        setUsers((prev) => [...prev, ...items]);
      }

      setCurrentPage(returnedPage);
      setHasMore(has_next);
    } catch (error: unknown) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Error desconocido");
      }
    } finally {
      loadingRef.current = false;
      setInitialLoading(false);
    }
  };

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;

    const nearBottom = scrollTop + clientHeight >= scrollHeight - 100;

    if (nearBottom && hasMore && !loadingRef.current) {
      void getUsersPag(currentPage + 1);
    }
  };

  // 5) useEffect para cargar datos al montar
  useEffect(() => {
    void getUsersPag(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 6) JSX con DataView
  return (
    <div>
      <h3 className="mb-3">Alumnos / Usuarios</h3>

      {error && <div className="alert alert-danger py-2">{error}</div>}

      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        style={{
          height: "60vh",
          overflowY: "auto",
          border: "1px solid #dee2e6",
          borderRadius: "0.5rem",
          backgroundColor: "#ffffff",
          padding: "0.75rem",
        }}
      >
        {initialLoading ? (
          <div className="text-center text-muted py-3">Cargando usuarios...</div>
        ) : (
          <UsersDataView
            users={users}
            loadingMore={loadingRef.current}
            hasMore={hasMore}
          />
        )}
      </div>
    </div>
  );
};

export default UsersListView;