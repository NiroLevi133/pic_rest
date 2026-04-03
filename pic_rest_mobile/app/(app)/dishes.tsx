import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DishesScreen() {
  return (
    <SafeAreaView className="flex-1 bg-black items-center justify-center">
      <Text className="text-white text-xl">מנות — בקרוב</Text>
    </SafeAreaView>
  );
}
