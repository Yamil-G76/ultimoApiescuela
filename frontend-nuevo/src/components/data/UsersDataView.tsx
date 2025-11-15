// src/components/data/UsersDataView.tsx
import React from "react";

type User = {
  id: number;
  username: string;
  first_name?: string | null;
  last_name?: string | null;
  type: string;
};

type UsersDataViewProps = {
  users: User[];
  hasMore: boolean;
};

const UsersDataView: React.FC<UsersDataViewProps> = ({ users, hasMore }) => {
  return (
    <div className="table-responsive">
      <table className="table table-sm table-hover align-middle">
        <thead className="table-light">
          <tr>
            <th>ID</th>
            <th>Usuario</th>
            <th>Nombre</th>
            <th>Rol</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 && (
            <tr>
              <td colSpan={4} className="text-center text-muted py-3">
                No hay usuarios registrados.
              </td>
            </tr>
          )}
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.id}</td>
              <td>{u.username}</td>
              <td>
                {u.first_name} {u.last_name}
              </td>
              <td>{u.type}</td>
            </tr>
          ))}
          {hasMore && (
            <tr>
              <td colSpan={4} className="text-center text-muted py-2">
                Cargando más...
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default UsersDataView;
