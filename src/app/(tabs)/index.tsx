import { Placeholder } from '@/components/placeholder';

export default function HomeScreen() {
  return (
    <Placeholder
      intro="Coming soon: your month at a glance."
      sections={[
        { title: 'This month', description: 'Income, spending and net.' },
        { title: 'Budgets', description: 'Your top budgets with progress bars.' },
        { title: 'Bills due soon', description: 'Bills due in the next 7 days.' },
        { title: 'Recent transactions', description: 'Your last 5 transactions.' },
      ]}
    />
  );
}
