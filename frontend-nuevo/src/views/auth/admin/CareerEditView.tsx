import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BASE_URL } from "../../../config/backend";

interface CareerData {
  id: number;
  name: string;
  costo_mensual: number;
  duracion_meses: number;
  inicio_cursado: string;
}

interface CareerUpdatePayload {
  name: string;
  costo_mensual: number;
  duracion_meses: number;
  inicio_cursado?: string;
}

const CareerEditView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [career, setCareer] = useState<CareerData | null>(null);

  const [name, setName] = useState("");
  const [costoMensual, setCostoMensual] = useState<string>("");
  const [duracionMeses, setDuracionMeses] = useState<string>("");
  const [inicioCursado, setInicioCursado] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

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

  useEffect(() => {
    const loadCareer = async () => {
      try {
        const res = await fetch(`${BASE_URL}/careers/${id}`);
        if (!res.ok) {
          console.error("Error obteniendo carrera");
          setLoading(false);
          return;
        }

        const data = await res.json();
        const c: CareerData = data.data;

        setCareer(c);
        setName(c.name);
        setCostoMensual(String(c.costo_mensual));
        setDuracionMeses(String(c.duracion_meses));

        if (c.inicio_cursado) {
          const d = new Date(c.inicio_cursado);
          if (!Number.isNaN(d.getTime())) {
            const iso = d.toISOString().slice(0, 10);
            setInicioCursado(iso);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      void loadCareer();
    }
  }, [id]);

  const handleSubmit = async () => {
    if (!id) return;
    if (!validate()) return;

    setSaving(true);
    try {
      const payload: CareerUpdatePayload = {
        name,
        costo_mensual: parseInt(costoMensual, 10),
        duracion_meses: parseInt(duracionMeses, 10),
      };

      if (inicioCursado) {
        payload.inicio_cursado = inicioCursado;
      }

      const res = await fetch(`${BASE_URL}/careers/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error("Error actualizando carrera:", errData);
        if ((errData as { detail?: unknown }).detail) {
          setErrors([String((errData as { detail?: unknown }).detail)]);
        } else {
          setErrors(["No se pudo actualizar la carrera"]);
        }
        return;
      }

      alert("Carrera actualizada correctamente");
      navigate("/admin/careers");
    } catch (err) {
      console.error(err);
      setErrors(["Error actualizando la carrera"]);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="container mt-4">Cargando carrera...</div>;
  }

  if (!career) {
    return <div className="container mt-4">Carrera no encontrada</div>;
  }

  const handleViewHistory = () => {
    if (!id) return;
    navigate(`/admin/careers/${id}/prices`);
  };

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">Editar carrera</h2>
        <button className="btn btn-outline-secondary" onClick={handleViewHistory}>
          Ver historial de precios
        </button>
      </div>

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
          {/* Duración */}
          <div className="mb-3">
            <label className="form-label">Duración (meses)</label>
            <input
              type="number"
              className="form-control"
              value={duracionMeses}
              onChange={(e) => setDuracionMeses(e.target.value)}
            />
          </div>

          {/* Inicio cursado */}
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
        {saving ? "Guardando..." : "Guardar cambios"}
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

export default CareerEditView;
