import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  Image, ActivityIndicator, Modal, Share, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getGallery, getImageUrl } from '@/lib/api';
import type { GalleryGroup } from '@/lib/types';

export default function GalleryScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const thumbSize = (screenWidth - 48) / 3; // 3 columns with gaps
  const [groups, setGroups] = useState<GalleryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ imageUrl: string; name: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await getGallery();
      setGroups(result.groups);
      if (result.groups.length > 0 && !activeGroup) {
        setActiveGroup(result.groups[0].styleKey);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [activeGroup]);

  useEffect(() => { load(); }, [load]);

  const handleShare = useCallback(async (imageUrl: string, name: string) => {
    try {
      // On iOS `url` drives the share sheet; `message` is the accompanying text.
      // On Android `url` is ignored so we include the URL in `message` there.
      await Share.share({ message: name, url: imageUrl });
    } catch {
      // user cancelled or share sheet dismissed
    }
  }, []);

  const currentGroup = groups.find(g => g.styleKey === activeGroup);

  if (loading) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator color="#f97316" size="large" />
      </View>
    );
  }

  if (groups.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-black items-center justify-center px-8">
        <Ionicons name="images-outline" size={48} color="#3f3f46" />
        <Text className="text-white text-lg font-bold mt-4">הגלריה ריקה</Text>
        <Text className="text-zinc-500 text-center mt-2">ייצר תמונות למנות כדי לראות אותן כאן</Text>
        <TouchableOpacity
          onPress={() => router.push('/(app)/dishes')}
          className="mt-6 bg-orange-500 px-6 py-3 rounded-xl"
        >
          <Text className="text-white font-bold">עבור למנות</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      {/* Header */}
      <View className="px-5 pt-4 pb-3">
        <Text className="text-white text-2xl font-bold text-right">גלריה</Text>
      </View>

      {/* Style tabs */}
      {groups.length > 1 && (
        <View className="px-5 mb-3">
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={groups}
            keyExtractor={g => g.styleKey}
            contentContainerStyle={{ gap: 8 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => setActiveGroup(item.styleKey)}
                className={`flex-row items-center gap-2 px-4 py-2 rounded-xl border ${
                  activeGroup === item.styleKey
                    ? 'bg-orange-500/20 border-orange-500'
                    : 'bg-zinc-900 border-zinc-800'
                }`}
              >
                <Text className="text-base">{item.styleEmoji}</Text>
                <Text className={activeGroup === item.styleKey ? 'text-orange-400 font-medium' : 'text-zinc-400'}>
                  {item.styleLabel}
                </Text>
                <Text className="text-zinc-600 text-xs">{item.dishes.length}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Grid */}
      <FlatList
        data={currentGroup?.dishes ?? []}
        keyExtractor={d => d.id}
        numColumns={3}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        columnWrapperStyle={{ gap: 8 }}
        onRefresh={load}
        refreshing={loading}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setLightbox({ imageUrl: getImageUrl(item.id), name: item.name })}
            style={{ width: thumbSize, height: thumbSize }}
            className="rounded-xl overflow-hidden bg-zinc-900"
          >
            <Image
              source={{ uri: getImageUrl(item.id) }}
              style={{ width: thumbSize, height: thumbSize }}
              resizeMode="cover"
            />
          </TouchableOpacity>
        )}
      />

      {/* Lightbox */}
      <Modal
        visible={!!lightbox}
        transparent
        animationType="fade"
        onRequestClose={() => setLightbox(null)}
      >
        <View className="flex-1 bg-black/95 items-center justify-center">
          {/* Close */}
          <TouchableOpacity
            onPress={() => setLightbox(null)}
            className="absolute top-14 right-5 bg-zinc-800 rounded-full p-2 z-10"
          >
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>

          {/* Image */}
          {lightbox && (
            <>
              <Image
                source={{ uri: lightbox.imageUrl }}
                style={{ width: screenWidth - 32, height: screenWidth - 32 }}
                resizeMode="contain"
                className="rounded-2xl"
              />
              <Text className="text-white font-semibold text-lg mt-4">{lightbox.name}</Text>

              {/* Share */}
              <TouchableOpacity
                onPress={() => handleShare(lightbox.imageUrl, lightbox.name)}
                className="flex-row items-center gap-2 mt-4 bg-zinc-800 px-6 py-3 rounded-xl"
              >
                <Ionicons name="share-outline" size={20} color="white" />
                <Text className="text-white font-medium">שתף</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}
