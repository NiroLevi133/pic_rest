import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  ActivityIndicator, Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import {
  getDishes, getMenus, generateDish, generateAll,
  uploadReferenceImage, deleteReferenceImage,
} from '@/lib/api';
import type { Dish, DishStatus } from '@/lib/types';

const STATUS_CONFIG: Record<DishStatus, { label: string; color: string; icon: string }> = {
  PENDING:    { label: 'ממתין',    color: '#71717a', icon: 'time-outline' },
  GENERATING: { label: 'מייצר...', color: '#60a5fa', icon: 'sync-outline' },
  DONE:       { label: 'הושלם',   color: '#4ade80', icon: 'checkmark-circle-outline' },
  ERROR:      { label: 'שגיאה',   color: '#f87171', icon: 'alert-circle-outline' },
};

export default function DishesScreen() {
  const router = useRouter();
  const { menuId: paramMenuId } = useLocalSearchParams<{ menuId?: string }>();

  const [menuId, setMenuId] = useState<string | null>(paramMenuId ?? null);
  const [menuName, setMenuName] = useState('');
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingAll, setGeneratingAll] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // If no menuId → load latest menu
  const resolveMenuId = useCallback(async () => {
    if (menuId) return menuId;
    try {
      const menus = await getMenus();
      if (menus.length > 0) {
        setMenuId(menus[0].id);
        return menus[0].id;
      }
    } catch {
      // ignore
    }
    return null;
  }, [menuId]);

  const loadDishes = useCallback(async (id?: string) => {
    const mid = id ?? menuId;
    if (!mid) return;
    try {
      const result = await getDishes(mid);
      setMenuName(result.menuName);
      setDishes(result.dishes);
    } catch {
      // silent — polling shouldn't show alerts
    }
  }, [menuId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const mid = await resolveMenuId();
      if (!mid) {
        setLoading(false);
        return;
      }
      await loadDishes(mid);
      setLoading(false);
    })();
  }, [resolveMenuId, loadDishes]);

  // Poll while any dish is generating
  useEffect(() => {
    const hasGenerating = dishes.some(d => d.status === 'GENERATING');
    if (hasGenerating) {
      pollingRef.current = setInterval(() => loadDishes(), 3000);
    } else {
      if (pollingRef.current) clearInterval(pollingRef.current);
    }
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [dishes, loadDishes]);

  const handleUploadReference = useCallback(async (dish: Dish) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    try {
      await uploadReferenceImage(dish.id, result.assets[0].uri);
      setDishes(prev => prev.map(d =>
        d.id === dish.id ? { ...d, referenceImage: result.assets[0].uri } : d
      ));
    } catch {
      Alert.alert('שגיאה', 'לא ניתן להעלות תמונה');
    }
  }, []);

  const handleRemoveReference = useCallback(async (dish: Dish) => {
    try {
      await deleteReferenceImage(dish.id);
      setDishes(prev => prev.map(d =>
        d.id === dish.id ? { ...d, referenceImage: null } : d
      ));
    } catch {
      Alert.alert('שגיאה', 'לא ניתן למחוק תמונה');
    }
  }, []);

  const handleGenerateOne = useCallback(async (dish: Dish) => {
    if (!dish.referenceImage) {
      Alert.alert('חסרה תמונה', 'העלה תמונת מקור קודם');
      return;
    }
    setDishes(prev => prev.map(d =>
      d.id === dish.id ? { ...d, status: 'GENERATING' } : d
    ));
    try {
      await generateDish(dish.id);
    } catch {
      setDishes(prev => prev.map(d =>
        d.id === dish.id ? { ...d, status: 'ERROR' } : d
      ));
      Alert.alert('שגיאה', 'לא ניתן להתחיל ייצור');
    }
  }, []);

  const handleGenerateAll = useCallback(async () => {
    if (!menuId) return;
    const withRef = dishes.filter(d => d.referenceImage && d.status !== 'DONE').length;
    if (withRef === 0) {
      Alert.alert('אין מנות מוכנות', 'העלה תמונות מקור למנות קודם');
      return;
    }
    setGeneratingAll(true);
    try {
      const result = await generateAll(menuId);
      setDishes(prev => prev.map(d =>
        d.referenceImage && d.status !== 'DONE' ? { ...d, status: 'GENERATING' } : d
      ));
      Alert.alert('הופעל!', `${result.queued} מנות בתור לייצור`);
    } catch {
      Alert.alert('שגיאה', 'לא ניתן להפעיל ייצור');
    } finally {
      setGeneratingAll(false);
    }
  }, [menuId, dishes]);

  const stats = {
    total: dishes.length,
    withRef: dishes.filter(d => d.referenceImage).length,
    done: dishes.filter(d => d.status === 'DONE').length,
  };

  if (loading) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator color="#f97316" size="large" />
      </View>
    );
  }

  if (!menuId || dishes.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-black items-center justify-center px-8">
        <Ionicons name="restaurant-outline" size={48} color="#3f3f46" />
        <Text className="text-white text-lg font-bold mt-4">אין מנות</Text>
        <Text className="text-zinc-500 text-center mt-2">פרסר תפריט קודם כדי לראות מנות כאן</Text>
        <TouchableOpacity
          onPress={() => router.push('/(app)/menu')}
          className="mt-6 bg-orange-500 px-6 py-3 rounded-xl"
        >
          <Text className="text-white font-bold">עבור לתפריט</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      {/* Header */}
      <View className="px-5 pt-4 pb-3 border-b border-zinc-800">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={handleGenerateAll}
            disabled={generatingAll || stats.withRef === 0}
            className={`flex-row items-center gap-2 px-4 py-2 rounded-xl ${
              stats.withRef > 0 && !generatingAll ? 'bg-orange-500' : 'bg-zinc-800'
            }`}
          >
            {generatingAll ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="flash-outline" size={16} color="white" />
            )}
            <Text className="text-white font-medium text-sm">הכל</Text>
          </TouchableOpacity>

          <View className="items-end">
            <Text className="text-white font-bold text-lg">{menuName}</Text>
            <Text className="text-zinc-500 text-xs">
              {stats.total} מנות · {stats.withRef} עם תמונה · {stats.done} הושלמו
            </Text>
          </View>
        </View>
      </View>

      {/* Dishes list */}
      <FlatList
        data={dishes}
        keyExtractor={d => d.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        renderItem={({ item }) => (
          <DishCard
            dish={item}
            onUpload={() => handleUploadReference(item)}
            onRemoveRef={() => handleRemoveReference(item)}
            onGenerate={() => handleGenerateOne(item)}
          />
        )}
      />
    </SafeAreaView>
  );
}

function DishCard({
  dish, onUpload, onRemoveRef, onGenerate,
}: {
  dish: Dish;
  onUpload: () => void;
  onRemoveRef: () => void;
  onGenerate: () => void;
}) {
  const status = STATUS_CONFIG[dish.status];

  return (
    <View className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
      {/* Top row */}
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-row items-center gap-2">
          <Ionicons name={status.icon as never} size={14} color={status.color} />
          <Text style={{ color: status.color }} className="text-xs font-medium">{status.label}</Text>
        </View>
        <Text className="text-white font-semibold text-right flex-1 ml-3">{dish.name}</Text>
      </View>

      {/* Images row */}
      <View className="flex-row items-center gap-3 mb-3">
        {/* Reference image */}
        <View className="items-center gap-1">
          <Text className="text-zinc-600 text-xs">מקור</Text>
          {dish.referenceImage ? (
            <TouchableOpacity onLongPress={onRemoveRef}>
              <Image
                source={{ uri: dish.referenceImage }}
                className="w-14 h-14 rounded-xl"
                resizeMode="cover"
              />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={onUpload}
              className="w-14 h-14 rounded-xl border-2 border-dashed border-zinc-700 items-center justify-center"
            >
              <Ionicons name="add-outline" size={22} color="#52525b" />
            </TouchableOpacity>
          )}
        </View>

        {/* Arrow */}
        <Ionicons name="arrow-forward-outline" size={18} color="#52525b" />

        {/* Generated image */}
        <View className="items-center gap-1">
          <Text className="text-zinc-600 text-xs">תוצאה</Text>
          {dish.status === 'DONE' && dish.imageUrl ? (
            <Image
              source={{ uri: dish.imageUrl }}
              className="w-14 h-14 rounded-xl"
              resizeMode="cover"
            />
          ) : dish.status === 'GENERATING' ? (
            <View className="w-14 h-14 rounded-xl bg-zinc-800 items-center justify-center">
              <ActivityIndicator size="small" color="#60a5fa" />
            </View>
          ) : (
            <View className="w-14 h-14 rounded-xl bg-zinc-800 items-center justify-center">
              <Ionicons name="image-outline" size={22} color="#3f3f46" />
            </View>
          )}
        </View>

        {/* Generate button */}
        {dish.status !== 'DONE' && dish.status !== 'GENERATING' && (
          <TouchableOpacity
            onPress={onGenerate}
            disabled={!dish.referenceImage}
            className={`mr-auto flex-row items-center gap-2 px-4 py-2 rounded-xl ${
              dish.referenceImage ? 'bg-orange-500/20 border border-orange-500/50' : 'bg-zinc-800'
            }`}
          >
            <Ionicons
              name="sparkles-outline"
              size={16}
              color={dish.referenceImage ? '#f97316' : '#52525b'}
            />
            <Text className={dish.referenceImage ? 'text-orange-400 text-sm' : 'text-zinc-600 text-sm'}>
              ייצר
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Description */}
      {dish.description && (
        <Text className="text-zinc-500 text-xs text-right" numberOfLines={1}>
          {dish.description}
        </Text>
      )}

      {/* Error */}
      {dish.status === 'ERROR' && dish.errorMessage && (
        <Text className="text-red-400 text-xs text-right mt-1" numberOfLines={2}>
          {dish.errorMessage}
        </Text>
      )}

      {/* Long press hint */}
      {dish.referenceImage && (
        <Text className="text-zinc-700 text-xs text-right mt-1">לחץ לחיצה ארוכה על תמונת המקור למחיקה</Text>
      )}
    </View>
  );
}
