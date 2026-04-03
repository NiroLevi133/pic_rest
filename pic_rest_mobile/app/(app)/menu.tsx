import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MenuScreen() {
  return (
    <SafeAreaView className="flex-1 bg-black items-center justify-center">
      <Text className="text-white text-xl">תפריט — בקרוב</Text>
    </SafeAreaView>
  );
}
