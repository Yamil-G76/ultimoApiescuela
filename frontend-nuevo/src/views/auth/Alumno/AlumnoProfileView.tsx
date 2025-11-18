// src/views/auth/Alumno/AlumnoProfileView.tsx
import React, { useEffect, useState } from "react";
import { BASE_URL } from "../../../config/backend";
import "../../../styles/profile.css";

interface UserProfile {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  dni?: string;
  type: string;
  avatar_url?: string | null;
}

const AlumnoProfileView: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --------------------------------------
  // Cargar datos del alumno
  // --------------------------------------
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setError(null);

        const rawUser = localStorage.getItem("user");
        if (!rawUser) {
          setError("No se encontró usuario en sesión.");
          setLoading(false);
          return;
        }

        const parsed = JSON.parse(rawUser) as UserProfile;
        const userId = parsed.id;

        if (!userId) {
          setError("No se encontró el ID del usuario.");
          setLoading(false);
          return;
        }

        const res = await fetch(`${BASE_URL}/users/${userId}`);
        if (!res.ok) {
          throw new Error(`Error HTTP: ${res.status}`);
        }

        const data = await res.json();
        const u = data.data as UserProfile;

        setUser(u);
        setFirstName(u.first_name || "");
        setLastName(u.last_name || "");
        setEmail(u.email || "");

        if (u.avatar_url) {
          setAvatarPreview(
            u.avatar_url.startsWith("http")
              ? u.avatar_url
              : `${BASE_URL}${u.avatar_url}`
          );
        }
      } catch (err) {
        console.error(err);
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Error desconocido cargando el perfil.");
        }
      } finally {
        setLoading(false);
      }
    };

    void loadProfile();
  }, []);

  // --------------------------------------
  // Manejo de avatar
  // --------------------------------------
  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
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

  // --------------------------------------
  // Guardar perfil
  // --------------------------------------
  const handleSaveProfile = async () => {
    if (!user) return;

    setSaving(true);
    setError(null);

    try {
      let avatarUrl = user.avatar_url ?? null;

      if (avatarFile) {
        avatarUrl = await uploadImage(avatarFile);
      }

      const res = await fetch(`${BASE_URL}/users/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email,
          avatar_url: avatarUrl,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error("Error actualizando perfil alumno:", errData);
        setError("No se pudo actualizar el perfil.");
        return;
      }

      const updated: UserProfile = {
        ...user,
        first_name: firstName,
        last_name: lastName,
        email,
        avatar_url: avatarUrl,
      };

      setUser(updated);
      localStorage.setItem("user", JSON.stringify(updated));

      alert("Perfil actualizado correctamente");
    } catch (err) {
      console.error(err);
      setError("Error guardando el perfil.");
    } finally {
      setSaving(false);
    }
  };

  // --------------------------------------
  // Render
  // --------------------------------------
  if (loading) {
    return (
      <div className="profile-page">
        <div className="list-message list-message--muted">
          Cargando perfil...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="profile-page">
        <div className="list-message list-message--muted">
          No se pudo cargar el perfil del alumno.
        </div>
      </div>
    );
  }

  const fullName =
    [firstName, lastName].filter(Boolean).join(" ") || user.username;

  return (
    <div className="profile-page">
      <header className="page-header page-header--profile">
        <div>
          <h2 className="page-header-title">Mi perfil</h2>
          <p className="page-header-subtitle">
            Revisá tus datos personales y foto de perfil.
          </p>
        </div>
      </header>

      {error && (
        <div className="alert-box alert-error" style={{ marginTop: 4 }}>
          {error}
        </div>
      )}

      <section className="profile-card">
        {/* Avatar */}
        <div className="profile-avatar-block">
          <div className="profile-avatar-wrapper">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt={fullName}
                className="profile-avatar-img"
              />
            ) : (
              <div className="profile-avatar-placeholder">
                <span>
                  {fullName
                    .split(" ")
                    .map((p) => p[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
              </div>
            )}
          </div>

          <div className="profile-avatar-actions">
            <label className="btn btn-outline profile-avatar-upload-btn">
              Elegir foto
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarFile}
                style={{ display: "none" }}
              />
            </label>
            <p className="profile-hint">
              Opcional. PNG o JPG, tamaño moderado.
            </p>
          </div>
        </div>

        {/* Datos */}
        <div className="profile-form">
          <div className="profile-form-row">
            <div className="profile-form-field">
              <label>Nombre</label>
              <input
                className="form-input"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>

            <div className="profile-form-field">
              <label>Apellido</label>
              <input
                className="form-input"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          <div className="profile-form-row">
            <div className="profile-form-field">
              <label>Email</label>
              <input
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="profile-form-field">
              <label>Usuario</label>
              <input className="form-input" value={user.username} disabled />
            </div>
          </div>

          <div className="profile-form-row">
            {user.dni && (
              <div className="profile-form-field">
                <label>DNI</label>
                <input className="form-input" value={user.dni} disabled />
              </div>
            )}
          </div>

          <div className="profile-form-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSaveProfile}
              disabled={saving}
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AlumnoProfileView;