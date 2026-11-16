import { useState } from "react";
import { Button, TextField } from "../../../shared/ui";
import { useMakeEntry } from "../api/catalog";
import { MEAL_CATEGORIES, type DraftItem, type DraftMeal } from "../lib/editor-model";
import { EntryFields } from "./EntryFields";
import { FoodPicker } from "./FoodPicker";
import styles from "./Editor.module.css";

interface Props {
  meal: DraftMeal;
  invalid: Set<string>;
  onChange: (meal: DraftMeal) => void;
}

function ItemEditor({
  item,
  invalid,
  onChange,
  onRemove,
}: {
  item: DraftItem;
  invalid: Set<string>;
  onChange: (item: DraftItem) => void;
  onRemove: () => void;
}) {
  const makeEntry = useMakeEntry();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const count = item.substitutions.length;
  return (
    <li className={styles.item}>
      <EntryFields
        entry={item}
        invalid={invalid.has(item.key)}
        onChange={(entry) => onChange({ ...item, ...entry })}
        onRemove={onRemove}
        removeLabel={`Remover ${item.food.name}`}
      >
        <Button
          variant="outline"
          size="sm"
          aria-expanded={open}
          aria-label={`Substituições (${count}) de ${item.food.name}`}
          onClick={() => setOpen(!open)}
        >
          {`Substituições (${count})`}
        </Button>
      </EntryFields>
      {open ? (
        <div className={styles.subs}>
          {item.substitutions.map((sub, index) => (
            <div key={sub.key}>
              <EntryFields
                entry={sub}
                invalid={invalid.has(sub.key)}
                withNotes
                removeLabel={`Remover substituição ${sub.food.name}`}
                onChange={(entry) =>
                  onChange({
                    ...item,
                    substitutions: item.substitutions.map((s, i) => (i === index ? entry : s)),
                  })
                }
                onRemove={() =>
                  onChange({
                    ...item,
                    substitutions: item.substitutions.filter((_, i) => i !== index),
                  })
                }
              />
            </div>
          ))}
          {adding ? (
            <FoodPicker
              label={`Alimento substituto de ${item.food.name}`}
              onCancel={() => setAdding(false)}
              onPick={async (food) => {
                const entry = await makeEntry(food);
                onChange({ ...item, substitutions: [...item.substitutions, entry] });
                setAdding(false);
              }}
            />
          ) : (
            <div>
              <Button
                variant="tonal"
                size="sm"
                icon="plus"
                aria-label={`Adicionar substituição a ${item.food.name}`}
                onClick={() => setAdding(true)}
              >
                Adicionar substituição
              </Button>
            </div>
          )}
        </div>
      ) : null}
    </li>
  );
}

export function MealEditor({ meal, invalid, onChange }: Props) {
  const makeEntry = useMakeEntry();
  const [adding, setAdding] = useState(false);
  const label = MEAL_CATEGORIES.find((c) => c.type === meal.type)?.label ?? "";

  return (
    <fieldset className={styles.card}>
      <legend className={styles.legend}>{label}</legend>
      <label className={styles.include}>
        <input
          type="checkbox"
          checked={meal.included}
          onChange={(event) => onChange({ ...meal, included: event.target.checked })}
        />
        Incluir esta refeição
      </label>
      {meal.included ? (
        <>
          <div className={styles.fields}>
            <TextField
              label="Nome da refeição"
              value={meal.name}
              onChange={(event) => onChange({ ...meal, name: event.target.value })}
            />
            <TextField
              label="Horário sugerido (opcional)"
              type="time"
              value={meal.time}
              onChange={(event) => onChange({ ...meal, time: event.target.value })}
            />
            <TextField
              label="Observação (opcional)"
              value={meal.notes}
              onChange={(event) => onChange({ ...meal, notes: event.target.value })}
            />
          </div>
          {meal.items.length === 0 ? (
            <p className={styles.hint}>
              Sem itens. Inclua pelo menos um item para poder publicar a versão.
            </p>
          ) : (
            <ul className={styles.items} aria-label={`Itens de ${label}`}>
              {meal.items.map((item, index) => (
                <ItemEditor
                  key={item.key}
                  item={item}
                  invalid={invalid}
                  onChange={(next) =>
                    onChange({
                      ...meal,
                      items: meal.items.map((it, i) => (i === index ? next : it)),
                    })
                  }
                  onRemove={() =>
                    onChange({ ...meal, items: meal.items.filter((_, i) => i !== index) })
                  }
                />
              ))}
            </ul>
          )}
          {adding ? (
            <FoodPicker
              label={`Buscar alimento para ${label}`}
              onCancel={() => setAdding(false)}
              onPick={async (food) => {
                const entry = await makeEntry(food);
                onChange({ ...meal, items: [...meal.items, { ...entry, substitutions: [] }] });
                setAdding(false);
              }}
            />
          ) : (
            <div>
              <Button
                variant="outline"
                icon="plus"
                aria-label={`Adicionar item a ${label}`}
                onClick={() => setAdding(true)}
              >
                Adicionar item
              </Button>
            </div>
          )}
        </>
      ) : null}
    </fieldset>
  );
}
