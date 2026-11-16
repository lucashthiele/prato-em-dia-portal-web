import { StatusChip } from "../../../shared/ui";
import type { FoodName } from "../../prescriptions";
import { formatQuantity } from "../../prescriptions";
import type { Execution, WeeklyPlan } from "../api/tracking";
import { MEAL_TYPE_LABEL, type MealType } from "../lib/labels";
import type { Cell } from "../lib/week";
import styles from "./CategoryBlock.module.css";

type PlannedMeal = NonNullable<WeeklyPlan["meals"]>[number];
type Foods = (id: string | undefined) => FoodName;

function FoodLabel({ food }: { food: FoodName }) {
  if (food.state === "ready") return <>{food.name}</>;
  if (food.state === "error") return <span className={styles.muted}>Alimento indisponível</span>;
  return <span className={styles.muted}>Carregando alimento…</span>;
}

interface CategoryBlockProps {
  type: MealType;
  cell: Cell;
  planned: PlannedMeal[];
  executions: Execution[];
  foodName: Foods;
}

/** Uma categoria do dia: o planejado de um lado e o registrado do outro. */
export function CategoryBlock({ type, cell, planned, executions, foodName }: CategoryBlockProps) {
  const plannedItems = planned
    .flatMap((meal) => meal.items ?? [])
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const loggedItems = executions.flatMap((execution) => execution.items ?? []);
  const titleId = `category-${type}`;

  return (
    <section className={styles.block} aria-labelledby={titleId}>
      <header className={styles.head}>
        <h3 id={titleId} className={styles.title}>
          {MEAL_TYPE_LABEL[type]}
        </h3>
        {cell.kind === "state" ? (
          <span className={styles.chips}>
            <StatusChip status={cell.state} />
            {cell.substituted ? <StatusChip status="substituted" /> : null}
          </span>
        ) : cell.kind === "unplanned" ? (
          <span className={styles.muted}>Sem refeição planejada</span>
        ) : null}
      </header>
      <div className={styles.columns}>
        <div>
          <h4 className={styles.label}>Planejado</h4>
          {plannedItems.length === 0 ? (
            <p className={styles.muted}>Nada planejado.</p>
          ) : (
            <ul className={styles.list}>
              {plannedItems.map((item) => (
                <li key={item.id}>
                  <FoodLabel food={foodName(item.foodId)} />
                  <span className={styles.qty}> · {formatQuantity(item.quantity, item.unit)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h4 className={styles.label}>Registrado</h4>
          {loggedItems.length === 0 ? (
            <p className={styles.muted}>Nada registrado.</p>
          ) : (
            <ul className={styles.list}>
              {loggedItems.map((item) => (
                <li key={item.id}>
                  <FoodLabel food={foodName(item.foodId)} />
                  <span className={styles.qty}> · {formatQuantity(item.quantity, item.unit)}</span>
                  {item.allowedSubstitutionId ? (
                    <span className={styles.mark}>
                      <StatusChip status="substituted" />
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
