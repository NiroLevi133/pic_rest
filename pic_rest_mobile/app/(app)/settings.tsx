import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getSettings, saveSettings } from '@/lib/api';
import { clearToken } from '@/lib/auth';
import type { SafeSettings, LLMProvider } from '@/lib/types';

const LLM_OPTIONS: { value: LLMProvider; label: string }[] = [
  { value: 'openai', label: 'OpenAI (GPT-4o)' },
  { value: 'anthropic', label: 'Anthropic (Claude)' },
  { value: 'gemini', label: 'Google Gemini' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<SafeSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // API key fields (not returned from server for security)
  const [openaiKey, setOpenaiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [googleKey, setGoogleKey] = useState('');
  const [llmProvider, setLlmProvider] = useState<LLMProvider>('openai');

  const load = useCallback(async () => {
    try {
      const s = await getSettings();
      setSettings(s);
      setLlmProvider(s.llmProvider);
    } catch {
      Alert.alert('שגיאה', 'לא ניתן לטעון הגדרות');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    setSaving(true);
    try {
      await saveSettings({
        llmProvider,
        imageProvider: 'gemini',
        ...(openaiKey && { openaiApiKey: openaiKey }),
        ...(anthropicKey && { anthropicApiKey: anthropicKey }),
        ...(googleKey && { googleApiKey: googleKey }),
      });
      setOpenaiKey('');
      setAnthropicKey('');
      setGoogleKey('');
      await load();
      Alert.alert('נשמר', 'ההגדרות נשמרו בהצלחה');
    } catch {
      Alert.alert('שגיאה', 'לא ניתן לשמור הגדרות');
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    Alert.alert('התנתקות', 'האם אתה בטוח?', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'התנתק',
        style: 'destructive',
        onPress: async () => {
          await clearToken();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator color="#f97316" size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View className="py-5">
          <Text className="text-white text-2xl font-bold text-right">הגדרות</Text>
        </View>

        {/* LLM Provider */}
        <Section title="ספק AI לפרסור תפריט">
          {LLM_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              onPress={() => setLlmProvider(opt.value)}
              className={`flex-row items-center justify-between px-4 py-3 rounded-xl mb-2 border ${
                llmProvider === opt.value
                  ? 'bg-orange-500/10 border-orange-500'
                  : 'bg-zinc-900 border-zinc-800'
              }`}
            >
              <Ionicons
                name={llmProvider === opt.value ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={llmProvider === opt.value ? '#f97316' : '#52525b'}
              />
              <Text className="text-white text-right flex-1 mr-3">{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </Section>

        {/* API Keys */}
        <Section title="מפתחות API">
          <KeyInput
            label="OpenAI API Key"
            placeholder={settings?.hasOpenaiKey ? '••••••••  (מוגדר)' : 'sk-...'}
            value={openaiKey}
            onChange={setOpenaiKey}
            hasKey={settings?.hasOpenaiKey}
          />
          <KeyInput
            label="Anthropic API Key"
            placeholder={settings?.hasAnthropicKey ? '••••••••  (מוגדר)' : 'sk-ant-...'}
            value={anthropicKey}
            onChange={setAnthropicKey}
            hasKey={settings?.hasAnthropicKey}
          />
          <KeyInput
            label="Google API Key"
            placeholder={settings?.hasGoogleKey ? '••••••••  (מוגדר)' : 'AIza...'}
            value={googleKey}
            onChange={setGoogleKey}
            hasKey={settings?.hasGoogleKey}
          />
        </Section>

        {/* Save */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          className="bg-orange-500 rounded-xl py-4 items-center mt-2 active:opacity-80"
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-base">שמור הגדרות</Text>
          )}
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity
          onPress={handleLogout}
          className="border border-zinc-700 rounded-xl py-4 items-center mt-3 active:opacity-80"
        >
          <Text className="text-red-400 font-medium text-base">התנתק</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-6">
      <Text className="text-zinc-400 text-sm text-right mb-3">{title}</Text>
      {children}
    </View>
  );
}

function KeyInput({
  label,
  placeholder,
  value,
  onChange,
  hasKey,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  hasKey?: boolean;
}) {
  return (
    <View className="mb-3">
      <View className="flex-row items-center justify-end mb-1 gap-2">
        {hasKey && (
          <View className="bg-green-500/20 px-2 py-0.5 rounded-full">
            <Text className="text-green-400 text-xs">מוגדר</Text>
          </View>
        )}
        <Text className="text-zinc-400 text-sm">{label}</Text>
      </View>
      <TextInput
        className="bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-right"
        placeholder={placeholder}
        placeholderTextColor="#52525b"
        value={value}
        onChangeText={onChange}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}
