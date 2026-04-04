import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { parseMenuText, parseMenuImage } from '@/lib/api';

const STYLE_PRESETS = [
  { key: 'atmosphere', label: 'אווירה',  emoji: '☀️' },
  { key: 'studio',     label: 'סטודיו',  emoji: '🎬' },
  { key: 'enhance',    label: 'שיפור',   emoji: '✨' },
  { key: 'crazy',      label: 'משוגע',   emoji: '💥' },
  { key: 'floating',   label: 'מעופף',   emoji: '🚀' },
  { key: 'drinks',     label: 'שתייה',   emoji: '🥂' },
];

type InputMode = 'text' | 'image';

export default function MenuScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<InputMode>('text');
  const [menuText, setMenuText] = useState('');
  const [menuImage, setMenuImage] = useState<string | null>(null);
  const [styleKey, setStyleKey] = useState('atmosphere');
  const [loading, setLoading] = useState(false);

  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (!asset.base64) {
        Alert.alert('שגיאה', 'לא ניתן לקרוא את התמונה');
        return;
      }
      const mime = asset.mimeType ?? 'image/jpeg';
      setMenuImage(`data:${mime};base64,${asset.base64}`);
    }
  }, []);

  const takePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('הרשאה נדרשת', 'נדרשת גישה למצלמה');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      base64: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (!asset.base64) {
        Alert.alert('שגיאה', 'לא ניתן לקרוא את התמונה');
        return;
      }
      const mime = asset.mimeType ?? 'image/jpeg';
      setMenuImage(`data:${mime};base64,${asset.base64}`);
    }
  }, []);

  const handleParse = useCallback(async () => {
    if (mode === 'text' && !menuText.trim()) {
      Alert.alert('שגיאה', 'נא הכנס טקסט תפריט');
      return;
    }
    if (mode === 'image' && !menuImage) {
      Alert.alert('שגיאה', 'נא בחר תמונת תפריט');
      return;
    }

    setLoading(true);
    try {
      let result;
      if (mode === 'text') {
        result = await parseMenuText(menuText, styleKey);
      } else {
        result = await parseMenuImage(menuImage!, styleKey);
      }
      Alert.alert(
        'הצלחה!',
        `נמצאו ${result.dishCount} מנות`,
        [{ text: 'עבור למנות', onPress: () => router.push(`/(app)/dishes?menuId=${result.menuId}`) }]
      );
      setMenuText('');
      setMenuImage(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'שגיאה לא ידועה';
      Alert.alert('שגיאה', msg);
    } finally {
      setLoading(false);
    }
  }, [mode, menuText, menuImage, styleKey, router]);

  return (
    <SafeAreaView className="flex-1 bg-black">
      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View className="py-5">
          <Text className="text-white text-2xl font-bold text-right">תפריט חדש</Text>
          <Text className="text-zinc-500 text-sm text-right mt-1">העלה תפריט וה-AI יפרסר אותו</Text>
        </View>

        {/* Mode Toggle */}
        <View className="flex-row bg-zinc-900 rounded-xl p-1 mb-6">
          <ModeButton label="טקסט" icon="text-outline" active={mode === 'text'} onPress={() => setMode('text')} />
          <ModeButton label="תמונה" icon="camera-outline" active={mode === 'image'} onPress={() => setMode('image')} />
        </View>

        {/* Text Input */}
        {mode === 'text' && (
          <View className="mb-6">
            <Text className="text-zinc-400 text-sm text-right mb-2">הדבק או הקלד את תוכן התפריט</Text>
            <TextInput
              className="bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-4 text-white text-right min-h-[160px]"
              placeholder="לדוגמה:&#10;המבורגר קלאסי - בשר בקר, חסה, עגבנייה - 58₪&#10;פסטה קרבונרה - ספגטי, ביצה, בייקון - 72₪"
              placeholderTextColor="#52525b"
              value={menuText}
              onChangeText={setMenuText}
              multiline
              textAlignVertical="top"
              textAlign="right"
            />
          </View>
        )}

        {/* Image Input */}
        {mode === 'image' && (
          <View className="mb-6">
            {menuImage ? (
              <View className="relative">
                <Image
                  source={{ uri: menuImage }}
                  className="w-full h-52 rounded-xl"
                  resizeMode="cover"
                />
                <TouchableOpacity
                  onPress={() => setMenuImage(null)}
                  className="absolute top-3 left-3 bg-black/60 rounded-full p-1"
                >
                  <Ionicons name="close" size={18} color="white" />
                </TouchableOpacity>
              </View>
            ) : (
              <View className="gap-3">
                <TouchableOpacity
                  onPress={takePhoto}
                  className="bg-zinc-900 border border-zinc-700 rounded-xl py-5 items-center gap-2 active:opacity-80"
                >
                  <Ionicons name="camera-outline" size={28} color="#f97316" />
                  <Text className="text-white font-medium">צלם תפריט</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={pickImage}
                  className="bg-zinc-900 border border-zinc-700 rounded-xl py-5 items-center gap-2 active:opacity-80"
                >
                  <Ionicons name="image-outline" size={28} color="#71717a" />
                  <Text className="text-zinc-400">בחר מהגלריה</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Style Selector */}
        <View className="mb-6">
          <Text className="text-zinc-400 text-sm text-right mb-3">סגנון צילום</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {STYLE_PRESETS.map((preset) => (
              <TouchableOpacity
                key={preset.key}
                onPress={() => setStyleKey(preset.key)}
                className={`px-4 py-2 rounded-xl border items-center flex-row gap-2 ${
                  styleKey === preset.key
                    ? 'bg-orange-500/20 border-orange-500'
                    : 'bg-zinc-900 border-zinc-700'
                }`}
              >
                <Text className="text-base">{preset.emoji}</Text>
                <Text className={styleKey === preset.key ? 'text-orange-400 font-medium' : 'text-zinc-400'}>
                  {preset.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Parse Button */}
        <TouchableOpacity
          onPress={handleParse}
          disabled={loading}
          className="bg-orange-500 rounded-xl py-4 items-center flex-row justify-center gap-3 active:opacity-80"
        >
          {loading ? (
            <>
              <ActivityIndicator color="white" size="small" />
              <Text className="text-white font-bold text-lg">מפרסר תפריט...</Text>
            </>
          ) : (
            <>
              <Ionicons name="flash-outline" size={22} color="white" />
              <Text className="text-white font-bold text-lg">פרסר תפריט</Text>
            </>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

function ModeButton({
  label, icon, active, onPress,
}: {
  label: string;
  icon: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-1 flex-row items-center justify-center gap-2 py-2.5 rounded-lg ${active ? 'bg-orange-500' : ''}`}
    >
      <Ionicons name={icon as never} size={18} color={active ? 'white' : '#71717a'} />
      <Text className={active ? 'text-white font-medium' : 'text-zinc-500'}>{label}</Text>
    </TouchableOpacity>
  );
}
