import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "../../../config/backend";

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

    loadNews();
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

  return (
    <div className="container mt-4">
      <h2>Noticias Publicadas</h2>

      {items.map((n) => {
        const isExpanded = expandedId === n.id;

        return (
          <div
            key={n.id}
            className="card mb-3 p-3"
            style={{ borderRadius: "10px" }}
          >
            {/* Vista compacta */}
            <div className="d-flex align-items-center gap-3">
              {n.image_url && (
                <img
                  src={`${BASE_URL}${n.image_url}`}
                  alt={n.title}
                  style={{
                    width: 80,
                    height: 80,
                    objectFit: "cover",
                    borderRadius: 10,
                    flexShrink: 0,
                  }}
                />
              )}

              <div className="flex-grow-1">
                <h5 className="mb-1">{n.title}</h5>
                <small className="text-muted d-block mb-2">
                  {new Date(n.created_at).toLocaleString()}
                </small>

                <div className="d-flex gap-2">
                  <button
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => toggleExpand(n.id)}
                  >
                    {isExpanded ? "Cerrar detalle" : "Ver detalle"}
                  </button>

                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => handleEdit(n.id)}
                    >
                      Editar
                    </button>

                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => handleDelete(n.id)}
                    >
                      Eliminar
                    </button>
                </div>
              </div>
            </div>

            {/* Detalle expandido */}
            {isExpanded && (
              <div className="mt-3">
                <hr />
                {n.image_url && (
                  <img
                    src={`${BASE_URL}${n.image_url}`}
                    alt={n.title}
                    className="img-fluid mb-3"
                    style={{ borderRadius: 10 }}
                  />
                )}

                <h4 className="mb-2">{n.title}</h4>
                <p>{n.content}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default NewsListView;
