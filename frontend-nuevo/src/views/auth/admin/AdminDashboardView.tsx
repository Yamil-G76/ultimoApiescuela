// src/views/auth/admin/AdminDashboardView.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "../../../config/backend";

// Tipos genéricos para paginados simples (solo usamos total_items)
interface SimplePaginatedData<T> {
  items: T[];
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
}

interface SimplePaginatedResponse<T> {
  success?: boolean;
  message?: string;
  data?: SimplePaginatedData<T>;
}

// Pagos para la tabla de “últimos pagos”
interface PaymentListItem {
  id: number;
  numero_cuota: number;
  monto: number;
  fecha_pago?: string | null;
  adelantado: boolean;
  anulado: boolean;
  alumno?: {
    id: number;
    username: string;
    first_name?: string;
    last_name?: string;
    dni?: string;
  } | null;
  career?: {
    id: number;
    name: string;
  } | null;
}

// Noticias para la tabla de “últimas noticias”
interface NewsItem {
  id: number;
  title: string;
  created_at?: string | null;
}

// Estadísticas agregadas
interface DashboardStats {
  totalAlumnos: number;
  totalCarreras: number;
  totalPagos: number;
  totalNoticias: number;
}

const AdminDashboardView: React.FC = () => {
  const navigate = useNavigate();

  const [stats, setStats] = useState<DashboardStats>({
    totalAlumnos: 0,
    totalCarreras: 0,
    totalPagos: 0,
    totalNoticias: 0,
  });

  const [lastPayments, setLastPayments] = useState<PaymentListItem[]>([]);
  const [lastNews, setLastNews] = useState<NewsItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatFecha = (value?: string | null) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
  };

  const getNombreAlumno = (p: PaymentListItem) => {
    const a = p.alumno;
    if (!a) return "-";
    const nombre = [a.first_name, a.last_name].filter(Boolean).join(" ");
    return nombre || a.username || "-";
  };

  const getNombreCarrera = (p: PaymentListItem) => {
    return p.career?.name ?? "-";
  };

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem("token");
        const headers: HeadersInit = {
          "Content-Type": "application/json",
        };
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        // 1) Total alumnos (users/paginated)
        const usersBody = {
          page: 1,
          page_size: 1,
          search: null as string | null,
        };

        const usersRes = await fetch(`${BASE_URL}/users/paginated`, {
          method: "POST",
          headers,
          body: JSON.stringify(usersBody),
        });
        if (!usersRes.ok) {
          throw new Error(`Error users/paginated: ${usersRes.status}`);
        }
        const usersData = (await usersRes.json()) as SimplePaginatedResponse<unknown>;

        // 2) Total carreras
        const careersBody = {
          page: 1,
          page_size: 1,
          search: null as string | null,
        };
        const careersRes = await fetch(`${BASE_URL}/careers/paginated`, {
          method: "POST",
          headers,
          body: JSON.stringify(careersBody),
        });
        if (!careersRes.ok) {
          throw new Error(`Error careers/paginated: ${careersRes.status}`);
        }
        const careersData = (await careersRes.json()) as SimplePaginatedResponse<unknown>;

        // 3) Total pagos + últimos pagos
        const paymentsBody = {
          page: 1,
          page_size: 5, // últimos 5
          include_anulados: false,
        };
        const paymentsRes = await fetch(`${BASE_URL}/payments/paginated`, {
          method: "POST",
          headers,
          body: JSON.stringify(paymentsBody),
        });
        if (!paymentsRes.ok) {
          throw new Error(`Error payments/paginated: ${paymentsRes.status}`);
        }
        const paymentsData = (await paymentsRes.json()) as SimplePaginatedResponse<PaymentListItem>;

        // 4) Total noticias + últimas noticias
        const newsBody = {
          page: 1,
          page_size: 5,
        };
        const newsRes = await fetch(`${BASE_URL}/news/paginated`, {
          method: "POST",
          headers,
          body: JSON.stringify(newsBody),
        });
        if (!newsRes.ok) {
          throw new Error(`Error news/paginated: ${newsRes.status}`);
        }
        const newsData = (await newsRes.json()) as SimplePaginatedResponse<NewsItem>;

        setStats({
          totalAlumnos: usersData.data?.total_items ?? 0,
          totalCarreras: careersData.data?.total_items ?? 0,
          totalPagos: paymentsData.data?.total_items ?? 0,
          totalNoticias: newsData.data?.total_items ?? 0,
        });

        setLastPayments(paymentsData.data?.items ?? []);
        setLastNews(newsData.data?.items ?? []);
      } catch (err) {
        console.error(err);
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Error desconocido al cargar el dashboard");
        }
      } finally {
        setLoading(false);
      }
    };

    void loadDashboard();
  }, []);

  return (
    <div className="container mt-4">
      <h2>Dashboard administrador</h2>
      <p className="text-muted">
        Resumen general de alumnos, carreras, pagos y noticias.
      </p>

      {error && (
        <div className="alert alert-danger py-2">
          {error}
        </div>
      )}

      {loading ? (
        <div>Cargando datos del dashboard...</div>
      ) : (
        <>
          {/* Tarjetas resumen */}
          <div className="row g-3 mb-4">
            <div className="col-md-3">
              <div className="card shadow-sm">
                <div className="card-body">
                  <h6 className="card-subtitle mb-1 text-muted">Alumnos</h6>
                  <h3 className="card-title">{stats.totalAlumnos}</h3>
                  <button
                    className="btn btn-sm btn-outline-primary mt-2"
                    onClick={() => navigate("/admin/users")}
                  >
                    Ver alumnos
                  </button>
                </div>
              </div>
            </div>

            <div className="col-md-3">
              <div className="card shadow-sm">
                <div className="card-body">
                  <h6 className="card-subtitle mb-1 text-muted">Carreras</h6>
                  <h3 className="card-title">{stats.totalCarreras}</h3>
                  <button
                    className="btn btn-sm btn-outline-primary mt-2"
                    onClick={() => navigate("/admin/careers")}
                  >
                    Ver carreras
                  </button>
                </div>
              </div>
            </div>

            <div className="col-md-3">
              <div className="card shadow-sm">
                <div className="card-body">
                  <h6 className="card-subtitle mb-1 text-muted">Pagos</h6>
                  <h3 className="card-title">{stats.totalPagos}</h3>
                  <button
                    className="btn btn-sm btn-outline-primary mt-2"
                    onClick={() => navigate("/admin/payments")}
                  >
                    Ver pagos
                  </button>
                </div>
              </div>
            </div>

            <div className="col-md-3">
              <div className="card shadow-sm">
                <div className="card-body">
                  <h6 className="card-subtitle mb-1 text-muted">Noticias</h6>
                  <h3 className="card-title">{stats.totalNoticias}</h3>
                  <button
                    className="btn btn-sm btn-outline-primary mt-2"
                    onClick={() => navigate("/admin/news")}
                  >
                    Ver noticias
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Últimos pagos + últimas noticias */}
          <div className="row g-3">
            {/* Últimos pagos */}
            <div className="col-lg-7">
              <div className="card shadow-sm h-100">
                <div className="card-body">
                  <h5 className="card-title">Últimos pagos registrados</h5>
                  <small className="text-muted d-block mb-2">
                    Ordenados del más reciente al más antiguo.
                  </small>

                  {lastPayments.length === 0 ? (
                    <p className="text-muted mb-0">
                      Todavía no hay pagos registrados.
                    </p>
                  ) : (
                    <div
                      style={{
                        maxHeight: "320px",
                        overflowY: "auto",
                      }}
                    >
                      <table className="table table-sm table-hover mb-0">
                        <thead>
                          <tr>
                            <th>Alumno</th>
                            <th>Carrera</th>
                            <th>Cuota</th>
                            <th>Monto</th>
                            <th>Fecha</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lastPayments.map((p) => (
                            <tr key={p.id}>
                              <td>{getNombreAlumno(p)}</td>
                              <td>{getNombreCarrera(p)}</td>
                              <td>{p.numero_cuota}</td>
                              <td>${p.monto}</td>
                              <td>{formatFecha(p.fecha_pago || null)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Últimas noticias */}
            <div className="col-lg-5">
              <div className="card shadow-sm h-100">
                <div className="card-body">
                  <h5 className="card-title">Últimas noticias</h5>
                  <small className="text-muted d-block mb-2">
                    Lo más reciente publicado para los alumnos.
                  </small>

                  {lastNews.length === 0 ? (
                    <p className="text-muted mb-0">
                      Todavía no hay noticias publicadas.
                    </p>
                  ) : (
                    <ul className="list-group list-group-flush">
                      {lastNews.map((n) => (
                        <li
                          key={n.id}
                          className="list-group-item d-flex flex-column"
                        >
                          <strong>{n.title}</strong>
                          <small className="text-muted">
                            {formatFecha(n.created_at || null)}
                          </small>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboardView;
