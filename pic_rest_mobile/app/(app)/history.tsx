import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getMenus, deleteMenu } from '@/lib/api';
import type { Menu, DishStatus } from '@/lib/types';

const STYLE_PRESETS: Record<string, { label: string; emoji: string }> = {
  atmosphere: { label: 'אווירה',  emoji: '☀️' },
  studio:     { label: 'סטודיו',  emoji: '🎬' },
  enhance:    { label: 'שיפור',   emoji: '✨' },
  crazy:      { label: 'משוגע',   emoji: '💥' },
  floating:   { label: 'מעופף',   emoji: '🚀' },
  drinks:     { label: 'שתייה',   emoji: '🥂' },
};

function statusColor(status: DishStatus): string {
  return { PENDING: '#71717a', GENERATING: '#60a5fa', DONE: '#4ade80', ERROR: '#f87171' }[status];
}

export default function HistoryScreen() {
  const router = useRouter();
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await getMenus();
      setMenus(data);
    } catch {
      Alert.alert('שגיאה', 'לא ניתן לטעון היסטוריה');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = useCallback((menu: Menu) => {
    Alert.alert(
      'מחיקת תפריט',
      `למחוק את "${menu.name}" עם כל המנות?`,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMenu(menu.id);
              setMenus(prev => prev.filter(m => m.id !== menu.id));
            } catch {
              Alert.alert('שגיאה', 'לא ניתן למחוק');
            }
          },
        },
      ]
    );
  }, []);

  if (loading) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator color="#f97316" size="large" />
      </View>
    );
  }

  if (menus.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-black items-center justify-center px-8">
        <Ionicons name="folder-open-outline" size={48} color="#3f3f46" />
        <Text className="text-white text-lg font-bold mt-4">אין היסטוריה</Text>
        <Text className="text-zinc-500 text-center mt-2">תפריטים שפרסרת יופיעו כאן</Text>
        <TouchableOpacity
          onPress={() => router.push('/(app)/menu')}
          className="mt-6 bg-orange-500 px-6 py-3 rounded-xl"
        >
          <Text className="text-white font-bold">פרסר תפריט</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="px-5 pt-4 pb-3">
        <Text className="text-white text-2xl font-bold text-right">היסטוריה</Text>
      </View>

      <FlatList
        data={menus}
        keyExtractor={m => m.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        onRefresh={load}
        refreshing={loading}
        renderItem={({ item }) => {
          const preset = item.styleKey ? STYLE_PRESETS[item.styleKey] : null;
          const done = item.dishes.filter(d => d.status === 'DONE').length;
          const total = item.dishes.length;
          const date = new Date(item.createdAt).toLocaleDateString('he-IL', {
            day: 'numeric', month: 'short', year: 'numeric',
          });

          return (
            <TouchableOpacity
              onPress={() => router.push(`/(app)/dishes?menuId=${item.id}`)}
              className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 active:opacity-80"
            >
              {/* Top row */}
              <View className="flex-row items-start justify-between mb-3">
                <TouchableOpacity
                  onPress={() => handleDelete(item)}
                  className="p-1"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="trash-outline" size={18} color="#71717a" />
                </TouchableOpacity>

                <View className="items-end flex-1 ml-3">
                  <Text className="text-white font-bold text-base text-right">{item.name}</Text>
                  <Text className="text-zinc-500 text-xs mt-0.5">{date}</Text>
                </View>
              </View>

              {/* Stats row */}
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <Ionicons name="chevron-forward-outline" size={16} color="#f97316" />
                  {preset && (
                    <View className="flex-row items-center gap-1 bg-zinc-800 px-2 py-0.5 rounded-full">
                      <Text className="text-xs">{preset.emoji}</Text>
                      <Text className="text-zinc-400 text-xs">{preset.label}</Text>
                    </View>
                  )}
                </View>

                <View className="items-end">
                  <Text className="text-zinc-400 text-sm">
                    {done}/{total} הושלמו
                  </Text>
                  {/* Mini progress bar */}
                  <View className="w-24 h-1.5 bg-zinc-800 rounded-full mt-1.5 overflow-hidden">
                    <View
                      className="h-full bg-orange-500 rounded-full"
                      style={{ width: total > 0 ? `${(done / total) * 100}%` : '0%' }}
                    />
                  </View>
                </View>
              </View>

              {/* Dish status dots */}
              {item.dishes.length > 0 && (
                <View className="flex-row flex-wrap gap-1 mt-3 justify-end">
                  {item.dishes.slice(0, 20).map(d => (
                    <View
                      key={d.id}
                      style={{ backgroundColor: statusColor(d.status as DishStatus) }}
                      className="w-2 h-2 rounded-full opacity-70"
                    />
                  ))}
                  {item.dishes.length > 20 && (
                    <Text className="text-zinc-600 text-xs">+{item.dishes.length - 20}</Text>
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}
