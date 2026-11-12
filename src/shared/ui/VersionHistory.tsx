import clsx from "clsx";
import type { ReactNode } from "react";
import styles from "./VersionHistory.module.css";
import { StatusChip } from "./StatusChip";

export interface Version {
  number: number;
  summary: string;
  date: string;
  author?: string;
  status: "draft" | "published" | "archived";
  /** Marca a versão vigente; só uma. */
  current?: boolean;
  /** Conteúdo extra abaixo da linha, por exemplo as refeições da versão. */
  details?: ReactNode;
}

export interface VersionHistoryProps {
  versions: Version[];
}

/** Da mais recente para a mais antiga; o rascunho fica no topo. */
export function VersionHistory({ versions }: VersionHistoryProps) {
  return (
    <ol className={styles.versions}>
      {versions.map((version) => (
        <li
          key={version.number}
          className={clsx(styles.version, version.current && styles.current)}
        >
          <div className={styles.row}>
            <span className={styles.num}>v{version.number}</span>
            <div className={styles.body}>
              <div className={styles.title}>{version.summary}</div>
              <div className={styles.meta}>
                {version.date}
                {version.author ? ` · ${version.author}` : ""}
              </div>
            </div>
            <StatusChip status={version.status} />
          </div>
          {version.details}
        </li>
      ))}
    </ol>
  );
}
