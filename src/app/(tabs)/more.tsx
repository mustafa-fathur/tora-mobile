import Constants from 'expo-constants';
import { ExternalLink, LogOut } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { supabase } from '@/lib/supabase/client';
import { openWeb } from '@/lib/web';
import { useSession } from '@/providers/session';

export default function MoreScreen() {
  const { session } = useSession();

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="gap-4 p-4">
      <Card className="gap-0 py-0">
        <CardContent className="gap-1 px-4 py-4">
          <Text className="text-sm text-muted-foreground">Logged in as</Text>
          <Text className="font-medium">{session?.user.email}</Text>
        </CardContent>
        <Separator />
        <CardContent className="px-2 py-2">
          <Button variant="ghost" className="justify-start" onPress={() => supabase.auth.signOut()}>
            <Icon as={LogOut} size={18} />
            <Text>Log out</Text>
          </Button>
        </CardContent>
      </Card>

      <Card className="gap-0 py-0">
        <CardContent className="gap-1 px-4 py-4">
          <Text className="font-medium">Budgets, reports, CSV import and settings</Text>
          <Text className="text-sm text-muted-foreground">These live on the web app for now.</Text>
        </CardContent>
        <Separator />
        <CardContent className="px-2 py-2">
          <Button variant="ghost" className="justify-start" onPress={() => openWeb('/dashboard')}>
            <Icon as={ExternalLink} size={18} />
            <Text>Open Tora on the web</Text>
          </Button>
        </CardContent>
      </Card>

      <View className="items-center pt-2">
        <Text className="text-xs text-muted-foreground">
          Tora {Constants.expoConfig?.version}
        </Text>
      </View>
    </ScrollView>
  );
}
