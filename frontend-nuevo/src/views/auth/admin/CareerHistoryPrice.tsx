// src/views/auth/admin/CarerrPricesHistoriView.tsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BASE_URL } from "../../../config/backend";

// Estilos generales (botones / alertas / etc)
import "../../../styles/careers.css";
// Estilos específicos SOLO para historial de precios
import "../../../styles/career-prices.css";

interface PriceItem {
  id: number;
  monto: number;
  fecha_desde: string;
  created_at?: string | null;
}

interface PricesResponse {
  success?: boolean;
  message?: string;
  data?: {
    id_carrera: number;
    career_name: string;
    items: PriceItem[];
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
    has_next: boolean;
  };
}

const CareerPricesHistoryView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [careerName, setCareerName] = useState<string>("");
  const [items, setItems] = useState<PriceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatFecha = (value?: string | null) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
  };

  useEffect(() => {
    const loadPrices = async () => {
      if (!id) return;

      setLoading(true);
      setError(null);

      try {
        const body = {
          id_carrera: Number(id),
          page: 1,
          page_size: 50,
        };

        const res = await fetch(`${BASE_URL}/careers/prices/paginated`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          throw new Error(`Error HTTP: ${res.status}`);
        }

        const data = (await res.json()) as PricesResponse;

        if (!data.success || !data.data) {
          throw new Error(data.message || "No se pudo obtener el historial");
        }

        setCareerName(data.data.career_name);
        setItems(data.data.items || []);
      } catch (err) {
        console.error(err);
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Error desconocido al cargar el historial de precios");
        }
      } finally {
        setLoading(false);
      }
    };

    void loadPrices();
  }, [id]);

  return (
    <div className="prices-page">
      {/* HEADER PROPIO DEL HISTORIAL (card violeta) */}
      <header className="prices-header">
        <div>
          <h2 className="prices-header-title">Historial de precios</h2>
          <p className="prices-header-subtitle">
            Carrera: {careerName || "-"}
          </p>
        </div>

        <button
          type="button"
          className="prices-back-btn"
          onClick={() => navigate("/admin/careers")}
        >
          Volver a carreras
        </button>
      </header>

      {error && (
        <div className="alert-box alert-error">
          <ul className="alert-list">
            <li>{error}</li>
          </ul>
        </div>
      )}

      {/* SECCIÓN LISTADO */}
      <section className="prices-section">
        <div className="prices-section-header">
          <div>
            <h3 className="prices-section-title">Cambios registrados</h3>
            <p className="prices-section-subtitle">
              Valores ordenados del más reciente al más antiguo.
            </p>
          </div>

          <span className="prices-badge">Historial de montos</span>
        </div>

        <div className="prices-list-container">
          {loading ? (
            <div className="prices-message prices-message--muted">
              Cargando historial de precios...
            </div>
          ) : items.length === 0 ? (
            <div className="prices-message prices-message--muted">
              No hay registros de precios para esta carrera.
            </div>
          ) : (
            <table className="prices-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Monto</th>
                  <th>Vigente desde</th>
                  <th>Creado en</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p, index) => {
                  const esActual = index === 0; // el más reciente lo marcamos como "Actual"
                  return (
                    <tr key={p.id}>
                      <td>{p.id}</td>
                      <td>
                        ${p.monto}
                        {esActual && (
                          <span className="prices-pill-current">Actual</span>
                        )}
                      </td>
                      <td>{formatFecha(p.fecha_desde)}</td>
                      <td>{formatFecha(p.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
};

export default CareerPricesHistoryView;