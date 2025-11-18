// src/views/auth/admin/AdminDashboardView.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "../../../config/backend";
import "../../../styles/dashboard.css";

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
  content?: string | null;
  body?: string | null;
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

  const getNewsSnippet = (n: NewsItem, maxLength = 90) => {
    const raw = (n.content || n.body || "").trim();
    if (!raw) return "Sin detalle cargado";
    if (raw.length <= maxLength) return raw;
    return raw.slice(0, maxLength).trimEnd() + "…";
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

        // 1) Total alumnos
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
        const usersData =
          (await usersRes.json()) as SimplePaginatedResponse<unknown>;

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
        const careersData =
          (await careersRes.json()) as SimplePaginatedResponse<unknown>;

        // 3) Total pagos + últimos pagos
        const paymentsBody = {
          page: 1,
          page_size: 5,
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
        const paymentsData =
          (await paymentsRes.json()) as SimplePaginatedResponse<PaymentListItem>;

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
        const newsData =
          (await newsRes.json()) as SimplePaginatedResponse<NewsItem>;

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
    <div className="dashboard-page">
      {/* Encabezado */}
      <header className="dashboard-header">
        <h2>Dashboard administrador</h2>
        <p>Resumen general de alumnos, carreras, pagos y noticias.</p>
      </header>

      {error && <div className="dashboard-error">{error}</div>}

      {loading ? (
        <div className="dashboard-loading">Cargando datos del dashboard...</div>
      ) : (
        <>
          {/* TOP: tarjetas + panel últimos pagos (misma estructura que pagos registrados) */}
          <section className="dashboard-top">
            {/* Columna izquierda: tarjetas resumen más compactas y centradas */}
            <div className="dashboard-column-left">
              <article className="dashboard-card dashboard-card--alumnos">
                <h3 className="dashboard-card-title">Alumnos</h3>
                <p className="dashboard-card-value">{stats.totalAlumnos}</p>
                <button
                  className="dashboard-card-btn"
                  onClick={() => navigate("/admin/users")}
                  type="button"
                >
                  Ver alumnos
                </button>
              </article>

              <article className="dashboard-card dashboard-card--carreras">
                <h3 className="dashboard-card-title">Carreras</h3>
                <p className="dashboard-card-value">{stats.totalCarreras}</p>
                <button
                  className="dashboard-card-btn"
                  onClick={() => navigate("/admin/careers")}
                  type="button"
                >
                  Ver carreras
                </button>
              </article>
            </div>

            {/* Derecha: panel de “Últimos pagos realizados” con card + tabla scrolleable */}
            <div className="dashboard-panel dashboard-panel--mini-payments">
              <div className="dashboard-panel-header">
                <div>
                  <h3 className="dashboard-panel-title">
                    Últimos pagos realizados
                  </h3>
                  <p className="dashboard-panel-subtitle">
                    Pagos más recientes registrados en el sistema.
                  </p>
                </div>
                <button
                  type="button"
                  className="dashboard-panel-link"
                  onClick={() => navigate("/admin/payments")}
                >
                  Ver pagos
                </button>
              </div>

              {lastPayments.length === 0 ? (
                <p className="dashboard-empty-text dashboard-panel-message">
                  Todavía no hay pagos registrados.
                </p>
              ) : (
                <div className="dashboard-table-wrapper dashboard-table-wrapper--mini">
                  <table className="dashboard-table">
                    <thead>
                      <tr>
                        <th>Alumno</th>
                        <th>Carrera</th>
                        <th>Cuota</th>
                        <th>Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lastPayments.slice(0, 6).map((pago) => (
                        <tr key={pago.id}>
                          <td>{getNombreAlumno(pago)}</td>
                          <td>{getNombreCarrera(pago)}</td>
                          <td>{pago.numero_cuota}</td>
                          <td>${pago.monto.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {/* Sección: Últimas noticias y novedades (misma lógica de card+tabla que pagos) */}
          <section className="dashboard-section dashboard-news-section">
            <div className="dashboard-panel dashboard-panel--news">
              <div className="dashboard-panel-header">
                <div>
                  <h3 className="dashboard-panel-title">
                    Últimas noticias y novedades
                  </h3>
                  <p className="dashboard-panel-subtitle">
                    Noticias recientes publicadas en el sistema (total:{" "}
                    {stats.totalNoticias}).
                  </p>
                </div>
                <button
                  type="button"
                  className="dashboard-panel-link dashboard-panel-link--violet"
                  onClick={() => navigate("/admin/news")}
                >
                  Ver noticias
                </button>
              </div>

              {lastNews.length === 0 ? (
                <p className="dashboard-empty-text dashboard-panel-message">
                  Todavía no hay noticias publicadas.
                </p>
              ) : (
                <div className="dashboard-table-wrapper dashboard-table-wrapper--news">
                  <table className="dashboard-table dashboard-table--news">
                    <thead>
                      <tr>
                        <th>Título</th>
                        <th>Detalle</th>
                        <th>Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lastNews.map((n) => (
                        <tr key={n.id}>
                          <td>{n.title}</td>
                          <td className="dashboard-news-detail-cell">
                            {getNewsSnippet(n)}
                          </td>
                          <td>{formatFecha(n.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default AdminDashboardView;