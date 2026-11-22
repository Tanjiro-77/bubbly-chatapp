import {
    StyleSheet, View, Modal, FlatList,
    TouchableOpacity, TouchableWithoutFeedback,
    Pressable, TextInput, Dimensions, ScrollView, Alert, Linking
} from 'react-native'
import React, { useState, useMemo, useEffect, useRef } from 'react'
import { AttachmentMetaProps, MessageProps, PollProps, ReactionProps, ReplyToProps } from "../types"
import { useAuth } from "../contexts/authContext"
import { colors, radius, spacingX, spacingY } from "../constants/theme"
import { scale, verticalScale } from "../utils/styling"
import Avatar from "./Avatar"
import Typo from "./Typo"
import moment from "moment"
import { Image } from "expo-image"
import * as Icons from "phosphor-react-native"
import * as Clipboard from 'expo-clipboard'
import Animated, {
    FadeIn, FadeInUp, FadeOut, FadeOutDown,
    useSharedValue, useAnimatedStyle, withTiming, withRepeat
} from "react-native-reanimated"
import ImageViewing from "react-native-image-viewing"
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio'
import { deleteMessage, editMessage, votePoll, closePoll } from "../socket/socketEvents"
import { getFileIcon, formatFileSize } from "../services/imageService"

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ── Format seconds ──
const formatDuration = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
};

// ─────────────────────────────────────────────
// EMOJI CATEGORIES
// ─────────────────────────────────────────────
const EMOJI_CATEGORIES: { icon: string; label: string; emojis: string[] }[] = [
    {
        icon: "⭐",
        label: "Quick",
        emojis: [
            "❤️", "😂", "🤣", "😍", "🥰", "😘", "😊", "😎", "🤩", "🥳",
            "😭", "😢", "😡", "😱", "😮", "😲", "🤯", "🤔", "🙄", "😴",
            "👍", "👎", "👏", "🙌", "🙏", "🤝", "👌", "✌️", "🤞", "🤟",
            "🔥", "💯", "✨", "💫", "🎉", "🎊", "🚀", "💀", "☠️", "💩",
        ],
    },
    {
        icon: "😀",
        label: "Smileys",
        emojis: [
            "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃",
            "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😙",
            "🥲", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫",
            "🤔", "🫡", "🤐", "🤨", "😐", "😑", "😶", "🫥", "😏", "😒",
            "🙄", "😬", "😮‍💨", "🤥", "😌", "😔", "😪", "🤤", "😴", "😷",
            "🤒", "🤕", "🤢", "🤮", "🤧", "🥵", "🥶", "🥴", "😵", "😵‍💫",
            "🤯", "🤠", "🥳", "🥸", "😎", "🤓", "🧐", "😕", "😟", "🙁",
            "☹️", "😮", "😯", "😲", "😳", "🥺", "😦", "😧", "😨", "😰",
            "😥", "😢", "😭", "😱", "😖", "😣", "😞", "😓", "😩", "😫",
            "🥱", "😤", "😡", "😠", "🤬", "😈", "👿", "💀", "☠️", "💩",
            "🤡", "👹", "👺", "👻", "👽", "👾", "🤖",
        ],
    },
    {
        icon: "🧑",
        label: "People",
        emojis: [
            "👶", "🧒", "👦", "👧", "🧑", "👱", "👨", "👩", "🧔", "👴",
            "👵", "🙍", "🙎", "🙅", "🙆", "💁", "🙋", "🧏", "🙇", "🤦",
            "🤷", "👮", "🕵️", "💂", "🥷", "👷", "🤴", "👸", "👰", "🤵",
            "🎅", "🤶", "🧙", "🧚", "🧛", "🧜", "🧝", "🧞", "🧟", "🦸",
            "🦹", "💇", "💆", "🧖", "🧗", "🏃", "🚶", "🧘", "🕺", "💃",
        ],
    },
    {
        icon: "👋",
        label: "Gestures",
        emojis: [
            "👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞",
            "🤟", "🤘", "🤙", "👈", "👉", "👆", "👇", "☝️", "👍", "👎",
            "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏",
            "✍️", "💅", "🤳", "💪", "🦾", "🫶",
        ],
    },
    {
        icon: "❤️",
        label: "Hearts",
        emojis: [
            "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "🩷",
            "🩵", "🩶", "💔", "❤️‍🔥", "❤️‍🩹", "❣️", "💕", "💞", "💓", "💗",
            "💖", "💘", "💝", "💟", "💌", "💋", "💯", "💫", "💥", "💢",
            "💦", "💨", "💤", "✨", "🌟", "⭐", "🌈", "🔥", "💎", "🏆",
        ],
    },
    {
        icon: "🎉",
        label: "Fun",
        emojis: [
            "🎉", "🎊", "🎈", "🎁", "🎀", "🏆", "🥇", "🥈", "🥉", "🎯",
            "🚀", "💫", "✨", "🌟", "🔥", "💯", "🎵", "🎶", "🎸", "🎹",
            "🥁", "🎺", "🎷", "🎻", "🎤", "🎧", "🎬", "🎮", "🕹️", "🎲",
            "🎪", "🎭", "🎨", "🪄", "🎩", "🎫", "🎟️", "🧩", "🪅", "🎃",
        ],
    },
    {
        icon: "🐶",
        label: "Animals",
        emojis: [
            "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯",
            "🦁", "🐮", "🐷", "🐸", "🐵", "🙈", "🙉", "🙊", "🐔", "🐧",
            "🐦", "🐤", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄",
            "🐝", "🐛", "🦋", "🐌", "🐞", "🐜", "🐢", "🐍", "🦎", "🐙",
            "🦑", "🦀", "🐠", "🐟", "🐡", "🦈", "🐬", "🐳", "🐋", "🦭",
        ],
    },
    {
        icon: "🌿",
        label: "Nature",
        emojis: [
            "🌱", "🌿", "☘️", "🍀", "🎋", "🍃", "🍂", "🍁", "🌾", "🌵",
            "🌲", "🌳", "🌴", "🪴", "🌷", "🌹", "🥀", "🌺", "🌸", "🌼",
            "🌻", "💐", "🌞", "🌝", "🌚", "🌙", "⭐", "🌟", "✨", "⚡",
            "☀️", "🌤️", "⛅", "🌧️", "⛈️", "🌨️", "❄️", "☃️", "🌈", "🌊",
        ],
    },
    {
        icon: "🍕",
        label: "Food",
        emojis: [
            "🍎", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍒", "🍑",
            "🥭", "🍍", "🥥", "🥝", "🍅", "🍆", "🥑", "🥦", "🌽", "🥕",
            "🧄", "🥔", "🍞", "🥐", "🧀", "🥚", "🍳", "🥞", "🥓", "🍗",
            "🍖", "🌭", "🍔", "🍟", "🍕", "🌮", "🌯", "🍝", "🍜", "🍛",
            "🍣", "🍱", "🍤", "🍙", "🍚", "🍧", "🍨", "🍦", "🧁", "🍰",
            "🎂", "🍭", "🍬", "🍫", "🍿", "🍩", "🍪",
        ],
    },
    {
        icon: "⚽",
        label: "Sports",
        emojis: [
            "⚽", "🏀", "🏈", "⚾", "🎾", "🏐", "🏉", "🎱", "🏓", "🏸",
            "🥊", "🥋", "🥇", "🥈", "🥉", "🏆", "🏅", "🎽", "🛹", "⛸️",
            "🎿", "🏋️", "🤸", "⛹️", "🏄", "🏊", "🚴", "🏎️", "💪", "🔥",
        ],
    },
    {
        icon: "✈️",
        label: "Travel",
        emojis: [
            "🚗", "🚕", "🚙", "🚌", "🏎️", "🚓", "🚑", "🚒", "🛻", "🚚",
            "🛵", "🏍️", "🚲", "🛴", "🚆", "🚇", "🚊", "🚉", "✈️", "🛫",
            "🛬", "🚁", "🚀", "🛸", "⛵", "🚤", "🛥️", "🚢", "🗽", "🗼",
            "🏰", "🏯", "🏟️", "🏛️", "⛺", "🏖️", "🏝️", "🏜️", "🌋", "🏔️",
        ],
    },
    {
        icon: "💻",
        label: "Tech",
        emojis: [
            "💻", "🖥️", "🖨️", "⌨️", "🖱️", "💾", "💿", "📀", "📱", "📲",
            "☎️", "📞", "📟", "📠", "🔋", "🔌", "💡", "🔦", "📡", "📷",
            "📸", "📹", "🎥", "📺", "📻", "🎙️", "⏱️", "⏰", "⌚", "🧮",
            "🔬", "🔭", "🧪", "🧬", "⚙️", "🔧", "🔨", "🛠️", "🔩",
        ],
    },
    {
        icon: "📚",
        label: "Objects",
        emojis: [
            "📚", "📖", "📕", "📗", "📘", "📙", "📓", "📔", "📒", "📝",
            "📃", "📜", "📄", "📑", "🔖", "🏷️", "💰", "💵", "💳", "🪙",
            "💎", "⚖️", "🔑", "🗝️", "🔒", "🔓", "🔨", "🪓", "⛏️", "🔧",
            "🔩", "⚙️", "🔫", "🧲", "🪜", "🧯", "🛒", "🎒", "👜", "👛",
            "💼", "📦", "✉️", "📧", "📬", "📮", "📫",
        ],
    },
    {
        icon: "🔣",
        label: "Symbols",
        emojis: [
            "❤️", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝",
            "💟", "✅", "❌", "⭕", "❗", "❕", "❓", "❔", "‼️", "⁉️",
            "⚠️", "🚫", "⛔", "🔞", "♻️", "✔️", "☑️", "🔴", "🟠", "🟡",
            "🟢", "🔵", "🟣", "⚫", "⚪", "🟤", "🔶", "🔷", "🔸", "🔹",
            "➕", "➖", "✖️", "➗", "🟰", "™️", "©️", "®️", "🔱", "⚜️",
            "☮️", "☯️", "✝️", "🕉️", "✡️",
        ],
    },
];

const EMOJI_COLUMNS = 8;
const CELL_SIZE = (SCREEN_WIDTH - scale(40)) / EMOJI_COLUMNS;

// ─────────────────────────────────────────────
// EMOJI GRID POPUP
// ─────────────────────────────────────────────
const EmojiGridPopup = ({
    visible, onSelect, onClose, currentUserReaction,
}: {
    visible: boolean;
    onSelect: (emoji: string) => void;
    onClose: () => void;
    currentUserReaction?: string;
}) => {
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState(0);

    const filteredEmojis = useMemo(() => {
        if (!search.trim()) return null;
        return EMOJI_CATEGORIES.flatMap(c => c.emojis).filter(e => e.includes(search.trim()));
    }, [search]);

    const displayEmojis = filteredEmojis ?? EMOJI_CATEGORIES[activeCategory].emojis;

    const handleClose = () => { setSearch(''); setActiveCategory(0); onClose(); };
    const handleSelect = (emoji: string) => { setSearch(''); setActiveCategory(0); onSelect(emoji); };

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose} statusBarTranslucent>
            <TouchableWithoutFeedback onPress={handleClose}>
                <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(150)} style={popupStyles.overlay}>
                    <TouchableWithoutFeedback>
                        <Animated.View entering={FadeInUp.duration(300).springify()} exiting={FadeOutDown.duration(200)} style={popupStyles.sheet}>
                            <View style={popupStyles.handle} />
                            <View style={popupStyles.header}>
                                <View style={popupStyles.headerLeft}>
                                    <Typo size={17} fontWeight="700" color={colors.neutral900}>React</Typo>
                                    {currentUserReaction && (
                                        <View style={popupStyles.currentBadge}>
                                            <Typo size={14}>{currentUserReaction}</Typo>
                                            <Typo size={11} color={colors.neutral500} fontWeight="500">Your reaction</Typo>
                                        </View>
                                    )}
                                </View>
                                <TouchableOpacity onPress={handleClose} activeOpacity={0.7} style={popupStyles.closeBtn}>
                                    <Icons.X size={verticalScale(15)} color={colors.neutral600} weight="bold" />
                                </TouchableOpacity>
                            </View>
                            <View style={popupStyles.searchWrap}>
                                <Icons.MagnifyingGlass size={verticalScale(15)} color={colors.neutral400} />
                                <TextInput
                                    value={search}
                                    onChangeText={setSearch}
                                    placeholder="Search emoji..."
                                    placeholderTextColor={colors.neutral400}
                                    style={popupStyles.searchInput}
                                />
                                {search.length > 0 && (
                                    <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7}>
                                        <Icons.XCircle size={verticalScale(16)} color={colors.neutral400} weight="fill" />
                                    </TouchableOpacity>
                                )}
                            </View>
                            {!search.trim() && (
                                <View style={popupStyles.categoryRow}>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={popupStyles.categoryScroll}>
                                        {EMOJI_CATEGORIES.map((cat, index) => {
                                            const isActive = activeCategory === index;
                                            return (
                                                <TouchableOpacity key={index} onPress={() => setActiveCategory(index)} activeOpacity={0.7} style={[popupStyles.categoryTab, isActive && popupStyles.categoryTabActive]}>
                                                    <Typo size={20}>{cat.icon}</Typo>
                                                    {isActive && <Typo size={9} fontWeight="700" color={colors.primaryDark} style={popupStyles.categoryTabLabel}>{cat.label.toUpperCase()}</Typo>}
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>
                                </View>
                            )}
                            {search.trim() ? (
                                <Typo size={11} color={colors.neutral400} fontWeight="600" style={popupStyles.resultLabel}>{filteredEmojis?.length ?? 0} RESULTS</Typo>
                            ) : (
                                <Typo size={11} color={colors.neutral400} fontWeight="600" style={popupStyles.resultLabel}>
                                    {EMOJI_CATEGORIES[activeCategory].label.toUpperCase()} {" · "} {EMOJI_CATEGORIES[activeCategory].emojis.length}
                                </Typo>
                            )}
                            <View style={popupStyles.divider} />
                            {displayEmojis.length === 0 ? (
                                <View style={popupStyles.emptyWrap}>
                                    <Typo size={40}>🔍</Typo>
                                    <Typo size={14} fontWeight="600" color={colors.neutral600}>No emoji found</Typo>
                                    <Typo size={12} color={colors.neutral400}>Try a different search</Typo>
                                </View>
                            ) : (
                                <FlatList
                                    data={displayEmojis}
                                    keyExtractor={(e, i) => `${e}-${i}`}
                                    numColumns={EMOJI_COLUMNS}
                                    showsVerticalScrollIndicator={false}
                                    contentContainerStyle={popupStyles.grid}
                                    columnWrapperStyle={popupStyles.gridRow}
                                    renderItem={({ item: emoji }) => {
                                        const isSelected = currentUserReaction === emoji;
                                        return (
                                            <TouchableOpacity onPress={() => handleSelect(emoji)} activeOpacity={0.6} style={[popupStyles.emojiCell, isSelected && popupStyles.emojiCellSelected]}>
                                                <Typo size={24}>{emoji}</Typo>
                                            </TouchableOpacity>
                                        );
                                    }}
                                />
                            )}
                        </Animated.View>
                    </TouchableWithoutFeedback>
                </Animated.View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const popupStyles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    sheet: {
        backgroundColor: colors.white, borderTopLeftRadius: radius._30,
        borderTopRightRadius: radius._30, borderCurve: "continuous",
        paddingBottom: verticalScale(34), height: SCREEN_HEIGHT * 0.6,
    },
    handle: {
        width: scale(36), height: verticalScale(4), borderRadius: radius.full,
        backgroundColor: colors.neutral300, alignSelf: "center",
        marginTop: verticalScale(10), marginBottom: verticalScale(4),
    },
    header: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: spacingX._20, paddingVertical: spacingY._12,
    },
    headerLeft: { flexDirection: "row", alignItems: "center", gap: spacingX._10 },
    currentBadge: {
        flexDirection: "row", alignItems: "center", gap: spacingX._5,
        backgroundColor: colors.primaryLight, paddingHorizontal: spacingX._10,
        paddingVertical: spacingY._5, borderRadius: radius.full,
        borderWidth: 1, borderColor: colors.primary,
    },
    closeBtn: {
        width: scale(30), height: scale(30), borderRadius: radius.full,
        backgroundColor: colors.neutral100, alignItems: "center", justifyContent: "center",
    },
    searchWrap: {
        flexDirection: "row", alignItems: "center", gap: spacingX._10,
        marginHorizontal: spacingX._20, marginBottom: spacingY._10,
        backgroundColor: colors.neutral100, borderRadius: radius.full,
        paddingHorizontal: spacingX._15, paddingVertical: spacingY._10,
        borderWidth: 1, borderColor: colors.neutral200,
    },
    searchInput: { flex: 1, fontSize: scale(14), color: colors.neutral800, padding: 0, margin: 0 },
    categoryRow: { marginBottom: spacingY._7 },
    categoryScroll: { paddingHorizontal: spacingX._15, gap: spacingX._5 },
    categoryTab: {
        alignItems: "center", justifyContent: "center",
        paddingHorizontal: spacingX._10, paddingVertical: spacingY._7,
        borderRadius: radius._12, minWidth: scale(44), gap: 2,
    },
    categoryTabActive: { backgroundColor: colors.primaryLight, borderWidth: 1, borderColor: colors.primary },
    categoryTabLabel: { letterSpacing: 0.3 },
    resultLabel: { paddingHorizontal: spacingX._20, marginBottom: spacingY._7, letterSpacing: 0.5 },
    divider: { height: 1, backgroundColor: colors.neutral100, marginHorizontal: spacingX._20, marginBottom: spacingY._7 },
    grid: { paddingHorizontal: spacingX._10, paddingBottom: spacingY._20 },
    gridRow: { justifyContent: "flex-start" },
    emojiCell: { width: CELL_SIZE, height: CELL_SIZE, alignItems: "center", justifyContent: "center", borderRadius: radius._10 },
    emojiCellSelected: { backgroundColor: colors.primaryLight, borderWidth: 1.5, borderColor: colors.primary },
    emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacingY._10, paddingBottom: verticalScale(40) },
});

// ─────────────────────────────────────────────
// VOICE MESSAGE PLAYER
// ─────────────────────────────────────────────
const VoiceMessageBubble = ({ voiceUrl, voiceDuration = 0, isMe }: { voiceUrl: string; voiceDuration: number; isMe: boolean }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(0);
    const [totalDuration, setTotalDuration] = useState(voiceDuration);
    const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);
    const player = useAudioPlayer(voiceUrl, { updateInterval: 200 });
    const status = useAudioPlayerStatus(player);
    const BARS = [3, 5, 8, 6, 10, 7, 4, 9, 6, 8, 5, 7, 10, 4, 6, 8, 5, 9, 7, 4, 6, 8, 10, 5, 7];
    const progress = totalDuration > 0 ? currentTime / totalDuration : 0;
    const dot1 = useSharedValue(1);
    const dot2 = useSharedValue(1);
    const dot3 = useSharedValue(1);

    useEffect(() => {
        setIsPlaying(status.playing);
        setIsLoading(!status.isLoaded);
        if (status.isLoaded) {
            setCurrentTime(Math.max(0, status.currentTime || 0));
            if (status.duration > 0) setTotalDuration(Math.floor(status.duration));
        }
        if (status.didJustFinish) { setIsPlaying(false); setCurrentTime(0); clearProgressInterval(); }
    }, [status.playing, status.isLoaded, status.currentTime, status.duration, status.didJustFinish]);

    useEffect(() => {
        if (isPlaying) {
            dot1.value = withRepeat(withTiming(1.8, { duration: 400 }), -1, true);
            dot2.value = withRepeat(withTiming(1.8, { duration: 500 }), -1, true);
            dot3.value = withRepeat(withTiming(1.8, { duration: 600 }), -1, true);
        } else {
            dot1.value = withTiming(1); dot2.value = withTiming(1); dot3.value = withTiming(1);
        }
    }, [isPlaying]);

    const dot1Style = useAnimatedStyle(() => ({ transform: [{ scaleY: dot1.value }] }));
    const dot2Style = useAnimatedStyle(() => ({ transform: [{ scaleY: dot2.value }] }));
    const dot3Style = useAnimatedStyle(() => ({ transform: [{ scaleY: dot3.value }] }));

    const clearProgressInterval = () => {
        if (progressInterval.current) { clearInterval(progressInterval.current); progressInterval.current = null; }
    };

    const startProgressTracking = () => {
        clearProgressInterval();
        progressInterval.current = setInterval(() => {
            if (!player.isLoaded) return;
            const nextTime = Math.max(0, player.currentTime || 0);
            setCurrentTime(nextTime);
            if (!player.playing && player.duration > 0 && nextTime >= player.duration) {
                setIsPlaying(false); setCurrentTime(0); clearProgressInterval();
            }
        }, 200);
    };

    const handlePlayPause = async () => {
        try {
            if (isPlaying) { player.pause(); setIsPlaying(false); clearProgressInterval(); return; }
            setIsLoading(!player.isLoaded);
            await setAudioModeAsync({ playsInSilentMode: true });
            player.play();
            setIsLoading(false); setIsPlaying(true);
            startProgressTracking();
        } catch (error) {
            console.log("Voice playback error:", error);
            setIsLoading(false); setIsPlaying(false); clearProgressInterval();
        }
    };

    useEffect(() => { return () => { clearProgressInterval(); }; }, []);

    const activeColor = isMe ? colors.neutral700 : colors.primary;
    const inactiveColor = isMe ? "rgba(0,0,0,0.2)" : colors.neutral300;

    return (
        <View style={voiceStyles.container}>
            <TouchableOpacity onPress={handlePlayPause} activeOpacity={0.7} style={[voiceStyles.playBtn, { backgroundColor: activeColor }]}>
                {isLoading ? (
                    <View style={voiceStyles.loadingDots}>
                        {[dot1Style, dot2Style, dot3Style].map((style, i) => (
                            <Animated.View key={i} style={[voiceStyles.loadingDot, { backgroundColor: colors.white }, style]} />
                        ))}
                    </View>
                ) : isPlaying ? (
                    <Icons.Pause size={verticalScale(16)} color={colors.white} weight="fill" />
                ) : (
                    <Icons.Play size={verticalScale(16)} color={colors.white} weight="fill" />
                )}
            </TouchableOpacity>
            <View style={voiceStyles.rightSection}>
                <View style={voiceStyles.waveform}>
                    {BARS.map((height, index) => {
                        const barProgress = index / BARS.length;
                        const isActive = barProgress <= progress;
                        return <View key={index} style={[voiceStyles.bar, { height: verticalScale(height), backgroundColor: isActive ? activeColor : inactiveColor }]} />;
                    })}
                </View>
                <Typo size={10} fontWeight="500" color={isMe ? colors.neutral600 : colors.neutral500}>
                    {isPlaying || currentTime > 0 ? `${formatDuration(currentTime)} / ${formatDuration(totalDuration)}` : formatDuration(totalDuration)}
                </Typo>
            </View>
        </View>
    );
};

const voiceStyles = StyleSheet.create({
    container: { flexDirection: "row", alignItems: "center", gap: spacingX._10, minWidth: scale(180), maxWidth: scale(220) },
    playBtn: { width: scale(36), height: scale(36), borderRadius: radius.full, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    loadingDots: { flexDirection: "row", alignItems: "center", gap: 2 },
    loadingDot: { width: 4, height: 4, borderRadius: 2 },
    rightSection: { flex: 1, gap: 4 },
    waveform: { flexDirection: "row", alignItems: "center", gap: 2, height: verticalScale(20) },
    bar: { width: 3, borderRadius: 2 },
});

const CallMessageBubble = ({
    kind,
    status,
    duration = 0,
    isMe,
    formattedTime,
}: {
    kind: "voice" | "video";
    status: string;
    duration?: number;
    isMe: boolean;
    formattedTime?: string;
}) => {
    const isVideo = kind === "video";
    const isMissed =
        status === "missed" ||
        status === "rejected" ||
        status === "failed";

    const iconColor = isMissed
        ? colors.rose
        : colors.green;

    const formatCallDuration = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;

        return `${m}:${s.toString().padStart(2, "0")}`;
    };

    let title = "";

    if (status === "missed") {
        title = `Missed ${isVideo ? "video" : "voice"} call`;
    } else if (status === "rejected") {
        title = `Declined ${isVideo ? "video" : "voice"} call`;
    } else if (status === "failed") {
        title = `${isVideo ? "Video" : "Voice"} call failed`;
    } else {
        title = isVideo
            ? "Video call"
            : "Voice call";
    }

    return (
        <View
            style={[
                callMessageBubbleStyles.callBubble,
                isMe
                    ? callMessageBubbleStyles.callBubbleMe
                    : callMessageBubbleStyles.callBubbleOther,
            ]}
        >
            <View
                style={[
                    callMessageBubbleStyles.callIcon,
                    {
                        backgroundColor:
                            `${iconColor}22`,
                    },
                ]}
            >
                {isVideo ? (
                    <Icons.VideoCamera
                        size={22}
                        color={iconColor}
                        weight="fill"
                    />
                ) : (
                    <Icons.Phone
                        size={22}
                        color={iconColor}
                        weight="fill"
                    />
                )}
            </View>

            <View style={callMessageBubbleStyles.callInfo}>
                <Typo
                    size={15}
                    color={colors.white}
                    fontWeight="700"
                >
                    {title}
                </Typo>

                <View style={callMessageBubbleStyles.metaRow}>
                    <Typo
                        size={12}
                        color="rgba(255,255,255,0.65)"
                    >
                        {isMissed
                            ? status === "missed"
                                ? "Missed call"
                                : status === "rejected"
                                    ? "Declined"
                                    : "Failed"
                            : duration > 0
                                ? formatCallDuration(duration)
                                : "Connected"}
                    </Typo>
                    {formattedTime ? (
                        <>
                            <View style={callMessageBubbleStyles.metaDot} />
                            <Typo
                                size={12}
                                color="rgba(255,255,255,0.5)"
                            >
                                {formattedTime}
                            </Typo>
                        </>
                    ) : null}
                </View>
            </View>
        </View>
    );
};

const callMessageBubbleStyles = StyleSheet.create({
    callBubble: {
        flexDirection: "row",
        alignItems: "center",
        minWidth: 210,
        paddingHorizontal: spacingX._15,
        paddingVertical: spacingY._12,
        borderRadius: radius._15,
    },

    callBubbleMe: {
        backgroundColor: "#3F3A12",
    },

    callBubbleOther: {
        backgroundColor: "#242424",
    },

    callIcon: {
        width: 44,
        height: 44,
        borderRadius: radius.full,
        alignItems: "center",
        justifyContent: "center",
        marginRight: spacingX._12,
    },

    callInfo: {
        flex: 1,
        gap: spacingY._5,
    },

    metaRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacingX._7,
    },

    metaDot: {
        width: 3,
        height: 3,
        borderRadius: radius.full,
        backgroundColor: "rgba(255,255,255,0.35)",
    },
});

// ─────────────────────────────────────────────
// FILE BUBBLE
// ─────────────────────────────────────────────
const FileBubble = ({ meta, isMe }: { meta: AttachmentMetaProps; isMe: boolean }) => {
    const handleOpen = async () => {
        try {
            const supported = await Linking.canOpenURL(meta.url);
            if (supported) await Linking.openURL(meta.url);
            else Alert.alert("Cannot open", "No app found to open this file type.");
        } catch { Alert.alert("Error", "Could not open the file."); }
    };

    return (
        <TouchableOpacity onPress={handleOpen} activeOpacity={0.75} style={[fileBubbleStyles.container, isMe ? fileBubbleStyles.myContainer : fileBubbleStyles.theirContainer]}>
            <View style={[fileBubbleStyles.iconWrap, { backgroundColor: isMe ? "rgba(0,0,0,0.06)" : colors.neutral100 }]}>
                <Typo size={26}>{getFileIcon(meta.mimeType)}</Typo>
            </View>
            <View style={fileBubbleStyles.info}>
                <Typo size={13} fontWeight="600" color={colors.neutral900} textProps={{ numberOfLines: 2 }}>{meta.name}</Typo>
                <Typo size={11} color={colors.neutral500} fontWeight="400">{formatFileSize(meta.size)}</Typo>
            </View>
            <View style={fileBubbleStyles.arrowWrap}>
                <Icons.ArrowSquareOut size={verticalScale(18)} color={isMe ? colors.neutral600 : colors.neutral500} weight="regular" />
            </View>
        </TouchableOpacity>
    );
};

const fileBubbleStyles = StyleSheet.create({
    container: { flexDirection: "row", alignItems: "center", gap: spacingX._10, borderRadius: radius._12, padding: spacingX._12, minWidth: scale(200), maxWidth: scale(240), borderWidth: 1 },
    myContainer: { backgroundColor: "rgba(0,0,0,0.04)", borderColor: "rgba(0,0,0,0.08)" },
    theirContainer: { backgroundColor: colors.white, borderColor: colors.neutral200 },
    iconWrap: { width: scale(44), height: scale(44), borderRadius: radius._10, alignItems: "center", justifyContent: "center", flexShrink: 0, borderWidth: 1, borderColor: colors.neutral200 },
    info: { flex: 1, gap: 3 },
    arrowWrap: { flexShrink: 0 },
});

// ─────────────────────────────────────────────
// POLL BUBBLE
// ─────────────────────────────────────────────
const PollBubble = ({
    messageId,
    conversationId,
    poll,
    isMe,
    currentUserId,
    senderName,
    formattedTime,
}: {
    messageId: string;
    conversationId: string;
    poll: PollProps;
    isMe: boolean;
    currentUserId: string;
    senderName?: string;
    formattedTime?: string;
}) => {
    const [, setTick] = useState(0);

    useEffect(() => {
        if (!poll.endsAt || poll.isClosed) return;

        const interval = setInterval(() => {
            setTick(value => value + 1);
        }, 1000);

        return () => clearInterval(interval);
    }, [poll.endsAt, poll.isClosed]);

    const totalVotes = poll.options.reduce(
        (sum, option) => sum + option.votes.length,
        0
    );

    const myVotedOptionIds = poll.options
        .filter(option =>
            option.votes.some(
                vote => String(vote.userId) === String(currentUserId)
            )
        )
        .map(option => option.id);

    const isPollEnded =
        poll.isClosed ||
        (poll.endsAt ? new Date() >= new Date(poll.endsAt) : false);

    const maxVotes = Math.max(
        ...poll.options.map(option => option.votes.length),
        0
    );

    const remainingLabel = (() => {
        if (poll.isClosed) return "Poll closed";
        if (!poll.endsAt) return "No end time";

        const diff = new Date(poll.endsAt).getTime() - Date.now();
        if (diff <= 0) return "Voting ended";

        const totalSeconds = Math.floor(diff / 1000);
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (days > 0) return `${days}d ${hours}h left`;
        if (hours > 0) return `${hours}h ${minutes}m left`;
        if (minutes > 0) return `${minutes}m ${seconds}s left`;
        return `${seconds}s left`;
    })();

    const handleVote = (optionId: string) => {
        if (isPollEnded) return;

        votePoll({
            messageId,
            conversationId,
            optionId,
        });
    };

    const handleClose = () => {
        Alert.alert(
            "Close Poll",
            "Are you sure? No more votes will be accepted.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Close Poll",
                    style: "destructive",
                    onPress: () =>
                        closePoll({
                            messageId,
                            conversationId,
                        }),
                },
            ]
        );
    };

    return (
        <Animated.View
            entering={FadeInUp.duration(220)}
            style={pollStyles.card}
        >
            {/* ── Top identity row ── */}
            <View style={pollStyles.topRow}>
                <View style={pollStyles.pollBadge}>
                    <Icons.ChartBar
                        size={verticalScale(16)}
                        color={colors.primaryDark}
                        weight="fill"
                    />
                </View>

                <View style={pollStyles.topText}>
                    <View style={pollStyles.titleRow}>
                        <Typo
                            size={12}
                            fontWeight="800"
                            color={colors.neutral900}
                        >
                            POLL
                        </Typo>

                        <View
                            style={[
                                pollStyles.statusDot,
                                isPollEnded
                                    ? pollStyles.statusClosed
                                    : pollStyles.statusLive,
                            ]}
                        />

                        <Typo
                            size={10}
                            fontWeight="700"
                            color={
                                isPollEnded
                                    ? colors.neutral500
                                    : colors.green
                            }
                        >
                            {isPollEnded ? "CLOSED" : "LIVE"}
                        </Typo>
                    </View>

                    {senderName && (
                        <Typo
                            size={10}
                            color={colors.neutral500}
                            fontWeight="500"
                            textProps={{ numberOfLines: 1 }}
                        >
                            {isMe ? "You" : senderName}
                        </Typo>
                    )}
                </View>

                <View style={pollStyles.headerChartBadge}>
                    <Icons.ChartPieSlice
                        size={verticalScale(15)}
                        color={colors.primaryDark}
                        weight="duotone"
                    />
                </View>
            </View>

            {/* ── Question ── */}
            <View style={pollStyles.questionCard}>
                <Typo
                    size={17}
                    fontWeight="800"
                    color={colors.neutral900}
                    style={pollStyles.question}
                >
                    {poll.question}
                </Typo>

                <View style={pollStyles.metaRow}>
                    <View style={pollStyles.metaItem}>
                        <Icons.UsersThree
                            size={verticalScale(12)}
                            color={colors.neutral500}
                        />
                        <Typo
                            size={10}
                            color={colors.neutral500}
                            fontWeight="600"
                        >
                            {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
                        </Typo>
                    </View>

                    <View style={pollStyles.metaDivider} />

                    <View style={pollStyles.metaItem}>
                        <Icons.Timer
                            size={verticalScale(12)}
                            color={
                                isPollEnded
                                    ? colors.neutral500
                                    : colors.primaryDark
                            }
                        />
                        <Typo
                            size={10}
                            color={
                                isPollEnded
                                    ? colors.neutral500
                                    : colors.primaryDark
                            }
                            fontWeight="700"
                        >
                            {remainingLabel}
                        </Typo>
                    </View>
                </View>

                <View style={pollStyles.chipRow}>
                    <View style={pollStyles.chip}>
                        <Icons.CheckCircle
                            size={verticalScale(11)}
                            color={colors.primaryDark}
                            weight="fill"
                        />
                        <Typo
                            size={9}
                            color={colors.primaryDark}
                            fontWeight="700"
                        >
                            {poll.allowMultiple ? "MULTIPLE CHOICE" : "ONE CHOICE"}
                        </Typo>
                    </View>

                    {poll.isAnonymous && (
                        <View style={pollStyles.chipMuted}>
                            <Icons.LockSimple
                                size={verticalScale(11)}
                                color={colors.neutral600}
                            />
                            <Typo
                                size={9}
                                color={colors.neutral600}
                                fontWeight="700"
                            >
                                ANONYMOUS
                            </Typo>
                        </View>
                    )}
                </View>
            </View>

            {/* ── Options ── */}
            <View style={pollStyles.options}>
                {poll.options.map((option, index) => {
                    const voteCount = option.votes.length;
                    const percentage =
                        totalVotes > 0
                            ? Math.round((voteCount / totalVotes) * 100)
                            : 0;
                    const isVoted = myVotedOptionIds.includes(option.id);
                    const isWinner =
                        isPollEnded &&
                        voteCount === maxVotes &&
                        voteCount > 0;
                    const showResults =
                        myVotedOptionIds.length > 0 || isPollEnded;

                    return (
                        <TouchableOpacity
                            key={option.id}
                            onPress={() => handleVote(option.id)}
                            activeOpacity={isPollEnded ? 1 : 0.8}
                            style={[
                                pollStyles.option,
                                isVoted && pollStyles.optionVoted,
                                isWinner && pollStyles.optionWinner,
                            ]}
                        >
                            {showResults && (
                                <View
                                    style={[
                                        pollStyles.progress,
                                        {
                                            width: `${percentage}%`,
                                            backgroundColor: isVoted
                                                ? colors.primary
                                                : colors.neutral300,
                                        },
                                    ]}
                                />
                            )}

                            <View style={pollStyles.optionContent}>
                                <View style={pollStyles.optionLeft}>
                                    <View
                                        style={[
                                            pollStyles.radio,
                                            isVoted && pollStyles.radioActive,
                                        ]}
                                    >
                                        {isVoted && (
                                            <Icons.Check
                                                size={10}
                                                color={colors.white}
                                                weight="bold"
                                            />
                                        )}
                                    </View>

                                    <View style={pollStyles.optionTextWrap}>
                                        <Typo
                                            size={14}
                                            fontWeight={
                                                isVoted ? "800" : "600"
                                            }
                                            color={colors.neutral900}
                                            style={pollStyles.optionText}
                                        >
                                            {option.text}
                                        </Typo>

                                        {showResults && (
                                            <Typo
                                                size={10}
                                                color={colors.neutral500}
                                                fontWeight="500"
                                            >
                                                {voteCount} {voteCount === 1 ? "vote" : "votes"}
                                            </Typo>
                                        )}
                                    </View>

                                    {isWinner && (
                                        <View style={pollStyles.winnerBadge}>
                                            <Icons.Trophy
                                                size={verticalScale(13)}
                                                color={colors.primaryDark}
                                                weight="fill"
                                            />
                                        </View>
                                    )}
                                </View>

                                {showResults && (
                                    <Typo
                                        size={14}
                                        fontWeight="800"
                                        color={
                                            isVoted
                                                ? colors.primaryDark
                                                : colors.neutral600
                                        }
                                    >
                                        {percentage}%
                                    </Typo>
                                )}
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* ── Bottom row ── */}
            <View style={pollStyles.bottomRow}>
                <View style={pollStyles.bottomInfo}>
                    <Icons.ChartBar
                        size={verticalScale(12)}
                        color={colors.neutral400}
                    />
                    <Typo
                        size={10}
                        color={colors.neutral500}
                        fontWeight="600"
                    >
                        {totalVotes} {totalVotes === 1 ? "response" : "responses"}
                    </Typo>

                    {myVotedOptionIds.length > 0 && !isPollEnded && (
                        <>
                            <View style={pollStyles.bottomDot} />
                            <Typo
                                size={10}
                                color={colors.primaryDark}
                                fontWeight="700"
                            >
                                You voted
                            </Typo>
                        </>
                    )}
                </View>

                {isMe && !isPollEnded ? (
                    <TouchableOpacity
                        onPress={handleClose}
                        activeOpacity={0.75}
                        style={pollStyles.closeButton}
                    >
                        <Icons.LockKey
                            size={verticalScale(12)}
                            color={colors.rose}
                            weight="bold"
                        />
                        <Typo
                            size={10}
                            fontWeight="700"
                            color={colors.rose}
                        >
                            Close
                        </Typo>
                    </TouchableOpacity>
                ) : isPollEnded ? (
                    <View style={pollStyles.closedPill}>
                        <Icons.LockSimple
                            size={verticalScale(11)}
                            color={colors.neutral500}
                        />
                        <Typo
                            size={9}
                            fontWeight="700"
                            color={colors.neutral500}
                        >
                            CLOSED
                        </Typo>
                    </View>
                ) : null}
            </View>

            {formattedTime && (
                <Typo
                    size={9}
                    color={colors.neutral400}
                    fontWeight="500"
                    style={pollStyles.time}
                >
                    {formattedTime}
                </Typo>
            )}
        </Animated.View>
    );
};

const pollStyles = StyleSheet.create({
    card: {
        width: scale(300),
        maxWidth: "100%",
        backgroundColor: colors.white,
        borderRadius: radius._20,
        borderWidth: 1,
        borderColor: colors.neutral200,
        padding: spacingX._12,
        gap: spacingY._10,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
    },
    topRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacingX._10,
    },
    pollBadge: {
        width: scale(38),
        height: scale(38),
        borderRadius: radius._12,
        backgroundColor: colors.primaryLight,
        alignItems: "center",
        justifyContent: "center",
    },
    topText: {
        flex: 1,
        gap: 2,
    },
    titleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacingX._5,
    },
    statusDot: {
        width: scale(6),
        height: scale(6),
        borderRadius: radius.full,
    },
    statusLive: {
        backgroundColor: colors.green,
    },
    statusClosed: {
        backgroundColor: colors.neutral400,
    },
    headerChartBadge: {
        width: scale(30),
        height: scale(30),
        borderRadius: radius.full,
        backgroundColor: colors.neutral50,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: colors.neutral200,
    },
    questionCard: {
        backgroundColor: colors.neutral50,
        borderRadius: radius._15,
        borderWidth: 1,
        borderColor: colors.neutral100,
        padding: spacingX._12,
        gap: spacingY._7,
    },
    question: {
        lineHeight: verticalScale(24),
    },
    metaRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacingX._7,
    },
    metaItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacingX._5,
    },
    metaDivider: {
        width: 3,
        height: 3,
        borderRadius: radius.full,
        backgroundColor: colors.neutral300,
    },
    chipRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacingX._5,
        flexWrap: "wrap",
    },
    chip: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacingX._5,
        paddingHorizontal: spacingX._7,
        paddingVertical: verticalScale(4),
        borderRadius: radius.full,
        backgroundColor: colors.primaryLight,
    },
    chipMuted: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacingX._5,
        paddingHorizontal: spacingX._7,
        paddingVertical: verticalScale(4),
        borderRadius: radius.full,
        backgroundColor: colors.neutral100,
    },
    options: {
        gap: spacingY._7,
    },
    option: {
        minHeight: verticalScale(56),
        borderRadius: radius._12,
        borderWidth: 1.5,
        borderColor: colors.neutral200,
        backgroundColor: colors.white,
        overflow: "hidden",
        justifyContent: "center",
    },
    optionVoted: {
        borderColor: colors.primary,
        backgroundColor: colors.primaryLight,
    },
    optionWinner: {
        borderColor: colors.primaryDark,
        backgroundColor: colors.primaryLight,
    },
    progress: {
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        opacity: 0.18,
    },
    optionContent: {
        minHeight: verticalScale(56),
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: spacingX._10,
        paddingVertical: spacingY._7,
        zIndex: 1,
    },
    optionLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacingX._7,
        flex: 1,
        paddingRight: spacingX._7,
    },
    radio: {
        width: scale(21),
        height: scale(21),
        borderRadius: radius.full,
        borderWidth: 2,
        borderColor: colors.neutral300,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        backgroundColor: colors.white,
    },
    radioActive: {
        borderColor: colors.primaryDark,
        backgroundColor: colors.primaryDark,
    },
    optionTextWrap: {
        flex: 1,
        gap: 2,
    },
    optionText: {
        lineHeight: verticalScale(19),
    },
    winnerBadge: {
        width: scale(26),
        height: scale(26),
        borderRadius: radius.full,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.primaryLight,
    },
    bottomRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: spacingY._5,
        borderTopWidth: 1,
        borderTopColor: colors.neutral100,
    },
    bottomInfo: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacingX._5,
        flex: 1,
    },
    bottomDot: {
        width: 3,
        height: 3,
        borderRadius: radius.full,
        backgroundColor: colors.neutral300,
    },
    closeButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacingX._5,
        paddingHorizontal: spacingX._7,
        paddingVertical: spacingY._5,
        borderRadius: radius.full,
        backgroundColor: "#fef2f2",
        borderWidth: 1,
        borderColor: "#fecaca",
    },
    closedPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacingX._5,
        paddingHorizontal: spacingX._7,
        paddingVertical: spacingY._5,
        borderRadius: radius.full,
        backgroundColor: colors.neutral100,
    },
    time: {
        textAlign: "right",
    },
});

// ─────────────────────────────────────────────
// QUOTED BUBBLE
// ─────────────────────────────────────────────
const QuotedBubble = ({ replyTo, isMe }: { replyTo: ReplyToProps; isMe: boolean }) => (
    <View style={[quotedStyles.container, isMe ? quotedStyles.myQuoted : quotedStyles.theirQuoted]}>
        <View style={[quotedStyles.bar, isMe ? quotedStyles.myBar : quotedStyles.theirBar]} />
        <View style={quotedStyles.textWrap}>
            <Typo size={11} fontWeight="700" color={colors.neutral700}>{replyTo.senderName}</Typo>
            <Typo size={12} color={colors.neutral500} textProps={{ numberOfLines: 1 }}>
                {replyTo.voiceUrl ? "🎤 Voice message" : replyTo.type === "file" ? "📎 File" : replyTo.content || "📷 Image"}
            </Typo>
        </View>
    </View>
);

const quotedStyles = StyleSheet.create({
    container: { flexDirection: "row", borderRadius: radius._10, overflow: "hidden", marginBottom: spacingY._5 },
    myQuoted: { backgroundColor: "rgba(0,0,0,0.06)" },
    theirQuoted: { backgroundColor: "rgba(0,0,0,0.06)" },
    bar: { width: 3, borderRadius: 2 },
    myBar: { backgroundColor: colors.neutral600 },
    theirBar: { backgroundColor: colors.primary },
    textWrap: { flex: 1, paddingHorizontal: spacingX._10, paddingVertical: spacingY._7, gap: 2 },
});

// ─────────────────────────────────────────────
// REACTION BAR
// ─────────────────────────────────────────────
const ReactionBar = ({ reactions, isMe, currentUserId, onPress }: { reactions: ReactionProps[]; isMe: boolean; currentUserId: string; onPress: (emoji: string) => void }) => {
    const grouped: Record<string, { count: number; users: string[]; hasMe: boolean }> = {};
    reactions.forEach(r => {
        if (!grouped[r.emoji]) grouped[r.emoji] = { count: 0, users: [], hasMe: false };
        grouped[r.emoji].count++;
        grouped[r.emoji].users.push(r.userName);
        if (r.userId === currentUserId) grouped[r.emoji].hasMe = true;
    });
    const entries = Object.entries(grouped);
    if (entries.length === 0) return null;

    return (
        <Animated.View entering={FadeIn.duration(200)} style={[reactionBarStyles.container, isMe ? reactionBarStyles.myAlign : reactionBarStyles.theirAlign]}>
            {entries.map(([emoji, data]) => (
                <TouchableOpacity key={emoji} onPress={() => onPress(emoji)} activeOpacity={0.7} style={[reactionBarStyles.pill, data.hasMe && reactionBarStyles.pillActive]}>
                    <Typo size={13}>{emoji}</Typo>
                    {data.count > 1 && <Typo size={11} fontWeight="700" color={data.hasMe ? colors.primaryDark : colors.neutral600}>{data.count}</Typo>}
                </TouchableOpacity>
            ))}
        </Animated.View>
    );
};

const reactionBarStyles = StyleSheet.create({
    container: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 4 },
    myAlign: { justifyContent: "flex-end" },
    theirAlign: { justifyContent: "flex-start" },
    pill: {
        flexDirection: "row", alignItems: "center", gap: 4,
        backgroundColor: colors.white, borderRadius: radius.full,
        paddingHorizontal: spacingX._10, paddingVertical: verticalScale(4),
        borderWidth: 1.5, borderColor: colors.neutral200,
        shadowColor: colors.black, shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
    },
    pillActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
});

// ─────────────────────────────────────────────
// IMAGE VIEWER FOOTER
// ─────────────────────────────────────────────
const ImageViewerFooter = ({ senderName, time }: { senderName: string; time: string }) => (
    <View style={imageViewerStyles.footer}>
        <Typo size={14} fontWeight="600" color={colors.white}>{senderName}</Typo>
        <Typo size={12} color={"rgba(255,255,255,0.6)"}>{time}</Typo>
    </View>
);

const imageViewerStyles = StyleSheet.create({
    footer: { alignItems: "center", paddingBottom: verticalScale(40), gap: 4 },
});

// ─────────────────────────────────────────────
// EDIT MESSAGE MODAL
// ─────────────────────────────────────────────
const EditMessageModal = ({ visible, initialContent, onSave, onClose }: { visible: boolean; initialContent: string; onSave: (newContent: string) => void; onClose: () => void }) => {
    const [editText, setEditText] = useState(initialContent);
    const inputRef = useRef<TextInput>(null);

    useEffect(() => {
        if (visible) { setEditText(initialContent); setTimeout(() => inputRef.current?.focus(), 200); }
    }, [visible, initialContent]);

    const handleSave = () => {
        if (!editText.trim()) return;
        if (editText.trim() === initialContent.trim()) { onClose(); return; }
        onSave(editText.trim());
    };

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
            <TouchableWithoutFeedback onPress={onClose}>
                <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(150)} style={editStyles.overlay}>
                    <TouchableWithoutFeedback>
                        <Animated.View entering={FadeInUp.duration(300).springify()} exiting={FadeOutDown.duration(200)} style={editStyles.sheet}>
                            <View style={editStyles.handle} />
                            <View style={editStyles.header}>
                                <View style={editStyles.headerLeft}>
                                    <View style={editStyles.headerIcon}>
                                        <Icons.PencilSimple size={verticalScale(16)} color={colors.neutral700} weight="bold" />
                                    </View>
                                    <Typo size={17} fontWeight="700" color={colors.neutral900}>Edit Message</Typo>
                                </View>
                                <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={editStyles.closeBtn}>
                                    <Icons.X size={verticalScale(15)} color={colors.neutral600} weight="bold" />
                                </TouchableOpacity>
                            </View>
                            <View style={editStyles.inputWrap}>
                                <TextInput
                                    ref={inputRef}
                                    value={editText}
                                    onChangeText={setEditText}
                                    multiline
                                    style={editStyles.input}
                                    placeholderTextColor={colors.neutral400}
                                    placeholder="Edit your message..."
                                    selectionColor={colors.primary}
                                    maxLength={2000}
                                />
                                <Typo size={11} color={editText.length > 1800 ? colors.rose : colors.neutral400} style={editStyles.charCount}>
                                    {editText.length}/2000
                                </Typo>
                            </View>
                            <View style={editStyles.actions}>
                                <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={editStyles.cancelBtn}>
                                    <Typo size={15} fontWeight="600" color={colors.neutral600}>Cancel</Typo>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={handleSave}
                                    activeOpacity={0.8}
                                    style={[editStyles.saveBtn, (!editText.trim() || editText.trim() === initialContent.trim()) && editStyles.saveBtnDisabled]}
                                >
                                    <Icons.Check size={verticalScale(16)} color={colors.black} weight="bold" />
                                    <Typo size={15} fontWeight="700" color={colors.black}>Save</Typo>
                                </TouchableOpacity>
                            </View>
                        </Animated.View>
                    </TouchableWithoutFeedback>
                </Animated.View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const editStyles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    sheet: {
        backgroundColor: colors.white, borderTopLeftRadius: radius._30,
        borderTopRightRadius: radius._30, borderCurve: "continuous",
        paddingBottom: verticalScale(34), paddingHorizontal: spacingX._20,
    },
    handle: {
        width: scale(36), height: verticalScale(4), borderRadius: radius.full,
        backgroundColor: colors.neutral300, alignSelf: "center",
        marginTop: verticalScale(10), marginBottom: verticalScale(4),
    },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacingY._15 },
    headerLeft: { flexDirection: "row", alignItems: "center", gap: spacingX._10 },
    headerIcon: { width: scale(32), height: scale(32), borderRadius: radius._10, backgroundColor: colors.neutral100, alignItems: "center", justifyContent: "center" },
    closeBtn: { width: scale(30), height: scale(30), borderRadius: radius.full, backgroundColor: colors.neutral100, alignItems: "center", justifyContent: "center" },
    inputWrap: {
        backgroundColor: colors.neutral50, borderRadius: radius._15,
        borderWidth: 1.5, borderColor: colors.primary,
        paddingHorizontal: spacingX._15, paddingTop: spacingY._12,
        paddingBottom: spacingY._7, marginBottom: spacingY._20,
        minHeight: verticalScale(100),
    },
    input: { fontSize: scale(15), color: colors.neutral900, lineHeight: scale(22), padding: 0, margin: 0, textAlignVertical: "top" },
    charCount: { alignSelf: "flex-end", marginTop: spacingY._5 },
    actions: { flexDirection: "row", gap: spacingX._12 },
    cancelBtn: {
        flex: 1, height: verticalScale(50), borderRadius: radius.full,
        backgroundColor: colors.neutral100, alignItems: "center", justifyContent: "center",
        borderWidth: 1, borderColor: colors.neutral200,
    },
    saveBtn: {
        flex: 2, height: verticalScale(50), borderRadius: radius.full,
        backgroundColor: colors.primary, alignItems: "center", justifyContent: "center",
        flexDirection: "row", gap: spacingX._7,
        shadowColor: colors.primary, shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35, shadowRadius: 8, elevation: 4,
    },
    saveBtnDisabled: { opacity: 0.45, shadowOpacity: 0, elevation: 0 },
});

// ─────────────────────────────────────────────
// MESSAGE DELIVERY STATUS
// ─────────────────────────────────────────────
type DeliveryStatus = "sent" | "delivered" | "seen";

const DeliveryStatusIcon = ({
    status,
}: {
    status?: DeliveryStatus;
}) => {
    if (!status) return null;

    return (
        <Animated.View
            key={status}
            entering={FadeIn.duration(140)}
            style={styles.deliveryStatus}
        >
            {status === "sent" ? (
                <Icons.Check
                    size={verticalScale(13)}
                    color={colors.neutral500}
                    weight="bold"
                />
            ) : (
                <Icons.Checks
                    size={verticalScale(14)}
                    color={
                        status === "seen"
                            ? colors.primaryDark
                            : colors.neutral500
                    }
                    weight="bold"
                />
            )}
        </Animated.View>
    );
};

// ─────────────────────────────────────────────
// MAIN MESSAGE ITEM
// ─────────────────────────────────────────────
const MessageItem = ({
    item,
    isDirect,
    onReply,
    onReact,
    deliveryStatus,
}: {
    item: MessageProps;
    isDirect: boolean;
    onReply: (item: MessageProps) => void;
    onReact: (messageId: string, emoji: string) => void;
    deliveryStatus?: DeliveryStatus;
}) => {
    const { user: currentUser } = useAuth();
    const isMe = currentUser?.id == item?.sender?.id;
    const formattedTime = moment(item.createdAt).format("h:mm A");

    const [showActions, setShowActions] = useState(false);
    const [showEmojiGrid, setShowEmojiGrid] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [showImageViewer, setShowImageViewer] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);

    const reactions = item.reactions || [];
    const currentUserReaction = reactions.find(r => r.userId === currentUser?.id)?.emoji;
    const isVoiceMessage = !!item.voiceUrl;
    const isDeleted = !!item.isDeleted;
    const isFileMessage = !!item.attachmentMeta && item.type === "file";
    const isImageMessage = !!item.attachement && !isFileMessage;
    const isPollMessage =
        item.type === "poll" ||
        (
            !!item.poll &&
            typeof item.poll.question === "string" &&
            item.poll.question.trim().length > 0 &&
            Array.isArray(item.poll.options) &&
            item.poll.options.length >= 2
        );
    const isCallMessage =
        item.type === "call" &&
        !!item.callMeta &&
        (item.callMeta.kind === "voice" || item.callMeta.kind === "video");

    const handleLongPress = () => { if (isDeleted || isPollMessage) return; setShowActions(true); };
    const handleDismiss = () => setShowActions(false);

    const handleCopy = async () => {
        if (item.content) await Clipboard.setStringAsync(item.content);
        setShowActions(false);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 1800);
    };

    const handleReply = () => { setShowActions(false); onReply(item); };
    const handleOpenEmojiGrid = () => { setShowActions(false); setTimeout(() => setShowEmojiGrid(true), 150); };
    const handleEmojiSelect = (emoji: string) => { setShowEmojiGrid(false); onReact(item.id, emoji); };
    const handleQuickEmoji = (emoji: string) => { setShowActions(false); onReact(item.id, emoji); };
    const handleReactionPill = (emoji: string) => { if (isDeleted) return; onReact(item.id, emoji); };
    const handleImagePress = () => setShowImageViewer(true);

    const handleDelete = () => {
        setShowActions(false);
        Alert.alert(
            "Delete Message",
            "This message will be deleted for everyone. This cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => deleteMessage({ messageId: item.id, conversationId: item.conversationId }) },
            ]
        );
    };

    const handleEdit = () => { setShowActions(false); setTimeout(() => setShowEditModal(true), 150); };
    const handleEditSave = (newContent: string) => { setShowEditModal(false); editMessage({ messageId: item.id, conversationId: item.conversationId, content: newContent }); };
    const handleOpenFile = async () => {
        if (!item.attachmentMeta?.url) return;
        try {
            const supported = await Linking.canOpenURL(item.attachmentMeta.url);
            if (supported) await Linking.openURL(item.attachmentMeta.url);
            else Alert.alert("Cannot open", "No app found to open this file type.");
        } catch { Alert.alert("Error", "Could not open the file."); }
    };

    // ── DELETED MESSAGE ──
    if (isDeleted) {
        return (
            <View style={[styles.messageContainer, isMe ? styles.myMessage : styles.theirMessage]}>
                {!isMe && !isDirect && <Avatar size={28} uri={item?.sender?.avatar} style={styles.messageAvatar} />}
                <View style={[styles.messageBubble, styles.deletedBubble, isMe ? styles.myBubbleRadius : styles.theirBubbleRadius]}>
                    <View style={styles.deletedContent}>
                        <Icons.ProhibitInset size={verticalScale(13)} color={colors.neutral400} weight="regular" />
                        <Typo size={13} color={colors.neutral400} style={styles.deletedText}>
                            {isMe ? "You deleted this message" : "This message was deleted"}
                        </Typo>
                    </View>
                    <Typo size={10} fontWeight="500" color={colors.neutral300} style={styles.timeStamp}>{formattedTime}</Typo>
                </View>
            </View>
        );
    }

    // ── MESSAGE RENDER ──
    return (
        <>
            <View style={[styles.messageContainer, isMe ? styles.myMessage : styles.theirMessage]}>
                {!isMe && !isDirect && (
                    <Avatar
                        size={28}
                        uri={item?.sender?.avatar}
                        style={styles.messageAvatar}
                    />
                )}

                <View style={styles.bubbleColumn}>
                    {isPollMessage ? (
                        <PollBubble
                            messageId={item.id}
                            conversationId={item.conversationId || ''}
                            poll={item.poll!}
                            isMe={isMe}
                            currentUserId={currentUser?.id || ''}
                            senderName={item.sender?.name}
                            formattedTime={formattedTime}
                        />
                    ) : isCallMessage ? (
                        <CallMessageBubble
                            kind={item.callMeta!.kind}
                            status={item.callMeta!.status}
                            duration={item.callMeta!.duration || 0}
                            isMe={isMe}
                            formattedTime={formattedTime}
                        />
                    ) : (
                        <Pressable
                            onLongPress={handleLongPress}
                            delayLongPress={200}
                            style={({ pressed }) => [
                                styles.messageBubble,
                                isMe ? styles.myBubble : styles.theirBubble,
                                isMe ? styles.myBubbleRadius : styles.theirBubbleRadius,
                                pressed && styles.bubblePressed,
                            ]}
                        >
                            {/* ── Sender name group only ── */}
                            {!isMe && !isDirect && (
                                <Typo
                                    color={colors.neutral700}
                                    fontWeight="600"
                                    size={12}
                                    style={styles.senderName}
                                >
                                    {item.sender.name}
                                </Typo>
                            )}

                            {/* ── Quoted reply ── */}
                            {item.replyTo && (
                                <QuotedBubble
                                    replyTo={item.replyTo}
                                    isMe={isMe}
                                />
                            )}

                            {/* ── Voice message ── */}
                            {isVoiceMessage && (
                                <VoiceMessageBubble
                                    voiceUrl={item.voiceUrl!}
                                    voiceDuration={item.voiceDuration || 0}
                                    isMe={isMe}
                                />
                            )}

                            {/* ── Image ── */}
                            {isImageMessage && (
                                <TouchableOpacity
                                    onPress={handleImagePress}
                                    onLongPress={handleLongPress}
                                    delayLongPress={200}
                                    activeOpacity={0.9}
                                >
                                    <Image
                                        source={item.attachement!}
                                        contentFit="cover"
                                        style={styles.attachement}
                                        transition={100}
                                    />
                                    <View style={styles.zoomHint}>
                                        <Icons.MagnifyingGlassPlus
                                            size={verticalScale(13)}
                                            color={colors.white}
                                            weight="bold"
                                        />
                                    </View>
                                </TouchableOpacity>
                            )}

                            {/* ── File bubble ── */}
                            {isFileMessage && item.attachmentMeta && (
                                <FileBubble
                                    meta={item.attachmentMeta}
                                    isMe={isMe}
                                />
                            )}

                            {/* ── Text content ── */}
                            {item.content ? (
                                <Typo size={15} color={colors.neutral900}>
                                    {item.content}
                                </Typo>
                            ) : null}

                            {/* ── Time + edited ── */}
                            <View style={styles.timeRow}>
                                {item.isEdited && (
                                    <Typo
                                        size={10}
                                        color={isMe ? colors.neutral500 : colors.neutral400}
                                        fontWeight="400"
                                    >
                                        edited
                                    </Typo>
                                )}

                                <Typo
                                    style={styles.timeStamp}
                                    size={10}
                                    fontWeight="500"
                                    color={isMe ? colors.neutral600 : colors.neutral500}
                                >
                                    {formattedTime}
                                </Typo>

                                {isMe && (
                                    <DeliveryStatusIcon status={deliveryStatus} />
                                )}
                            </View>
                        </Pressable>
                    )}

                    {/* ── Reaction bar ── */}
                    {reactions.length > 0 && (
                        <ReactionBar
                            reactions={reactions}
                            isMe={isMe}
                            currentUserId={currentUser?.id || ""}
                            onPress={handleReactionPill}
                        />
                    )}
                </View>
            </View>

            {/* ── Image Viewer ── */}
            {isImageMessage && (
                <ImageViewing
                    images={[{ uri: item.attachement! }]}
                    imageIndex={0}
                    visible={showImageViewer}
                    onRequestClose={() => setShowImageViewer(false)}
                    swipeToCloseEnabled
                    doubleTapToZoomEnabled
                    FooterComponent={() => (
                        <ImageViewerFooter senderName={isMe ? "You" : item.sender.name} time={moment(item.createdAt).format("MMM D, YYYY • h:mm A")} />
                    )}
                />
            )}

            {/* ── Emoji Grid ── */}
            <EmojiGridPopup visible={showEmojiGrid} onSelect={handleEmojiSelect} onClose={() => setShowEmojiGrid(false)} currentUserReaction={currentUserReaction} />

            {/* ── Edit Modal ── */}
            <EditMessageModal visible={showEditModal} initialContent={item.content || ""} onSave={handleEditSave} onClose={() => setShowEditModal(false)} />

            {/* ── Action Sheet ── */}
            {!isPollMessage && (
                <Modal visible={showActions} transparent animationType="none" onRequestClose={handleDismiss} statusBarTranslucent>
                    <TouchableWithoutFeedback onPress={handleDismiss}>
                        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={styles.modalOverlay}>
                            <TouchableWithoutFeedback>
                                <Animated.View entering={FadeInUp.duration(250).springify()} exiting={FadeOutDown.duration(150)} style={styles.actionSheet}>
                                    {/* ── Quick Reactions ── */}
                                    <View style={styles.quickReactWrap}>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickReactScroll}>
                                            {EMOJI_CATEGORIES[0].emojis.map(emoji => {
                                                const isSelected = currentUserReaction === emoji;
                                                return (
                                                    <TouchableOpacity key={emoji} onPress={() => handleQuickEmoji(emoji)} activeOpacity={0.65} style={[styles.quickEmojiBtn, isSelected && styles.quickEmojiBtnActive]}>
                                                        <Typo size={24}>{emoji}</Typo>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </ScrollView>
                                        <TouchableOpacity onPress={handleOpenEmojiGrid} activeOpacity={0.7} style={styles.moreBtn}>
                                            <Icons.DotsThree size={verticalScale(20)} color={colors.neutral700} weight="bold" />
                                        </TouchableOpacity>
                                    </View>

                                    {/* ── Previews ── */}
                                    {item.content ? <View style={styles.previewBox}><Typo size={13} color={colors.neutral500} textProps={{ numberOfLines: 2 }}>{item.content}</Typo></View> : null}
                                    {isVoiceMessage && <View style={styles.previewBox}><Typo size={13} color={colors.neutral500}>🎤 Voice message · {formatDuration(item.voiceDuration || 0)}</Typo></View>}
                                    {isCallMessage && item.callMeta && (
                                        <View style={styles.previewBox}>
                                            <Typo size={13} color={colors.neutral500}>
                                                {item.callMeta.kind === "video" ? "📹 Video call" : "📞 Voice call"}
                                                {item.callMeta.status === "missed" ? " · Missed" : item.callMeta.duration ? ` · ${formatDuration(item.callMeta.duration)}` : ""}
                                            </Typo>
                                        </View>
                                    )}
                                    {isFileMessage && item.attachmentMeta && (
                                        <View style={styles.previewBox}>
                                            <Typo size={13} color={colors.neutral500} textProps={{ numberOfLines: 1 }}>
                                                {getFileIcon(item.attachmentMeta.mimeType)} {item.attachmentMeta.name} · {formatFileSize(item.attachmentMeta.size)}
                                            </Typo>
                                        </View>
                                    )}

                                    <View style={styles.sheetDivider} />

                                    {/* ── Reply ── */}
                                    <TouchableOpacity style={styles.actionRow} onPress={handleReply} activeOpacity={0.7}>
                                        <View style={styles.actionIconWrap}><Icons.ArrowBendUpLeft size={verticalScale(18)} color={colors.neutral700} weight="regular" /></View>
                                        <Typo size={15} fontWeight="500" color={colors.neutral800}>Reply</Typo>
                                    </TouchableOpacity>

                                    {/* ── Edit ── */}
                                    {isMe && !isVoiceMessage && !isFileMessage && !isCallMessage && item.content ? (
                                        <TouchableOpacity style={styles.actionRow} onPress={handleEdit} activeOpacity={0.7}>
                                            <View style={styles.actionIconWrap}><Icons.PencilSimple size={verticalScale(18)} color={colors.neutral700} weight="regular" /></View>
                                            <Typo size={15} fontWeight="500" color={colors.neutral800}>Edit Message</Typo>
                                        </TouchableOpacity>
                                    ) : null}

                                    {/* ── Copy ── */}
                                    {item.content && !isVoiceMessage && !isCallMessage ? (
                                        <TouchableOpacity style={styles.actionRow} onPress={handleCopy} activeOpacity={0.7}>
                                            <View style={styles.actionIconWrap}><Icons.Copy size={verticalScale(18)} color={colors.neutral700} weight="regular" /></View>
                                            <Typo size={15} fontWeight="500" color={colors.neutral800}>Copy Text</Typo>
                                        </TouchableOpacity>
                                    ) : null}

                                    {/* ── View Image ── */}
                                    {isImageMessage ? (
                                        <TouchableOpacity style={styles.actionRow} activeOpacity={0.7} onPress={() => { handleDismiss(); setTimeout(() => setShowImageViewer(true), 200); }}>
                                            <View style={styles.actionIconWrap}><Icons.ArrowsOut size={verticalScale(18)} color={colors.neutral700} weight="regular" /></View>
                                            <Typo size={15} fontWeight="500" color={colors.neutral800}>View Image</Typo>
                                        </TouchableOpacity>
                                    ) : null}

                                    {/* ── Save Image ── */}
                                    {isImageMessage ? (
                                        <TouchableOpacity style={styles.actionRow} activeOpacity={0.7} onPress={handleDismiss}>
                                            <View style={styles.actionIconWrap}><Icons.DownloadSimple size={verticalScale(18)} color={colors.neutral700} weight="regular" /></View>
                                            <Typo size={15} fontWeight="500" color={colors.neutral800}>Save Image</Typo>
                                        </TouchableOpacity>
                                    ) : null}

                                    {/* ── Open File ── */}
                                    {isFileMessage ? (
                                        <TouchableOpacity style={styles.actionRow} activeOpacity={0.7} onPress={() => { handleDismiss(); handleOpenFile(); }}>
                                            <View style={styles.actionIconWrap}><Icons.ArrowSquareOut size={verticalScale(18)} color={colors.neutral700} weight="regular" /></View>
                                            <Typo size={15} fontWeight="500" color={colors.neutral800}>Open File</Typo>
                                        </TouchableOpacity>
                                    ) : null}

                                    <View style={styles.sheetDivider} />

                                    {/* ── Delete ── */}
                                    {isMe ? (
                                        <TouchableOpacity style={styles.actionRow} onPress={handleDelete} activeOpacity={0.7}>
                                            <View style={[styles.actionIconWrap, styles.deleteIconWrap]}><Icons.Trash size={verticalScale(18)} color={colors.rose} weight="regular" /></View>
                                            <Typo size={15} fontWeight="500" color={colors.rose}>Delete Message</Typo>
                                        </TouchableOpacity>
                                    ) : null}

                                    <View style={styles.sheetDivider} />

                                    {/* ── Cancel ── */}
                                    <TouchableOpacity style={styles.cancelRow} onPress={handleDismiss} activeOpacity={0.7}>
                                        <Typo size={15} fontWeight="600" color={colors.neutral400}>Cancel</Typo>
                                    </TouchableOpacity>
                                </Animated.View>
                            </TouchableWithoutFeedback>
                        </Animated.View>
                    </TouchableWithoutFeedback>
                </Modal>
            )}

            {/* ── Toast ── */}
            {showToast && (
                <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(300)} style={styles.toast}>
                    <Icons.Check size={verticalScale(14)} color={colors.white} weight="bold" />
                    <Typo size={13} fontWeight="600" color={colors.white}>Copied to clipboard</Typo>
                </Animated.View>
            )}
        </>
    );
};

export default MessageItem;

const styles = StyleSheet.create({
    messageContainer: { flexDirection: "row", gap: spacingX._7, maxWidth: "80%" },
    myMessage: { alignSelf: "flex-end" },
    theirMessage: { alignSelf: "flex-start" },
    bubbleColumn: { flexDirection: "column", gap: 2 },
    messageBubble: {
        paddingHorizontal: spacingX._12, paddingVertical: spacingY._7,
        borderRadius: radius._15, gap: spacingY._5, maxWidth: "100%",
    },
    bubblePressed: { opacity: 0.75 },
    myBubble: { backgroundColor: colors.myBubble },
    theirBubble: { backgroundColor: colors.otherBubble },
    myBubbleRadius: { borderBottomRightRadius: radius._3 },
    theirBubbleRadius: { borderBottomLeftRadius: radius._3 },
    senderName: { marginBottom: spacingY._5 },
    attachement: { height: verticalScale(180), width: verticalScale(180), borderRadius: radius._10 },
    zoomHint: {
        position: "absolute", bottom: verticalScale(8), right: verticalScale(8),
        backgroundColor: "rgba(0,0,0,0.45)", borderRadius: radius.full, padding: 5,
    },
    messageAvatar: { alignSelf: "flex-end" },
    timeRow: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: spacingX._5, marginTop: spacingY._5 },
    deliveryStatus: {
        alignItems: "center",
        justifyContent: "center",
        marginLeft: -2,
    },
    timeStamp: { opacity: 0.75 },
    deletedBubble: { backgroundColor: colors.neutral100, borderWidth: 1, borderColor: colors.neutral200, borderStyle: "dashed" },
    deletedContent: { flexDirection: "row", alignItems: "center", gap: spacingX._7 },
    deletedText: { fontStyle: "italic" },
    quickReactWrap: {
        flexDirection: "row", alignItems: "center",
        backgroundColor: colors.neutral50, borderRadius: radius._15,
        borderWidth: 1, borderColor: colors.neutral200,
        marginBottom: spacingY._10, paddingVertical: spacingY._7,
        paddingLeft: spacingX._5, paddingRight: spacingX._7, gap: spacingX._5,
    },
    quickReactScroll: { flexDirection: "row", gap: spacingX._3, paddingHorizontal: spacingX._3 },
    quickEmojiBtn: { width: scale(40), height: scale(40), borderRadius: radius._10, alignItems: "center", justifyContent: "center" },
    quickEmojiBtnActive: { backgroundColor: colors.primaryLight, borderWidth: 1.5, borderColor: colors.primary },
    moreBtn: { width: scale(40), height: scale(40), borderRadius: radius._10, backgroundColor: colors.neutral200, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
    actionSheet: {
        backgroundColor: colors.white, borderTopLeftRadius: radius._30,
        borderTopRightRadius: radius._30, borderCurve: "continuous",
        paddingTop: spacingY._20, paddingBottom: spacingY._35,
        paddingHorizontal: spacingX._20, gap: spacingY._5,
    },
    previewBox: { backgroundColor: colors.neutral100, borderRadius: radius._12, paddingHorizontal: spacingX._15, paddingVertical: spacingY._12, marginBottom: spacingY._5 },
    sheetDivider: { height: 1, backgroundColor: colors.neutral100, marginVertical: spacingY._5 },
    actionRow: { flexDirection: "row", alignItems: "center", gap: spacingX._15, paddingVertical: spacingY._12, paddingHorizontal: spacingX._5, borderRadius: radius._12 },
    actionIconWrap: { width: scale(36), height: scale(36), borderRadius: radius._10, backgroundColor: colors.neutral100, alignItems: "center", justifyContent: "center" },
    deleteIconWrap: { backgroundColor: "#fef2f2" },
    cancelRow: { alignItems: "center", paddingVertical: spacingY._12 },
    toast: {
        position: "absolute", bottom: verticalScale(80), alignSelf: "center",
        backgroundColor: colors.neutral800, flexDirection: "row", alignItems: "center",
        gap: spacingX._7, paddingHorizontal: spacingX._15, paddingVertical: spacingY._10,
        borderRadius: radius.full, shadowColor: colors.black,
        shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
    },
});