import { SegmentedControl } from '@/components/segmented-control';
import type { Mode } from '@/lib/finance/transaction-rows';

const MODES: { value: Mode; label: string }[] = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'transfer', label: 'Transfer' },
];

/** Expense / Income / Transfer switch (same choices as the web form). */
export function ModeSwitch({
  value,
  onChange,
  isLocked,
}: {
  value: Mode;
  onChange: (m: Mode) => void;
  isLocked?: (m: Mode) => boolean; // when editing, a transfer can't switch to expense/income
}) {
  return <SegmentedControl options={MODES} value={value} onChange={onChange} isLocked={isLocked} />;
}
