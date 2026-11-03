import { Placeholder } from '@/components/placeholder';

export default function TransactionsScreen() {
  return (
    <Placeholder
      intro="Coming soon: this month's transactions, grouped by day."
      sections={[
        { title: 'Month switcher', description: 'Move between months, with search and an account filter.' },
        { title: 'Day groups', description: 'Each day with its total; tap a row to edit or delete.' },
      ]}
    />
  );
}
