import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { login } from '@/lib/api';
import { saveToken } from '@/lib/auth';

export default function LoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 9) {
      Alert.alert('שגיאה', 'נא הכנס מספר טלפון תקין');
      return;
    }

    setLoading(true);
    try {
      const result = await login(cleaned);
      await saveToken(result.token, result.phone);
      router.replace('/(app)/menu');
    } catch (err) {
      Alert.alert('שגיאה', 'לא ניתן להתחבר. בדוק את החיבור לאינטרנט.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-black"
    >
      <View className="flex-1 justify-center px-8">
        {/* Logo */}
        <View className="items-center mb-12">
          <Text className="text-4xl font-bold text-white">🍽️</Text>
          <Text className="text-3xl font-bold text-white mt-3">Restorante</Text>
          <Text className="text-gray-400 mt-2 text-base text-center">
            AI לצילום מנות מקצועי
          </Text>
        </View>

        {/* Form */}
        <View className="gap-4">
          <Text className="text-white text-right text-base mb-1">מספר טלפון</Text>
          <TextInput
            className="bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-4 text-white text-lg text-right"
            placeholder="050-000-0000"
            placeholderTextColor="#52525b"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            onSubmitEditing={handleLogin}
            returnKeyType="done"
            maxLength={15}
          />

          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            className="bg-orange-500 rounded-xl py-4 items-center mt-2 active:opacity-80"
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-lg">כניסה</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text className="text-zinc-600 text-center text-sm mt-8">
          אין צורך בסיסמה — מספר הטלפון הוא המזהה שלך
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}
