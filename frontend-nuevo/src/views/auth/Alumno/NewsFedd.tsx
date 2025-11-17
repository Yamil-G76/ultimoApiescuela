import { useEffect, useState } from "react";
import { BASE_URL } from "../../../config/backend";

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

    loadNews();
  }, []);

  return (
    <div className="container mt-4">
      <h2 className="mb-3">Noticias</h2>

      {items.map((n) => (
        <div key={n.id} className="card p-3 mb-4">
          {n.image_url && (
            <img
              src={`${BASE_URL}${n.image_url}`}
              alt={n.title}
              className="img-fluid mb-3"
              style={{ borderRadius: "10px" }}
            />
          )}

          <h3 style={{ color: "#0057a8" }}>{n.title}</h3>
          <p>{n.content}</p>
          <small className="text-muted">
            {new Date(n.created_at).toLocaleString()}
          </small>
        </div>
      ))}
    </div>
  );
};

export default NewsFeedView;
