import React, { useEffect, useRef, useState } from "react";
import UsersDataView from "../../../components/data/UsersDataView";

// 1) Tipos
type User = {
  id: number;
  username: string;
  first_name?: string | null;
  last_name?: string | null;
  type: string;
};

type PaginatedUsersResponse = {
  success: boolean;
  message: string;
  data: {
    items: User[];
    nextCursor: string | null; // o page, según cómo lo tengas en el backend
  };
};

// 2) Constantes backend
const BACKEND_IP = "127.0.0.1";
const BACKEND_PORT = "8000";
const ENDPOINT = "/users/paginated"; // ajustá al path real de tu backend
const URL = `http://${BACKEND_IP}:${BACKEND_PORT}${ENDPOINT}`;

// 3) Hooks (useState, useRef, useEffect)
const UsersListView: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef<boolean>(false);

  // 4) Funciones internas

  const getUsersPag = async () => {
    if (loadingRef.current) return;
    if (!hasMore) return;

    loadingRef.current = true;
    setError(null);

    try {
      const token = localStorage.getItem("token");

      const body = {
        cursor: nextCursor, // o pageNumber, etc.
        limit: 20,
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

      if (!data.success) {
        throw new Error(data.message || "Error al obtener usuarios");
      }

      const newItems = data.data.items || [];

      setUsers((prev) => [...prev, ...newItems]);
      setNextCursor(data.data.nextCursor);

      if (!data.data.nextCursor || newItems.length === 0) {
        setHasMore(false);
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Error desconocido");
      }
    } finally {
      loadingRef.current = false;
    }
  };

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;

    const nearBottom = scrollTop + clientHeight >= scrollHeight - 100; // margen de 100px

    if (nearBottom) {
      void getUsersPag();
    }
  };

  // 5) useEffect para cargar datos al montar
  useEffect(() => {
    void getUsersPag();
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
        <UsersDataView users={users} hasMore={hasMore && !error} />
      </div>
    </div>
  );
};

export default UsersListView;
