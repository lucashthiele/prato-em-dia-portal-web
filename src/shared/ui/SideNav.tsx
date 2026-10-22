import clsx from "clsx";
import { Link } from "react-router";
import { Icon, type IconName } from "./Icon";
import styles from "./SideNav.module.css";

export interface SideNavProps {
  logoSrc?: string;
  items: { id: string; label: string; icon: IconName; href: string }[];
  /** Id da área atual. */
  value: string;
  user?: { name: string; registry?: string };
  onLogout?: () => void;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join("");
}

export function SideNav({ logoSrc, items, value, user, onLogout }: SideNavProps) {
  return (
    <nav className={styles.sidenav} aria-label="Principal">
      <div className={styles.brand}>
        {logoSrc ? <img className={styles.mark} src={logoSrc} alt="" /> : null}
        <div>
          <div className={styles.name}>Prato em Dia</div>
          <div className={styles.sub}>Portal Pro Nutri</div>
        </div>
      </div>
      <ul className={styles.list}>
        {items.map((item) => {
          const selected = item.id === value;
          return (
            <li key={item.id}>
              <Link
                to={item.href}
                className={clsx(styles.item, selected && styles.selected)}
                aria-current={selected ? "page" : undefined}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      {user ? (
        <div className={styles.user}>
          <span className={styles.avatar} aria-hidden="true">
            {initials(user.name)}
          </span>
          <div className={styles.who}>
            <div className={styles.uname}>{user.name}</div>
            {user.registry ? <div className={styles.reg}>{user.registry}</div> : null}
          </div>
          <button type="button" className={styles.iconbtn} aria-label="Sair" onClick={onLogout}>
            <Icon name="logout" size={18} />
          </button>
        </div>
      ) : null}
    </nav>
  );
}
