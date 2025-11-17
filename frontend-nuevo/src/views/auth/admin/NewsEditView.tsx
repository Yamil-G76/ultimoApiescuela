import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BASE_URL } from "../../../config/backend";

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
      loadNews();
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
    return <div className="container mt-4">Cargando noticia...</div>;
  }

  return (
    <div className="container mt-4">
      <h2>Editar Noticia</h2>

      <div className="mb-3">
        <label className="form-label">Título</label>
        <input
          className="form-control"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="mb-3">
        <label className="form-label">Contenido</label>
        <textarea
          className="form-control"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
        />
      </div>

      <div className="mb-3">
        <label className="form-label">Imagen</label>

        {currentImageUrl && !preview && (
          <div className="mb-2">
            <span className="d-block mb-1">Imagen actual:</span>
            <img
              src={`${BASE_URL}${currentImageUrl}`}
              alt="actual"
              style={{ maxHeight: 150, borderRadius: 10 }}
            />
          </div>
        )}

        {preview && (
          <div className="mb-2">
            <span className="d-block mb-1">Nueva imagen:</span>
            <img
              src={preview}
              alt="nueva"
              style={{ maxHeight: 150, borderRadius: 10 }}
            />
          </div>
        )}

        <input className="form-control" type="file" onChange={handleFile} />
        <small className="text-muted">
          Si elegís una nueva imagen, reemplazará a la actual.
        </small>
      </div>

      <button
        className="btn btn-primary me-2"
        onClick={handleSubmit}
        disabled={saving}
      >
        {saving ? "Guardando..." : "Guardar cambios"}
      </button>

      <button
        className="btn btn-secondary"
        onClick={() => navigate("/admin/news")}
      >
        Cancelar
      </button>
    </div>
  );
};

export default NewsEditView;
