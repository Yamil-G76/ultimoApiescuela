// src/views/auth/admin/NewsCreateView.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "../../../config/backend";
import "../../../styles/news.css";

const NewsCreateView = () => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const navigate = useNavigate();

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
    return data.url as string; // ej: "/static/news_images/archivo.jpg"
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      let imageUrl: string | null = null;

      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const rawUser = localStorage.getItem("user");
      if (!rawUser) {
        alert("No se encontró usuario en sesión");
        return;
      }

      const parsed = JSON.parse(rawUser);
      const adminId = parsed.id;

      const res = await fetch(`${BASE_URL}/news`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          content,
          id_admin: adminId,
          image_url: imageUrl,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error("Error creando noticia:", errData);
        alert("Error creando la noticia");
        return;
      }

      alert("Noticia publicada correctamente");

      setTitle("");
      setContent("");
      setImageFile(null);
      setPreview(null);
    } catch (err) {
      console.error(err);
      alert("Error publicando la noticia");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="news-page">
      {/* Header tipo card */}
      <header className="page-header">
        <div>
          <h2 className="page-header-title">Crear noticia</h2>
          <p className="page-header-subtitle">
            Publicá una nueva novedad para que la vean los alumnos en el sistema.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-outline"
          onClick={() => navigate("/admin/news")}
        >
          Volver a noticias
        </button>
      </header>

      {/* Card formulario */}
      <section className="news-form-section">
        <div className="news-form-card">
          <div className="news-form-card-header">
            <span className="news-form-chip">Nueva noticia</span>
            <span className="news-form-caption">
              Completá el título, el contenido y subí una imagen opcional antes
              de publicar.
            </span>
          </div>

          <div className="news-form-grid">
            <div className="news-form-field news-form-field--full">
              <label className="news-form-label">Título</label>
              <input
                className="news-form-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Se abre la inscripción al nuevo curso..."
              />
            </div>

            <div className="news-form-field news-form-field--full">
              <label className="news-form-label">Contenido</label>
              <textarea
                className="news-form-input news-form-textarea"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                placeholder="Escribí el detalle de la noticia..."
              />
            </div>

            <div className="news-form-field news-form-field--full">
              <label className="news-form-label">Imagen (opcional)</label>
              <input
                className="news-form-input"
                type="file"
                onChange={handleFile}
              />
              <p className="news-form-hint">
                Formatos recomendados: JPG o PNG. La imagen se mostrará junto a
                la noticia.
              </p>
            </div>

            {preview && (
              <div className="news-form-preview">
                <img src={preview} alt="preview" />
              </div>
            )}
          </div>

          <div className="news-form-actions">
            <button
              type="button"
              className="btn news-form-btn-secondary"
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
              {saving ? "Publicando..." : "Publicar noticia"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default NewsCreateView;