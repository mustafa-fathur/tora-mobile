import { Placeholder } from '@/components/placeholder';

export default function AccountsScreen() {
  return (
    <Placeholder
      intro="Coming soon: what you own and owe."
      sections={[
        { title: 'Net worth', description: 'Everything you own minus what you owe.' },
        { title: 'Accounts', description: 'Cash, investments and debts, each with its balance.' },
      ]}
    />
  );
}
