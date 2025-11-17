import { useState } from "react";
import { BASE_URL } from "../../../config/backend";

const NewsCreateView = () => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
    <div className="container mt-4">
      <h2>Crear Noticia</h2>

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
        <label className="form-label">Imagen (opcional)</label>
        <input className="form-control" type="file" onChange={handleFile} />
      </div>

      {preview && (
        <img
          src={preview}
          alt="preview"
          className="img-fluid mb-3"
          style={{ maxHeight: "200px", borderRadius: "10px" }}
        />
      )}

      <button
        className="btn btn-primary"
        onClick={handleSubmit}
        disabled={saving}
      >
        {saving ? "Publicando..." : "Publicar"}
      </button>
    </div>
  );
};

export default NewsCreateView;
