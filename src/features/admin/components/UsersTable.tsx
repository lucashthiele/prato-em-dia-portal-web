import { Link } from "react-router";
import { StatusChip } from "../../../shared/ui";
import type { AdminUser } from "../api/users";
import { accessEmailStatus, accountChip, roleLabel } from "../lib/labels";
import styles from "./Table.module.css";

const date = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

export function UsersTable({ users }: { users: AdminUser[] }) {
  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Nome</th>
            <th scope="col">Papel</th>
            <th scope="col">Situação</th>
            <th scope="col">Acesso ao app</th>
            <th scope="col">Criado em</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const access = accessEmailStatus(user.accessEmail?.status);
            const chip = accountChip(user.status);
            return (
              <tr key={user.id}>
                <td>
                  <Link className={styles.name} to={`/admin/usuarios/${user.id}`}>
                    {user.fullName ?? user.email}
                  </Link>
                  <div className={styles.muted}>{user.email}</div>
                </td>
                <td>{roleLabel(user.role)}</td>
                <td>
                  <StatusChip status={chip.status} label={chip.label} />
                </td>
                <td>{access ? <StatusChip status={access} /> : null}</td>
                <td className={`${styles.muted} ${styles.nowrap}`}>
                  {user.createdAt ? date.format(new Date(user.createdAt)) : ""}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
