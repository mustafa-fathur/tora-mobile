import {
  ArrowLeftRight,
  CalendarDays,
  ChartColumn,
  ChartPie,
  Coins,
  House,
  Layers,
  PiggyBank,
  Repeat,
  ShieldCheck,
  Tags,
  Target,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';

import type { NavIcon } from '@/lib/nav';

// Lucide icons (generic, open source), mostly the same as the web's sidebar.
export const NAV_ICONS: Record<NavIcon, LucideIcon> = {
  home: House,
  calendar: CalendarDays,
  accounts: Wallet,
  transactions: ArrowLeftRight,
  budgets: PiggyBank,
  recurring: Repeat,
  goals: Target,
  'cash-flow': ChartColumn,
  reports: ChartPie,
  categories: Tags,
  'account-types': Layers,
  'exchange-rates': Coins,
  security: ShieldCheck,
};
