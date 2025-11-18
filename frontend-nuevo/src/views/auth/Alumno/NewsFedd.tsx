// src/views/auth/Alumno/NewsFedd.tsx  (o el path que estés usando)
import { useEffect, useState } from "react";
import { BASE_URL } from "../../../config/backend";
import "../../../styles/news.css";

interface NewsItem {
  id: number;
  title: string;
  content: string;
  image_url?: string;
  created_at: string;
}

const NewsFeedView = () => {
  const [items, setItems] = useState<NewsItem[]>([]);

  useEffect(() => {
    const loadNews = async () => {
      const res = await fetch(`${BASE_URL}/news/paginated`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ page: 1, page_size: 10 }),
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

  return (
    <div className="news-feed-page">
      {/* Header tipo card, consistente con el resto */}
      <header className="page-header page-header--news-feed">
        <div>
          <h2 className="page-header-title">Noticias</h2>
          <p className="page-header-subtitle">
            Novedades y comunicaciones de la institución para vos.
          </p>
        </div>
      </header>

      {/* Listado de noticias en cards */}
      <section className="news-feed-list">
        {items.length === 0 ? (
          <div className="news-feed-message news-feed-message--muted">
            Todavía no hay noticias publicadas.
          </div>
        ) : (
          items.map((n) => (
            <article key={n.id} className="news-feed-card">
              {n.image_url && (
                <div className="news-feed-card-image-wrapper">
                  <img
                    src={`${BASE_URL}${n.image_url}`}
                    alt={n.title}
                    className="news-feed-card-image"
                  />
                </div>
              )}

              <div className="news-feed-card-content">
                <div className="news-feed-card-header">
                  <h3 className="news-feed-card-title">{n.title}</h3>
                  <span className="news-feed-date-pill">
                    {new Date(n.created_at).toLocaleString()}
                  </span>
                </div>

                <p className="news-feed-card-text">{n.content}</p>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
};

export default NewsFeedView;