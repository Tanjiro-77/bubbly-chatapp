/**
 * frontend/components/GifPickerModal.tsx
 *
 * Fast animated GIF picker for Bubbly chats:
 * - Instant mood-categorized curated animated GIFs + real-time search.
 * - Optional Giphy API search when EXPO_PUBLIC_GIPHY_API_KEY is configured.
 * - Supports picking raw animated .gif files from device storage without frame stripping.
 */

import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import * as DocumentPicker from "expo-document-picker";
import * as Icons from "phosphor-react-native";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import { colors, radius, spacingX, spacingY } from "../constants/theme";
import { scale, verticalScale } from "../utils/styling";
import { hapticTap } from "../utils/haptics";
import Typo from "./Typo";
import { BubblyAlert } from "./BubblyAlert";

export interface GifSelection {
    url?: string;
    localUri?: string;
    name: string;
    size?: number;
}

type GifCategory = "all" | "reactions" | "celebrate" | "love" | "funny" | "greetings";

interface CuratedGifItem {
    id: string;
    title: string;
    url: string;
    category: Exclude<GifCategory, "all">;
    tags: string;
}

const CURATED_GIFS: CuratedGifItem[] = [
    { id: "g1", title: "Mind Blown", url: "https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif", category: "reactions", tags: "wow mind blown shocked amazed" },
    { id: "g2", title: "Big Applause", url: "https://media.giphy.com/media/7rj2ZgttvgomY/giphy.gif", category: "celebrate", tags: "clap applause bravo congrats" },
    { id: "g3", title: "Party Confetti", url: "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif", category: "celebrate", tags: "party dance confetti yay celebrate" },
    { id: "g4", title: "Heart Eyes", url: "https://media.giphy.com/media/l4pTdcifPZLpDjL1e/giphy.gif", category: "love", tags: "love heart cute crush" },
    { id: "g5", title: "Funny Laugh", url: "https://media.giphy.com/media/ZqlvCTNHpqrio/giphy.gif", category: "funny", tags: "lol haha laugh minions funny" },
    { id: "g6", title: "Hey There", url: "https://media.giphy.com/media/ASd0Ukj0y3qMM/giphy.gif", category: "greetings", tags: "hi hello wave hey ralph" },
    { id: "g7", title: "Thumbs Up", url: "https://media.giphy.com/media/111ebonMs90YLu/giphy.gif", category: "reactions", tags: "ok thumbs up agree cool" },
    { id: "g8", title: "Sending Hugs", url: "https://media.giphy.com/media/3M4NpbLCTxBqU/giphy.gif", category: "love", tags: "hug ghost love care" },
    { id: "g9", title: "Popcorn Ready", url: "https://media.giphy.com/media/tyqcJoNjNv0Fq/giphy.gif", category: "reactions", tags: "popcorn drama watch waiting" },
    { id: "g10", title: "Celebration Time", url: "https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif", category: "celebrate", tags: "congrats win fireworks hype" },
    { id: "g11", title: "Good Morning", url: "https://media.giphy.com/media/KxbhQdZQ8Pvo47Hnti/giphy.gif", category: "greetings", tags: "morning coffee sunshine hi" },
    { id: "g12", title: "Cat Typing Fast", url: "https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif", category: "funny", tags: "cat typing work busy funny" },
    { id: "g13", title: "Chef's Kiss", url: "https://media.giphy.com/media/3o7aCWJavAgtBzLWrS/giphy.gif", category: "reactions", tags: "perfect kiss nice awesome" },
    { id: "g14", title: "Super Excited", url: "https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif", category: "celebrate", tags: "excited jonah yay happy" },
    { id: "g15", title: "Sparkle Love", url: "https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif", category: "love", tags: "hearts sparkle romance adore" },
    { id: "g16", title: "Facepalm", url: "https://media.giphy.com/media/6yRVg0HWzgS88/giphy.gif", category: "funny", tags: "facepalm oops sigh bruh" },
    { id: "g17", title: "Bye Bye", url: "https://media.giphy.com/media/42D3CxaINsAFemFuId/giphy.gif", category: "greetings", tags: "bye wave later cya" },
    { id: "g18", title: "High Five", url: "https://media.giphy.com/media/3oEjHV0z8S7WM4MwnK/giphy.gif", category: "celebrate", tags: "high five team yes win" },
];

const GIF_CATEGORIES: { key: GifCategory; label: string }[] = [
    { key: "all", label: "Trending" },
    { key: "reactions", label: "Reactions" },
    { key: "celebrate", label: "Celebrate" },
    { key: "love", label: "Love" },
    { key: "funny", label: "Funny" },
    { key: "greetings", label: "Hi / Bye" },
];

export const GifPickerModal = ({
    visible,
    onSelectGif,
    onClose,
}: {
    visible: boolean;
    onSelectGif: (selection: GifSelection) => void;
    onClose: () => void;
}) => {
    const insets = useSafeAreaInsets();
    const [query, setQuery] = useState("");
    const [category, setCategory] = useState<GifCategory>("all");
    const [remoteResults, setRemoteResults] = useState<CuratedGifItem[]>([]);
    const [searchingRemote, setSearchingRemote] = useState(false);

    const giphyKey = process.env.EXPO_PUBLIC_GIPHY_API_KEY || "";

    useEffect(() => {
        if (!visible) {
            setQuery("");
            setCategory("all");
            setRemoteResults([]);
            return;
        }
    }, [visible]);

    useEffect(() => {
        const trimmed = query.trim();
        if (!visible || !giphyKey || trimmed.length < 2) {
            setRemoteResults([]);
            setSearchingRemote(false);
            return;
        }

        let cancelled = false;
        const timer = setTimeout(async () => {
            setSearchingRemote(true);
            try {
                const res = await fetch(
                    `https://api.giphy.com/v1/gifs/search?api_key=${encodeURIComponent(giphyKey)}&q=${encodeURIComponent(trimmed)}&limit=18&rating=pg-13`
                );
                const json = await res.json();
                if (!cancelled && Array.isArray(json?.data)) {
                    setRemoteResults(
                        json.data
                            .map((g: any) => ({
                                id: `giphy_${g.id}`,
                                title: g.title || "GIF",
                                url: g.images?.fixed_width?.url || g.images?.downsized?.url || "",
                                category: "reactions" as const,
                                tags: g.title || "",
                            }))
                            .filter((item: CuratedGifItem) => Boolean(item.url))
                    );
                }
            } catch {
                if (!cancelled) setRemoteResults([]);
            } finally {
                if (!cancelled) setSearchingRemote(false);
            }
        }, 280);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [query, giphyKey, visible]);

    const displayedGifs = useMemo(() => {
        const q = query.trim().toLowerCase();
        const localFiltered = CURATED_GIFS.filter((g) => {
            if (category !== "all" && g.category !== category) return false;
            if (!q) return true;
            return g.title.toLowerCase().includes(q) || g.tags.toLowerCase().includes(q);
        });
        if (remoteResults.length > 0) {
            return [...remoteResults, ...localFiltered];
        }
        return localFiltered;
    }, [query, category, remoteResults]);

    const handlePickLocalGif = async () => {
        hapticTap("medium");
        try {
            const res = await DocumentPicker.getDocumentAsync({
                type: "image/gif",
                copyToCacheDirectory: true,
                multiple: false,
            });
            if (!res.canceled && res.assets?.length) {
                const asset = res.assets[0];
                if (asset.size && asset.size > 15 * 1024 * 1024) {
                    BubblyAlert.alert("GIF Too Large", "Please choose a GIF under 15 MB.");
                    return;
                }
                onSelectGif({
                    localUri: asset.uri,
                    name: asset.name || "animated.gif",
                    size: asset.size || 0,
                });
            }
        } catch {
            BubblyAlert.alert("Error", "Could not open device GIF files.");
        }
    };

    const handleSendLink = () => {
        const q = query.trim();
        if (/^https?:\/\/.+\.gif(\?.*)?$/i.test(q)) {
            hapticTap("heavy");
            onSelectGif({ url: q, name: "linked.gif" });
        }
    };

    const isDirectGifLink = /^https?:\/\/.+\.gif(\?.*)?$/i.test(query.trim());

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <Animated.View
                            entering={FadeInUp.duration(240).springify()}
                            style={[
                                styles.sheet,
                                { paddingBottom: Math.max(insets.bottom, spacingY._15) + spacingY._8 },
                            ]}
                        >
                            <View style={styles.handle} />

                            <View style={styles.headerRow}>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                    <View style={styles.gifBadgeTitle}>
                                        <Typo size={11} fontWeight="900" color={colors.white}>GIF</Typo>
                                    </View>
                                    <Typo size={16.5} fontWeight="800" color={colors.neutral900}>
                                        Send Animated GIF
                                    </Typo>
                                </View>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                    <TouchableOpacity
                                        onPress={handlePickLocalGif}
                                        style={styles.deviceBtn}
                                        activeOpacity={0.8}
                                    >
                                        <Icons.FolderOpen size={14} color={colors.primaryDark} weight="bold" />
                                        <Typo size={11.5} fontWeight="700" color={colors.primaryDark}>
                                            Device GIF
                                        </Typo>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => {
                                            hapticTap("light");
                                            onClose();
                                        }}
                                        style={styles.closeBtn}
                                    >
                                        <Icons.X size={16} color={colors.neutral600} weight="bold" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.searchWrap}>
                                <Icons.MagnifyingGlass size={16} color={colors.neutral400} weight="bold" />
                                <TextInput
                                    value={query}
                                    onChangeText={setQuery}
                                    placeholder="Search GIFs or paste a .gif URL..."
                                    placeholderTextColor={colors.neutral400}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    style={styles.searchInput}
                                />
                                {searchingRemote ? (
                                    <ActivityIndicator size="small" color={colors.primaryDark} />
                                ) : isDirectGifLink ? (
                                    <TouchableOpacity onPress={handleSendLink} style={styles.sendUrlBtn}>
                                        <Typo size={11} fontWeight="800" color={colors.black}>Send</Typo>
                                    </TouchableOpacity>
                                ) : query.length > 0 ? (
                                    <TouchableOpacity onPress={() => setQuery("")}>
                                        <Icons.XCircle size={17} color={colors.neutral400} weight="fill" />
                                    </TouchableOpacity>
                                ) : null}
                            </View>

                            <View>
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.catScroll}
                                >
                                    {GIF_CATEGORIES.map((c) => {
                                        const active = category === c.key;
                                        return (
                                            <TouchableOpacity
                                                key={c.key}
                                                onPress={() => {
                                                    hapticTap("light");
                                                    setCategory(c.key);
                                                }}
                                                style={[styles.catPill, active && styles.catPillActive]}
                                                activeOpacity={0.75}
                                            >
                                                <Typo
                                                    size={11.5}
                                                    fontWeight={active ? "800" : "600"}
                                                    color={active ? colors.neutral900 : colors.neutral500}
                                                >
                                                    {c.label}
                                                </Typo>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            </View>

                            <FlatList
                                data={displayedGifs}
                                numColumns={2}
                                keyExtractor={(item) => item.id}
                                columnWrapperStyle={styles.gridRow}
                                contentContainerStyle={styles.gridContent}
                                showsVerticalScrollIndicator={false}
                                keyboardShouldPersistTaps="handled"
                                initialNumToRender={8}
                                maxToRenderPerBatch={8}
                                windowSize={5}
                                removeClippedSubviews={Platform.OS === "android"}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.gifTile}
                                        activeOpacity={0.82}
                                        onPress={() => {
                                            hapticTap("heavy");
                                            onSelectGif({ url: item.url, name: `${item.title}.gif` });
                                        }}
                                    >
                                        <Image
                                            source={item.url}
                                            style={styles.gifImage}
                                            contentFit="cover"
                                            cachePolicy="memory-disk"
                                            autoplay={true}
                                        />
                                        <View style={styles.gifOverlayLabel}>
                                            <Typo size={10.5} fontWeight="700" color={colors.white} textProps={{ numberOfLines: 1 }}>
                                                {item.title}
                                            </Typo>
                                        </View>
                                    </TouchableOpacity>
                                )}
                                ListEmptyComponent={
                                    <Animated.View entering={FadeIn.duration(180)} style={styles.emptyWrap}>
                                        <Typo size={13.5} fontWeight="700" color={colors.neutral600}>
                                            No matching GIFs
                                        </Typo>
                                        <Typo size={12} color={colors.neutral400} style={{ textAlign: "center" }}>
                                            Try another keyword, paste a direct .gif link, or pick a GIF file from your device.
                                        </Typo>
                                    </Animated.View>
                                }
                            />
                        </Animated.View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.48)",
        justifyContent: "flex-end",
    },
    sheet: {
        height: "74%",
        backgroundColor: colors.white,
        borderTopLeftRadius: radius._24,
        borderTopRightRadius: radius._24,
        paddingHorizontal: spacingX._15,
        paddingTop: spacingY._10,
        gap: verticalScale(10),
    },
    handle: {
        width: scale(40),
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.neutral300,
        alignSelf: "center",
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    gifBadgeTitle: {
        backgroundColor: "#7c3aed",
        paddingHorizontal: scale(8),
        paddingVertical: verticalScale(3),
        borderRadius: radius._8,
    },
    deviceBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "#fef3c7",
        borderRadius: radius.full,
        paddingHorizontal: scale(10),
        paddingVertical: verticalScale(5),
    },
    closeBtn: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: colors.neutral100,
        alignItems: "center",
        justifyContent: "center",
    },
    searchWrap: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: colors.neutral100,
        borderRadius: radius._12,
        paddingHorizontal: spacingX._12,
        height: verticalScale(40),
        borderWidth: 1,
        borderColor: colors.neutral200,
    },
    searchInput: {
        flex: 1,
        fontSize: 13.5,
        color: colors.neutral900,
        paddingVertical: 0,
    },
    sendUrlBtn: {
        backgroundColor: colors.primary,
        paddingHorizontal: scale(10),
        paddingVertical: verticalScale(4),
        borderRadius: radius.full,
    },
    catScroll: {
        gap: 7,
        paddingVertical: 2,
    },
    catPill: {
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(6),
        borderRadius: radius.full,
        backgroundColor: colors.neutral100,
    },
    catPillActive: {
        backgroundColor: colors.primaryLight,
        borderWidth: 1,
        borderColor: colors.primary,
    },
    gridContent: {
        gap: spacingY._10,
        paddingBottom: spacingY._20,
    },
    gridRow: {
        gap: spacingX._10,
    },
    gifTile: {
        flex: 1,
        height: verticalScale(120),
        borderRadius: radius._12,
        overflow: "hidden",
        backgroundColor: colors.neutral900,
        borderWidth: 1,
        borderColor: colors.neutral200,
    },
    gifImage: {
        width: "100%",
        height: "100%",
    },
    gifOverlayLabel: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "rgba(0,0,0,0.48)",
        paddingHorizontal: scale(8),
        paddingVertical: verticalScale(3),
    },
    emptyWrap: {
        paddingVertical: verticalScale(36),
        paddingHorizontal: spacingX._20,
        alignItems: "center",
        gap: 6,
    },
});
