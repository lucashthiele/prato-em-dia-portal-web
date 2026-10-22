import { MetricTile } from "../../../shared/ui";
import styles from "./HomeTiles.module.css";

interface HomeTilesProps {
  activePatients: number;
  /** Paciente ainda não fez o cadastro: métrica neutra, sem tom de alerta. */
  pendingAccess: number;
  /** Único indicador de problema. */
  failedAccess: number;
  openDrafts: number;
}

export function HomeTiles({
  activePatients,
  pendingAccess,
  failedAccess,
  openDrafts,
}: HomeTilesProps) {
  return (
    <div className={styles.grid}>
      <MetricTile label="Pacientes ativos" value={activePatients} />
      <MetricTile
        label="Aguardando cadastro"
        value={pendingAccess}
        hint="Ainda não criaram a conta no app"
      />
      <MetricTile
        label="Acessos com falha"
        value={failedAccess}
        hint="Falha no envio das instruções"
        tone={failedAccess > 0 ? "danger" : "neutral"}
      />
      <MetricTile label="Rascunhos em aberto" value={openDrafts} />
    </div>
  );
}
