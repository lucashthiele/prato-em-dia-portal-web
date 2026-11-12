import { ApiError } from "../../../shared/api";
import { Alert, Button } from "../../../shared/ui";
import { useAcceptConsents, useConsents } from "../api/consents";
import { LEGAL_TEXTS } from "../lib/legal-texts";
import styles from "./ConsentPage.module.css";

export function ConsentPage() {
  const consents = useConsents();
  const accept = useAcceptConsents();
  const documents = consents.data ?? [];

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div>
          <h1 className={styles.heading}>Antes de continuar</h1>
          <p className={styles.subhead}>
            Leia os documentos abaixo. Você precisa aceitá-los para usar o portal.
          </p>
        </div>

        {consents.isPending ? (
          <p role="status" aria-busy="true" className={styles.subhead}>
            Carregando documentos…
          </p>
        ) : consents.isError ? (
          <Alert
            tone="danger"
            title="Não foi possível carregar os documentos"
            action={
              <Button size="sm" variant="outline" onClick={() => consents.refetch()}>
                Tentar de novo
              </Button>
            }
          >
            {consents.error instanceof ApiError && consents.error.isNetworkError
              ? "Não foi possível falar com o servidor."
              : "Tente novamente em instantes."}
          </Alert>
        ) : (
          <>
            {documents.map((document) => {
              const text = document.documentType ? LEGAL_TEXTS[document.documentType] : undefined;
              return (
                <section
                  key={document.documentType}
                  className={styles.document}
                  aria-label={text?.title ?? "Documento"}
                >
                  <h2 className={styles.title}>{text?.title ?? "Documento"}</h2>
                  {text?.sections.map((section) => (
                    <div key={section.heading}>
                      <h3 className={styles.section}>{section.heading}</h3>
                      <p className={styles.body}>{section.body}</p>
                    </div>
                  ))}
                </section>
              );
            })}

            {accept.isError ? (
              <Alert tone="danger" title="Não foi possível registrar o aceite">
                Tente novamente em instantes.
              </Alert>
            ) : null}

            <Button fullWidth loading={accept.isPending} onClick={() => accept.mutate(documents)}>
              Li e aceito os documentos
            </Button>
          </>
        )}
      </div>
    </main>
  );
}
