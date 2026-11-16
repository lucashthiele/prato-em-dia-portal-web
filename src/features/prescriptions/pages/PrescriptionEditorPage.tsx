import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ApiError } from "../../../shared/api";
import { Alert, Button, ConfirmDialog, EmptyState, SaveStatus } from "../../../shared/ui";
import { fetchFood, fetchPortions } from "../api/catalog";
import {
  useDiscardVersion,
  useSaveVersion,
  usePatientCalendar,
  usePublishVersion,
} from "../api/mutations";
import { usePatientPrescriptions, type PrescriptionVersion } from "../api/prescriptions";
import { MealEditor } from "../components/MealEditor";
import { TargetsEditor } from "../components/TargetsEditor";
import {
  draftFromVersion,
  hasSubstitutions,
  includedMealsWithoutItems,
  toRequest,
  validate,
  type Draft,
  type FoodRef,
  type PortionRef,
} from "../lib/editor-model";
import { discardText } from "../lib/discard-text";
import { planningModeLabel } from "../lib/labels";
import { nextPlanStart, publishText } from "../lib/publish-text";
import { useUnsavedGuard } from "../lib/useUnsavedGuard";
import styles from "../components/Editor.module.css";

const clock = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });

/** Busca nomes e porções dos alimentos já salvos na versão, para montar o rascunho local. */
async function hydrate(
  version: PrescriptionVersion,
  queryClient: ReturnType<typeof useQueryClient>,
): Promise<Draft> {
  const ids = [
    ...new Set(
      (version.meals ?? []).flatMap((meal) =>
        (meal.items ?? []).flatMap((item) => [
          item.foodId,
          ...(item.substitutions ?? []).map((s) => s.foodId),
        ]),
      ),
    ),
  ].filter((id): id is string => Boolean(id));
  const foods = new Map<string, FoodRef>();
  const portions = new Map<string, PortionRef[]>();
  await Promise.all(
    ids.map(async (id) => {
      const [food, list] = await Promise.allSettled([
        fetchFood(queryClient, id),
        fetchPortions(queryClient, id),
      ]);
      foods.set(
        id,
        food.status === "fulfilled" ? food.value : { id, name: "Alimento indisponível" },
      );
      portions.set(id, list.status === "fulfilled" ? list.value : []);
    }),
  );
  return draftFromVersion(version, {
    food: (id) => (id && foods.get(id)) || { id: id ?? "", name: "Alimento indisponível" },
    portions: (id) => (id ? (portions.get(id) ?? []) : []),
  });
}

interface Props {
  /** Cabeçalho do paciente (obrigatório em toda tela de paciente), montado pelo roteador. */
  header?: ReactNode;
}

export function PrescriptionEditorPage({ header }: Props) {
  const { patientId = "", versionId = "" } = useParams();
  return (
    <EditorLoader key={versionId} patientId={patientId} versionId={versionId} header={header} />
  );
}

function EditorLoader({
  patientId,
  versionId,
  header,
}: Props & { patientId: string; versionId: string }) {
  const queryClient = useQueryClient();
  const query = usePatientPrescriptions(patientId);
  const [initial, setInitial] = useState<{ draft: Draft; generation: number } | null>(null);
  const started = useRef(false);

  const prescription = query.data?.find((p) => p.versions?.some((v) => v.id === versionId));
  const version = prescription?.versions?.find((v) => v.id === versionId);

  useEffect(() => {
    if (!version || version.status !== "DRAFT" || started.current) return;
    started.current = true;
    void hydrate(version, queryClient).then((draft) => setInitial({ draft, generation: 0 }));
  }, [version, queryClient]);

  const back = (
    <nav aria-label="Navegação estrutural">
      <Link className={styles.back} to={`/pacientes/${patientId}`}>
        Voltar para o paciente
      </Link>
    </nav>
  );

  if (query.isPending) {
    return (
      <p role="status" aria-busy="true" className={styles.muted}>
        Carregando rascunho…
      </p>
    );
  }
  if (query.isError) {
    return (
      <div className={styles.page}>
        {back}
        <Alert
          tone="danger"
          title="Não foi possível carregar o rascunho"
          action={
            <Button size="sm" variant="outline" onClick={() => query.refetch()}>
              Tentar de novo
            </Button>
          }
        >
          {query.error instanceof ApiError && query.error.isNetworkError
            ? "Não foi possível falar com o servidor."
            : "Tente novamente em instantes."}
        </Alert>
      </div>
    );
  }
  if (!prescription || !version) {
    return (
      <div className={styles.page}>
        {back}
        <EmptyState title="Rascunho não encontrado" icon="file">
          Esta versão não existe ou não é mais sua.
        </EmptyState>
      </div>
    );
  }
  if (version.status !== "DRAFT") {
    return (
      <div className={styles.page}>
        {header}
        {back}
        <EmptyState title="Esta versão não é mais um rascunho" icon="file">
          Só rascunhos podem ser editados. Volte ao paciente para ver a versão atual.
        </EmptyState>
      </div>
    );
  }
  if (!initial) {
    return (
      <p role="status" aria-busy="true" className={styles.muted}>
        Carregando rascunho…
      </p>
    );
  }

  async function reload() {
    const { data } = await query.refetch();
    const fresh = data?.flatMap((p) => p.versions ?? []).find((v) => v.id === versionId);
    if (fresh?.status === "DRAFT") {
      const draft = await hydrate(fresh, queryClient);
      setInitial((current) => ({ draft, generation: (current?.generation ?? 0) + 1 }));
    }
  }

  return (
    <EditorForm
      key={initial.generation}
      patientId={patientId}
      versionId={versionId}
      versionNumber={version.number}
      versions={prescription.versions ?? []}
      mode={prescription.planningMode}
      initial={initial.draft}
      header={header}
      back={back}
      onReload={reload}
    />
  );
}

function EditorForm({
  patientId,
  versionId,
  versionNumber,
  versions,
  mode,
  initial,
  header,
  back,
  onReload,
}: {
  patientId: string;
  versionId: string;
  versionNumber: number | undefined;
  versions: PrescriptionVersion[];
  mode: string | undefined;
  initial: Draft;
  header?: ReactNode;
  back: ReactNode;
  onReload: () => Promise<void>;
}) {
  const navigate = useNavigate();
  const [draft, setDraft] = useState(initial);
  const [saved, setSaved] = useState(() => JSON.stringify(initial));
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [conflict, setConflict] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  // Descartar já é a decisão de perder as alterações: a saída não passa pelo aviso do Q8.
  const discarded = useRef(false);
  const discard = useDiscardVersion(patientId);
  const save = useSaveVersion(patientId, versionId);
  const publish = usePublishVersion(patientId);
  const calendar = usePatientCalendar(patientId, confirmPublish);

  const dirty = JSON.stringify(draft) !== saved;
  const blocker = useUnsavedGuard(dirty, discarded);

  const problems = validate(draft);
  const withoutItems = includedMealsWithoutItems(draft);
  const anyIncluded = draft.meals.some((meal) => meal.included);

  const publishBlock = dirty
    ? "Salve o rascunho para poder publicar."
    : withoutItems.length > 0
      ? `Inclua pelo menos um item em ${withoutItems.map((m) => m.name || "refeição").join(", ")} ou desmarque a refeição para poder publicar.`
      : !anyIncluded
        ? "Inclua pelo menos uma refeição com itens para poder publicar."
        : null;

  function onSave() {
    if (problems.entries.size > 0 || problems.targets.size > 0) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    const snapshot = JSON.stringify(draft);
    save.mutate(toRequest(draft), {
      onSuccess: () => {
        setSaved(snapshot);
        setSavedAt(new Date());
        setConflict(false);
      },
      onError: (error) => setConflict(error instanceof ApiError && error.status === 409),
    });
  }

  function onPublish() {
    publish.mutate(versionId, {
      onSuccess: () => navigate(`/pacientes/${patientId}`),
      onSettled: () => setConfirmPublish(false),
    });
  }

  function onDiscard() {
    discard.mutate(versionId, {
      onSuccess: () => {
        discarded.current = true;
        navigate(`/pacientes/${patientId}`);
      },
      onSettled: () => setConfirmDiscard(false),
    });
  }

  const discardConflict = discard.error instanceof ApiError && discard.error.status === 409;
  const publishConflict = publish.error instanceof ApiError && publish.error.status === 409;
  const status = save.isPending
    ? "saving"
    : save.isError && !conflict
      ? "error"
      : dirty
        ? "unsaved"
        : "saved";
  const statusLabel =
    status === "saved" && savedAt ? `Salvo às ${clock.format(savedAt)}` : undefined;

  const reloadAction = (
    <Button
      size="sm"
      variant="outline"
      onClick={() => {
        setConflict(false);
        publish.reset();
        discard.reset();
        void onReload();
      }}
    >
      Recarregar
    </Button>
  );

  return (
    <div className={styles.page}>
      {header}
      {back}

      <div className={styles.bar}>
        <h2 className={styles.heading}>Versão {versionNumber} · Rascunho</h2>
        <div className={styles.actions}>
          {dirty || save.isPending || savedAt || save.isError ? (
            <SaveStatus state={status} label={statusLabel} />
          ) : null}
          <Button
            variant="outline"
            onClick={() => {
              discard.reset();
              setConfirmDiscard(true);
            }}
          >
            Descartar rascunho
          </Button>
          <Button variant="outline" loading={save.isPending} onClick={onSave}>
            Salvar rascunho
          </Button>
          <Button
            disabled={publishBlock !== null}
            aria-describedby={publishBlock ? "publish-block" : undefined}
            onClick={() => {
              publish.reset();
              setConfirmPublish(true);
            }}
          >
            Publicar versão
          </Button>
        </div>
      </div>
      {publishBlock ? (
        <p id="publish-block" className={styles.hint}>
          {publishBlock}
        </p>
      ) : null}

      {conflict ? (
        <Alert tone="danger" title="Rascunho desatualizado" action={reloadAction}>
          Este rascunho foi publicado em outra aba. Recarregue para ver a versão atual.
        </Alert>
      ) : save.isError ? (
        <Alert tone="danger" title="Não foi possível salvar o rascunho">
          Suas alterações continuam aqui. Tente salvar de novo em instantes.
        </Alert>
      ) : null}
      {showErrors && (problems.entries.size > 0 || problems.targets.size > 0) ? (
        <Alert tone="danger" title="Revise os campos destacados">
          Corrija as quantidades e metas marcadas antes de salvar.
        </Alert>
      ) : null}
      {publishConflict ? (
        <Alert tone="danger" title="Não foi possível publicar" action={reloadAction}>
          Esta prescrição mudou em outra aba. Recarregue antes de publicar.
        </Alert>
      ) : publish.isError ? (
        <Alert tone="danger" title="Não foi possível publicar a versão">
          {publish.error instanceof ApiError && publish.error.status !== 0 && publish.error.message
            ? publish.error.message
            : "Tente novamente em instantes."}
        </Alert>
      ) : null}
      {discardConflict ? (
        <Alert tone="danger" title="Não foi possível descartar o rascunho" action={reloadAction}>
          Este rascunho mudou em outra aba e não pode mais ser descartado. Recarregue para ver a
          versão atual.
        </Alert>
      ) : discard.isError ? (
        <Alert tone="danger" title="Não foi possível descartar o rascunho">
          Tente novamente em instantes.
        </Alert>
      ) : null}
      {mode !== "SUBSTITUTIONS_ONLY" && hasSubstitutions(draft) ? (
        <Alert tone="warm">
          Com o modo {planningModeLabel(mode)?.title ?? "atual"}, o paciente não vê as
          substituições. Altere o modo na aba Prescrição.
        </Alert>
      ) : null}

      <ul className={styles.meals} aria-label="Refeições">
        {draft.meals.map((meal, index) => (
          <li key={meal.type}>
            <MealEditor
              meal={meal}
              invalid={showErrors ? problems.entries : new Set()}
              onChange={(next) =>
                setDraft({ ...draft, meals: draft.meals.map((m, i) => (i === index ? next : m)) })
              }
            />
          </li>
        ))}
      </ul>

      <TargetsEditor
        targets={draft.targets}
        invalid={showErrors ? problems.targets : new Set()}
        onChange={(targets) => setDraft({ ...draft, targets })}
      />

      <ConfirmDialog
        open={confirmPublish}
        title={`Publicar a versão ${versionNumber}?`}
        confirmLabel="Publicar versão"
        loading={publish.isPending || calendar.isPending}
        onConfirm={onPublish}
        onCancel={() => setConfirmPublish(false)}
      >
        <p>
          {publishText(versionNumber, calendar.isSuccess ? nextPlanStart(calendar.data) : null)}
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmDiscard}
        title={`Descartar o rascunho da versão ${versionNumber}?`}
        confirmLabel="Descartar rascunho"
        tone="danger"
        loading={discard.isPending}
        onConfirm={onDiscard}
        onCancel={() => setConfirmDiscard(false)}
      >
        <p>{discardText(versions)}</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={blocker.state === "blocked"}
        title="Sair sem salvar?"
        cancelLabel="Continuar editando"
        confirmLabel="Sair sem salvar"
        tone="danger"
        onConfirm={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
      >
        <p>As alterações deste rascunho ainda não foram salvas e serão perdidas.</p>
      </ConfirmDialog>
    </div>
  );
}
