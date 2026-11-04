import {
  ArrowLeftRight,
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
  UserRound,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';

import type { NavIcon } from '@/lib/nav';

// Lucide icons (generic, open source).
export const NAV_ICONS: Record<NavIcon, LucideIcon> = {
  home: House,
  transactions: ArrowLeftRight,
  'cash-flow': ChartColumn,
  profile: UserRound,
  accounts: Wallet,
  budgets: PiggyBank,
  goals: Target,
  recurring: Repeat,
  reports: ChartPie,
  categories: Tags,
  'account-types': Layers,
  'exchange-rates': Coins,
  security: ShieldCheck,
};
