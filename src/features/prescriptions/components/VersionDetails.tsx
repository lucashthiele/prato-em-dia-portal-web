import { useState } from "react";
import { Button } from "../../../shared/ui";
import type { PrescriptionVersion } from "../api/prescriptions";
import { MealList } from "./MealList";
import styles from "./VersionDetails.module.css";

/** Carrega as refeições (e os nomes dos alimentos) só quando abertas. */
export function VersionDetails({ version }: { version: PrescriptionVersion }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.details}>
      <Button variant="ghost" size="sm" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? "Ocultar refeições" : `Ver refeições da v${version.number}`}
      </Button>
      {open ? <MealList version={version} /> : null}
    </div>
  );
}
