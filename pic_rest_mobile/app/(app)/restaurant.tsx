import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, Image, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { getProfile, updateProfile } from '@/lib/api';
import type { UserProfile } from '@/lib/types';

export default function RestaurantScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [style, setStyle] = useState('');
  const [logo, setLogo] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    try {
      const p = await getProfile();
      setProfile(p);
      setName(p.restaurantName);
      setStyle(p.restaurantStyle);
      setLogo(p.restaurantLogo);
    } catch {
      Alert.alert('שגיאה', 'לא ניתן לטעון פרופיל');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const pickLogo = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.6,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]?.base64) {
      const uri = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setLogo(uri);
      setDirty(true);
    }
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await updateProfile({
        restaurantName: name.trim(),
        restaurantStyle: style.trim(),
        restaurantLogo: logo,
      });
      setDirty(false);
      Alert.alert('נשמר', 'הפרופיל עודכן בהצלחה');
    } catch {
      Alert.alert('שגיאה', 'לא ניתן לשמור');
    } finally {
      setSaving(false);
    }
  }, [name, style, logo]);

  if (loading) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator color="#f97316" size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View className="py-5 flex-row items-center justify-between">
          <Text className="text-zinc-500 text-sm">
            {profile?.generatedCount ?? 0} תמונות נוצרו
          </Text>
          <Text className="text-white text-2xl font-bold">המסעדה שלי</Text>
        </View>

        {/* Logo */}
        <View className="items-center mb-6">
          <TouchableOpacity onPress={pickLogo} className="relative">
            {logo ? (
              <Image
                source={{ uri: logo }}
                className="w-24 h-24 rounded-2xl"
                resizeMode="cover"
              />
            ) : (
              <View className="w-24 h-24 rounded-2xl bg-zinc-900 border-2 border-dashed border-zinc-700 items-center justify-center">
                <Ionicons name="storefront-outline" size={32} color="#52525b" />
              </View>
            )}
            <View className="absolute -bottom-2 -right-2 bg-orange-500 rounded-full p-1.5">
              <Ionicons name="camera-outline" size={14} color="white" />
            </View>
          </TouchableOpacity>
          <Text className="text-zinc-500 text-xs mt-4">לחץ לשינוי לוגו</Text>
        </View>

        {/* Name */}
        <View className="mb-4">
          <Text className="text-zinc-400 text-sm text-right mb-2">שם המסעדה</Text>
          <TextInput
            className="bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-right text-base"
            placeholder="שם המסעדה שלך"
            placeholderTextColor="#52525b"
            value={name}
            onChangeText={v => { setName(v); setDirty(true); }}
          />
        </View>

        {/* Style description */}
        <View className="mb-6">
          <Text className="text-zinc-400 text-sm text-right mb-2">סגנון המסעדה</Text>
          <Text className="text-zinc-600 text-xs text-right mb-2">
            תאר את הסגנון שלך — ה-AI ישתמש בזה ליצירת הצילומים
          </Text>
          <TextInput
            className="bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-right min-h-[100px]"
            placeholder="לדוגמה: מסעדה ים-תיכונית חמה ואינטימית עם אווירת טוסקנה, עצי זית ותאורה נרות..."
            placeholderTextColor="#52525b"
            value={style}
            onChangeText={v => { setStyle(v); setDirty(true); }}
            multiline
            textAlignVertical="top"
            textAlign="right"
          />
        </View>

        {/* Phone */}
        <View className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 mb-6 flex-row items-center justify-between">
          <Ionicons name="lock-closed-outline" size={16} color="#52525b" />
          <View className="items-end">
            <Text className="text-zinc-500 text-xs">מספר טלפון (לא ניתן לשינוי)</Text>
            <Text className="text-white text-sm mt-0.5">{profile?.phone}</Text>
          </View>
        </View>

        {/* Save */}
        {dirty && (
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            className="bg-orange-500 rounded-xl py-4 items-center active:opacity-80"
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-base">שמור שינויים</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
