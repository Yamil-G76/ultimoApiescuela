import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "../../../config/backend";
import "../../../styles/news.css";

interface NewsItem {
  id: number;
  title: string;
  content: string;
  image_url?: string;
  created_at: string;
}

const NewsListView = () => {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadNews = async () => {
      const res = await fetch(`${BASE_URL}/news/paginated`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ page: 1, page_size: 50 }),
      });

      if (!res.ok) {
        console.error("Error cargando noticias");
        return;
      }

      const data = await res.json();
      setItems(data.data.items);
    };

    void loadNews();
  }, []);

  const toggleExpand = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleEdit = (id: number) => {
    navigate(`/admin/news/${id}/edit`);
  };

  const handleDelete = async (id: number) => {
    const ok = window.confirm("¿Seguro que querés eliminar esta noticia?");
    if (!ok) return;

    const res = await fetch(`${BASE_URL}/news/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      console.error("Error eliminando noticia");
      alert("No se pudo eliminar la noticia");
      return;
    }

    setItems((prev) => prev.filter((n) => n.id !== id));
    if (expandedId === id) {
      setExpandedId(null);
    }
  };

  const handleCreate = () => {
    navigate("/admin/news/create");
  };

  // -----------------------------
  // Render
  // -----------------------------
  return (
    <div className="news-page">
      {/* Header principal en card (como carreras/usuarios) */}
      <header className="page-header">
        <div>
          <h2 className="page-header-title">Noticias</h2>
          <p className="page-header-subtitle">
            Administrá las noticias que se muestran a los alumnos en el sistema.
          </p>
        </div>
      </header>

      {/* Card de listado con botón adentro a la derecha */}
      <section className="news-list-section">
        <div className="news-list-card">
          <div className="news-list-card-header">
            <div>
              <h3 className="news-list-title">Noticias publicadas</h3>
              <p className="news-list-subtitle">
                Visualizá, editá y eliminá las noticias cargadas. Expandí para
                ver el detalle.
              </p>
            </div>

            <button
              type="button"
              className="btn news-list-cta-btn"
              onClick={handleCreate}
            >
              + Nueva noticia
            </button>
          </div>

          <div className="news-table-wrapper">
            {items.length === 0 ? (
              <div className="news-message news-message--muted">
                No hay noticias cargadas.
              </div>
            ) : (
              <table className="news-table">
                <thead>
                  <tr>
                    <th style={{ width: "60px" }}>ID</th>
                    <th>Título</th>
                    <th style={{ width: "180px" }}>Fecha</th>
                    <th style={{ width: "120px" }}>Imagen</th>
                    <th style={{ width: "260px" }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((n) => {
                    const isExpanded = expandedId === n.id;

                    return [
                      // Fila principal
                      <tr
                        key={n.id}
                        className={isExpanded ? "news-row news-row--expanded" : "news-row"}
                      >
                        <td>{n.id}</td>
                        <td className="news-cell-title">
                          <div className="news-cell-title-main">{n.title}</div>
                          <div className="news-cell-title-preview">
                            {n.content.length > 80
                              ? `${n.content.slice(0, 80)}...`
                              : n.content}
                          </div>
                        </td>
                        <td>{new Date(n.created_at).toLocaleString()}</td>
                        <td>
                          {n.image_url ? (
                            <img
                              src={`${BASE_URL}${n.image_url}`}
                              alt={n.title}
                              className="news-table-thumb"
                            />
                          ) : (
                            <span className="news-table-no-image">Sin imagen</span>
                          )}
                        </td>
                        <td>
                          <div className="news-table-actions">
                            <button
                              className="btn news-btn-detail"
                              type="button"
                              onClick={() => toggleExpand(n.id)}
                            >
                              {isExpanded ? "Cerrar detalle" : "Ver detalle"}
                            </button>
                            <button
                              className="btn news-btn-edit"
                              type="button"
                              onClick={() => handleEdit(n.id)}
                            >
                              Editar
                            </button>
                            <button
                              className="btn news-btn-delete"
                              type="button"
                              onClick={() => handleDelete(n.id)}
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>,

                      // Fila de detalle expandido
                      isExpanded && (
                        <tr key={`${n.id}-detail`} className="news-row-detail">
                          <td colSpan={5}>
                            <div className="news-row-detail-inner">
                              {n.image_url && (
                                <img
                                  src={`${BASE_URL}${n.image_url}`}
                                  alt={n.title}
                                  className="news-row-detail-image"
                                />
                              )}

                              <div className="news-row-detail-text">
                                <h4 className="news-row-detail-title">{n.title}</h4>
                                <p className="news-row-detail-content">
                                  {n.content}
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ),
                    ];
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default NewsListView;