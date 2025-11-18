// src/views/auth/admin/NewsEditView.tsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BASE_URL } from "../../../config/backend";
import "../../../styles/news.css";

interface NewsData {
  id: number;
  title: string;
  content: string;
  image_url?: string;
}

const NewsEditView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Cargar datos de la noticia
  useEffect(() => {
    const loadNews = async () => {
      try {
        const res = await fetch(`${BASE_URL}/news/${id}`);
        if (!res.ok) {
          console.error("Error obteniendo noticia");
          return;
        }

        const data = await res.json();
        const n: NewsData = data.data;

        setTitle(n.title);
        setContent(n.content);
        setCurrentImageUrl(n.image_url || null);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      void loadNews();
    }
  }, [id]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const uploadImage = async (file: File): Promise<string> => {
    const form = new FormData();
    form.append("file", file);

    const res = await fetch(`${BASE_URL}/upload`, {
      method: "POST",
      body: form,
    });

    if (!res.ok) {
      throw new Error("Error subiendo imagen");
    }

    const data = await res.json();
    return data.url as string;
  };

  const handleSubmit = async () => {
    if (!id) return;

    setSaving(true);
    try {
      let finalImageUrl: string | null = currentImageUrl;

      // Si subió una nueva imagen, la subimos y reemplazamos
      if (imageFile) {
        finalImageUrl = await uploadImage(imageFile);
      }

      const res = await fetch(`${BASE_URL}/news/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          content,
          image_url: finalImageUrl,
        }),
      });

      if (!res.ok) {
        console.error("Error actualizando noticia");
        alert("No se pudo actualizar la noticia");
        return;
      }

      alert("Noticia actualizada correctamente");
      navigate("/admin/news");
    } catch (err) {
      console.error(err);
      alert("Error actualizando la noticia");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="news-page">
        <div className="news-message news-message--muted">
          Cargando noticia...
        </div>
      </div>
    );
  }

  return (
    <div className="news-page">
      {/* Header */}
      <header className="page-header">
        <div>
          <h2 className="page-header-title">Editar noticia</h2>
          <p className="page-header-subtitle">
            Actualizá el contenido y la imagen de la noticia seleccionada.
          </p>
        </div>

        <button
          className="btn btn-outline"
          type="button"
          onClick={() => navigate("/admin/news")}
        >
          Volver a noticias
        </button>
      </header>

      {/* Card formulario */}
      <section className="news-form-section">
        <div className="news-form-card">
          <div className="news-form-card-header">
            <span className="news-form-chip">Edición</span>
            <span className="news-form-caption">
              Modificá solo lo necesario. Podés cambiar título, contenido e
              imagen.
            </span>
          </div>

          <div className="news-form-grid">
            <div className="news-form-field news-form-field--full">
              <label className="news-form-label">Título</label>
              <input
                className="news-form-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="news-form-field news-form-field--full">
              <label className="news-form-label">Contenido</label>
              <textarea
                className="news-form-input news-form-textarea"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
              />
            </div>

            <div className="news-form-field news-form-field--full">
              <label className="news-form-label">Imagen</label>

              {currentImageUrl && !preview && (
                <div className="news-form-current-image">
                  <span className="news-form-hint">Imagen actual:</span>
                  <img
                    src={`${BASE_URL}${currentImageUrl}`}
                    alt="actual"
                  />
                </div>
              )}

              {preview && (
                <div className="news-form-current-image">
                  <span className="news-form-hint">Nueva imagen:</span>
                  <img src={preview} alt="nueva" />
                </div>
              )}

              <input
                className="news-form-input"
                type="file"
                onChange={handleFile}
              />
              <p className="news-form-hint">
                Si elegís una nueva imagen, reemplazará a la actual.
              </p>
            </div>
          </div>

          <div className="news-form-actions">
            <button
              className="btn news-form-btn-secondary"
              type="button"
              onClick={() => navigate("/admin/news")}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              className="btn news-form-btn-primary"
              onClick={handleSubmit}
              disabled={saving}
              type="button"
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default NewsEditView;