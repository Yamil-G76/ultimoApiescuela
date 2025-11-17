// src/views/auth/admin/CareerCreateView.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "../../../config/backend";

interface CareerPayload {
  name: string;
  costo_mensual: number;
  duracion_meses: number;
  inicio_cursado?: string;
}

const CareerCreateView = () => {
  const [name, setName] = useState("");
  const [costoMensual, setCostoMensual] = useState<string>("");
  const [duracionMeses, setDuracionMeses] = useState<string>("");
  const [inicioCursado, setInicioCursado] = useState<string>("");

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const navigate = useNavigate();

  const validate = (): boolean => {
    const newErrors: string[] = [];

    if (!name.trim()) {
      newErrors.push("El nombre de la carrera es obligatorio");
    } else if (name.trim().length > 50) {
      newErrors.push("El nombre no puede superar los 50 caracteres");
    }

    const costo = parseInt(costoMensual, 10);
    if (Number.isNaN(costo)) {
      newErrors.push("El costo mensual debe ser un número");
    } else if (costo <= 0) {
      newErrors.push("El costo mensual debe ser mayor a 0");
    }

    const dur = parseInt(duracionMeses, 10);
    if (Number.isNaN(dur)) {
      newErrors.push("La duración en meses debe ser un número");
    } else if (dur <= 0) {
      newErrors.push("La duración en meses debe ser mayor a 0");
    }

    if (inicioCursado && !/^\d{4}-\d{2}-\d{2}$/.test(inicioCursado)) {
      newErrors.push("La fecha de inicio debe tener formato YYYY-MM-DD");
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      const payload: CareerPayload = {
        name,
        costo_mensual: parseInt(costoMensual, 10),
        duracion_meses: parseInt(duracionMeses, 10),
      };

      if (inicioCursado) {
        payload.inicio_cursado = inicioCursado; // YYYY-MM-DD
      }

      const res = await fetch(`${BASE_URL}/careers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error("Error creando carrera:", errData);
        if ((errData as { detail?: unknown }).detail) {
          setErrors([String((errData as { detail?: unknown }).detail)]);
        } else {
          setErrors(["No se pudo crear la carrera"]);
        }
        return;
      }

      alert("Carrera creada correctamente");
      navigate("/admin/careers");
    } catch (err) {
      console.error(err);
      setErrors(["Error creando la carrera"]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mt-4">
      <h2>Nueva carrera</h2>

      {errors.length > 0 && (
        <div className="alert alert-danger py-2">
          <ul className="mb-0">
            {errors.map((e, idx) => (
              <li key={idx}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="row">
        <div className="col-md-6">
          {/* Nombre */}
          <div className="mb-3">
            <label className="form-label">Nombre de la carrera</label>
            <input
              className="form-control"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Costo mensual */}
          <div className="mb-3">
            <label className="form-label">Costo mensual</label>
            <input
              type="number"
              className="form-control"
              value={costoMensual}
              onChange={(e) => setCostoMensual(e.target.value)}
            />
          </div>
        </div>

        <div className="col-md-6">
          {/* Duración en meses */}
          <div className="mb-3">
            <label className="form-label">Duración (meses)</label>
            <input
              type="number"
              className="form-control"
              value={duracionMeses}
              onChange={(e) => setDuracionMeses(e.target.value)}
            />
          </div>

          {/* Fecha de inicio (opcional) */}
          <div className="mb-3">
            <label className="form-label">Inicio de cursado (opcional)</label>
            <input
              type="date"
              className="form-control"
              value={inicioCursado}
              onChange={(e) => setInicioCursado(e.target.value)}
            />
          </div>
        </div>
      </div>

      <button
        className="btn btn-primary me-2"
        onClick={handleSubmit}
        disabled={saving}
      >
        {saving ? "Guardando..." : "Guardar"}
      </button>

      <button
        className="btn btn-secondary"
        onClick={() => navigate("/admin/careers")}
      >
        Cancelar
      </button>
    </div>
  );
};

export default CareerCreateView;
