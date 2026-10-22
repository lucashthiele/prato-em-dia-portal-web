import { EmptyState } from "../shared/ui";

// Marcador temporário das áreas ainda sem tela; sai com o ticket de cada uma.
export function ComingSoon({ title }: { title: string }) {
  return <EmptyState title={title}>Esta área chega em breve.</EmptyState>;
}
