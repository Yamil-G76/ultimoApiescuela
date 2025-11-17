import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "../../../config/backend";

interface UserItem {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  dni?: string;
  email?: string;
  type: string; // "admin" | "alumno"
}

const UsersListView = () => {
  const [items, setItems] = useState<UserItem[]>([]);
  const [search, setSearch] = useState("");
  const [page] = useState(1); // para futuro paginado real
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/users/paginated`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          page,
          page_size: 50,
          search: search || null,
        }),
      });

      if (!res.ok) {
        console.error("Error cargando usuarios");
        return;
      }

      const data = await res.json();
      setItems(data.data.items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadUsers();
  };

  const handleCreate = () => {
    navigate("/admin/users/create");
  };

  const handleEdit = (id: number) => {
    navigate(`/admin/users/${id}/edit`);
  };

  const handleDelete = async (id: number) => {
    const ok = window.confirm("¿Seguro que querés eliminar este usuario?");
    if (!ok) return;

    const res = await fetch(`${BASE_URL}/users/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      console.error("Error eliminando usuario");
      alert("No se pudo eliminar el usuario");
      return;
    }

    setItems((prev) => prev.filter((u) => u.id !== id));
  };

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Alumnos / Usuarios</h2>
        <button className="btn btn-primary" onClick={handleCreate}>
          + Nuevo usuario
        </button>
      </div>

      <form className="mb-3" onSubmit={handleSearchSubmit}>
        <div className="input-group">
          <input
            className="form-control"
            placeholder="Buscar por usuario, nombre, DNI, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn btn-outline-secondary" type="submit">
            Buscar
          </button>
        </div>
      </form>

      {loading ? (
        <div>Cargando usuarios...</div>
      ) : (
        <table className="table table-striped table-hover">
          <thead>
            <tr>
              <th>ID</th>
              <th>Usuario</th>
              <th>Nombre</th>
              <th>DNI</th>
              <th>Email</th>
              <th>Rol</th>
              <th style={{ width: "160px" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((u) => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.username}</td>
                <td>
                  {u.first_name} {u.last_name}
                </td>
                <td>{u.dni}</td>
                <td>{u.email}</td>
                <td>{u.type}</td>
                <td>
                  <button
                    className="btn btn-sm btn-outline-primary me-2"
                    onClick={() => handleEdit(u.id)}
                  >
                    Editar
                  </button>
                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => handleDelete(u.id)}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}

            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center">
                  No se encontraron usuarios.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default UsersListView;
