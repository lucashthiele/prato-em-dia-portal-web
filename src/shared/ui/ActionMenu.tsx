import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { Icon, type IconName } from "./Icon";
import styles from "./ActionMenu.module.css";

export interface ActionMenuProps {
  /** Nome acessível do botão que abre o menu. */
  label: string;
  items: { label: string; icon?: IconName; tone?: "danger"; onSelect: () => void }[];
}

/** Menu de mais ações; ações destrutivas ainda passam por `ConfirmDialog`. */
export function ActionMenu({ label, items }: ActionMenuProps) {
  return (
    <Dropdown.Root>
      <Dropdown.Trigger className={styles.trigger} aria-label={label}>
        <span className={styles.dots} aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content className={styles.menu} align="end" sideOffset={6}>
          {items.map((item) => (
            <Dropdown.Item
              key={item.label}
              className={item.tone === "danger" ? styles.danger : styles.item}
              onSelect={item.onSelect}
            >
              {item.icon ? <Icon name={item.icon} size={18} /> : null}
              {item.label}
            </Dropdown.Item>
          ))}
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}
