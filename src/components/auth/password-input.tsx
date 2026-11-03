import { Eye, EyeOff } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';

type Props = React.ComponentProps<typeof Input>;

/** Password field with a show/hide toggle. */
export function PasswordInput(props: Props) {
  const [visible, setVisible] = useState(false);
  return (
    <View className="justify-center">
      <Input {...props} secureTextEntry={!visible} className="pr-11" />
      <Pressable
        onPress={() => setVisible((v) => !v)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={visible ? 'Hide password' : 'Show password'}
        className="absolute right-0 h-10 w-11 items-center justify-center">
        <Icon as={visible ? EyeOff : Eye} size={18} className="text-muted-foreground" />
      </Pressable>
    </View>
  );
}
