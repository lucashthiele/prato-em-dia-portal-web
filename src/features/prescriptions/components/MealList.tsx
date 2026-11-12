import type { PrescriptionVersion } from "../api/prescriptions";
import { useFoodNames, type FoodName } from "../api/foods";
import { formatQuantity, mealTypeLabel } from "../lib/labels";
import styles from "./MealList.module.css";

function FoodCell({ food }: { food: FoodName }) {
  if (food.state === "ready") return <>{food.name}</>;
  if (food.state === "error") return <span className={styles.muted}>Alimento indisponível</span>;
  return <span className={styles.skeleton} role="status" aria-label="Carregando alimento" />;
}

export function MealList({ version }: { version: PrescriptionVersion }) {
  const meals = [...(version.meals ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const foodName = useFoodNames(
    meals.flatMap((meal) =>
      (meal.items ?? []).flatMap((item) => [
        item.foodId,
        ...(item.substitutions ?? []).map((s) => s.foodId),
      ]),
    ),
  );

  if (meals.length === 0) {
    return <p className={styles.muted}>Esta versão ainda não tem refeições.</p>;
  }

  return (
    <ul className={styles.meals}>
      {meals.map((meal) => {
        const items = [...(meal.items ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        const name = meal.name ?? mealTypeLabel(meal.mealType) ?? "Refeição";
        const type = mealTypeLabel(meal.mealType);
        return (
          <li key={meal.id} className={styles.meal}>
            <div className={styles.head}>
              {meal.suggestedTime ? (
                <span className={styles.time}>{meal.suggestedTime.slice(0, 5)}</span>
              ) : null}
              <h4 className={styles.name}>{name}</h4>
              <span className={styles.muted}>
                {[
                  type !== name ? type : undefined,
                  items.length === 1 ? "1 item" : `${items.length} itens`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </div>
            {meal.notes ? <p className={styles.notes}>{meal.notes}</p> : null}
            {items.length === 0 ? (
              <p className={styles.notes}>Sem itens.</p>
            ) : (
              <div className={styles.wrap}>
                <table className={styles.table}>
                  <caption className={styles.srOnly}>Itens de {name}</caption>
                  <thead>
                    <tr>
                      <th scope="col">Alimento</th>
                      <th scope="col" className={styles.num}>
                        Quantidade
                      </th>
                      <th scope="col">Observações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.flatMap((item) => [
                      <tr key={item.id}>
                        <th scope="row" className={styles.food}>
                          <FoodCell food={foodName(item.foodId)} />
                        </th>
                        <td className={styles.num}>{formatQuantity(item.quantity, item.unit)}</td>
                        <td className={styles.muted}>{item.notes}</td>
                      </tr>,
                      ...(item.substitutions ?? []).map((sub) => (
                        <tr key={`${item.id}-${sub.id}`} className={styles.sub}>
                          <th scope="row" className={styles.subFood}>
                            <span className={styles.or}>ou</span>{" "}
                            <FoodCell food={foodName(sub.foodId)} />
                          </th>
                          <td className={styles.num}>{formatQuantity(sub.quantity, sub.unit)}</td>
                          <td className={styles.muted}>{sub.notes}</td>
                        </tr>
                      )),
                    ])}
                  </tbody>
                </table>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
