import { ScrollView, View } from 'react-native';

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';

type Section = { title: string; description: string };

/** Temporary screen body listing what will appear there. */
export function Placeholder({ intro, sections }: { intro: string; sections: Section[] }) {
  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="gap-4 p-4">
      <Text className="text-sm text-muted-foreground">{intro}</Text>
      {sections.map((s) => (
        <Card key={s.title} className="gap-0 py-4">
          <CardHeader className="px-4">
            <CardTitle className="text-base">{s.title}</CardTitle>
            <CardDescription>{s.description}</CardDescription>
          </CardHeader>
        </Card>
      ))}
      <View className="h-4" />
    </ScrollView>
  );
}
