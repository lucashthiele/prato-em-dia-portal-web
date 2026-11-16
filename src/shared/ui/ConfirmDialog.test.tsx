import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "./ConfirmDialog";

function setup(extra: Partial<Parameters<typeof ConfirmDialog>[0]> = {}) {
  const handlers = { onConfirm: vi.fn(), onCancel: vi.fn(), onSecondary: vi.fn() };
  render(
    <ConfirmDialog
      open
      title="Desativar Ana Souza?"
      confirmLabel="Desativar"
      {...handlers}
      {...extra}
    >
      <p>Ana não poderá mais entrar no portal.</p>
    </ConfirmDialog>,
  );
  return handlers;
}

describe("ConfirmDialog", () => {
  it("tem dois botões por padrão", async () => {
    const { onConfirm, onCancel } = setup();
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual([
      "Cancelar",
      "Desativar",
    ]);
    await userEvent.click(screen.getByRole("button", { name: "Desativar" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("com ação secundária tem três botões, na ordem cancelar, secundária e confirmar", async () => {
    const { onConfirm, onCancel, onSecondary } = setup({
      tone: "danger",
      secondaryLabel: "Somente desativar",
      confirmLabel: "Desativar e encerrar vínculos",
      confirmHint: "Os vínculos com todos os pacientes de Ana são encerrados.",
    });
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual([
      "Cancelar",
      "Somente desativar",
      "Desativar e encerrar vínculos",
    ]);

    await userEvent.click(screen.getByRole("button", { name: "Somente desativar" }));
    expect(onSecondary).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Desativar e encerrar vínculos" }));
    expect(onConfirm).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("liga o apoio à ação de confirmar", () => {
    setup({ secondaryLabel: "Somente desativar", confirmHint: "Apoio da terceira ação." });
    expect(screen.getByRole("button", { name: "Desativar" })).toHaveAccessibleDescription(
      "Apoio da terceira ação.",
    );
  });

  it("não mostra o apoio nem o terceiro botão quando não pedidos", () => {
    setup();
    expect(screen.queryByText("Apoio da terceira ação.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Desativar" })).not.toHaveAttribute(
      "aria-describedby",
    );
  });
});
