import { Link } from "react-router";
import { MetricTile } from "../../../shared/ui";
import styles from "./HomeTiles.module.css";

interface HomeTilesProps {
  activePatients: number;
  accessProblems: number;
  /** Contagem derivada de uma página parcial da listagem. */
  partial: boolean;
}

export function HomeTiles({ activePatients, accessProblems, partial }: HomeTilesProps) {
  return (
    <div className={styles.grid}>
      <MetricTile label="Pacientes ativos" value={activePatients} />
      <MetricTile
        label="Acessos com problema"
        value={partial ? `${accessProblems}+` : accessProblems}
        hint="Envio pendente ou com falha"
      />
      {/* TODO(LUC-58): sem contagem de rascunhos no backend; o tile só leva à lista filtrada. */}
      <Link className={styles.link} to="/pacientes?filtro=rascunhos">
        <MetricTile label="Rascunhos em aberto" value="—" hint="Ver pacientes com rascunho" />
      </Link>
    </div>
  );
}
