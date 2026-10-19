/** Prato em Dia — Portal Pro Nutri. Global: window.PratoPortal (React 18 via window.React). */
import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes } from 'react';

export type IconName = 'home' | 'users' | 'user' | 'file' | 'check' | 'x' | 'swap' | 'clock' | 'mail' | 'alert' | 'plus' | 'search' | 'history' | 'logout' | 'chevron' | 'minus';
export interface IconProps { name: IconName; size?: number; label?: string; className?: string; }

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'tonal' | 'outline' | 'ghost' | 'danger';
  size?: 'md' | 'sm';
  icon?: IconName;
  loading?: boolean;
  children: ReactNode;
}

export type Status =
  | 'done' | 'skipped' | 'substituted' | 'none'
  | 'draft' | 'published' | 'archived'
  | 'active' | 'ended'
  | 'pending' | 'sent' | 'failed';
export interface StatusChipProps { status: Status; label?: string; className?: string; }

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string; hint?: string; error?: string; icon?: IconName; multiline?: boolean;
}

export interface TabsProps { items: { id: string; label: string; count?: number }[]; value: string; onChange?: (id: string) => void; label?: string; }

export interface SideNavProps {
  logoSrc?: string;
  items: { id: string; label: string; icon: IconName; href?: string }[];
  value: string;
  onChange?: (id: string) => void;
  user?: { name: string; registry?: string };
  onLogout?: () => void;
}

export interface PatientHeaderProps {
  name: string; email: string;
  linkStatus?: 'active' | 'ended';
  accessStatus?: 'pending' | 'sent' | 'failed';
  description?: ReactNode; actions?: ReactNode;
}

export interface MetricTileProps { label: string; value: ReactNode; unit?: string; hint?: string; }

export interface MealRow { time: string; meal: string; items?: string; kcal: number | string; status?: 'done' | 'skipped' | 'substituted' | 'none'; }
export interface MealTableProps { rows: MealRow[]; caption?: string; }

export interface Version { number: number; summary: string; date: string; author?: string; status: 'draft' | 'published' | 'archived'; current?: boolean; }
export interface VersionHistoryProps { versions: Version[]; }

export type PlanningPolicy = 'RESTRICTED' | 'SUBSTITUTIONS_ONLY' | 'FREE';
export interface PolicyPickerProps { value: PlanningPolicy; onChange?: (v: PlanningPolicy) => void; name?: string; legend?: string; }

export interface WeekSummaryProps { title: string; subtitle?: string; counts: { planned: number; done: number; substituted: number; skipped: number; none: number }; }

export interface AlertProps { tone?: 'info' | 'success' | 'warm' | 'danger'; title?: string; action?: ReactNode; children: ReactNode; }

export interface EmptyStateProps { title: string; icon?: IconName; action?: ReactNode; children?: ReactNode; }

export interface ConfirmDialogProps {
  title: string; children: ReactNode; confirmLabel: string; cancelLabel?: string;
  tone?: 'primary' | 'danger'; loading?: boolean; open?: boolean; inline?: boolean;
  onConfirm: () => void; onCancel: () => void;
}

export interface SaveStatusProps { state: 'saving' | 'saved' | 'error'; label?: string; }
