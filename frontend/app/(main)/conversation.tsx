import {
    FlatList, KeyboardAvoidingView, Platform,
    StyleSheet, TouchableOpacity, View, Alert,
    ActivityIndicator, Modal, TouchableWithoutFeedback,
    TextInput, ScrollView, BackHandler,
} from 'react-native'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import ScreenWrapper from "../../components/ScreenWrapper"
import Typo from "../../components/Typo"
import { colors, radius, spacingX, spacingY } from "../../constants/theme"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useAuth } from "../../contexts/authContext"
import { verticalScale, scale } from "../../utils/styling"
import BackButton from "../../components/BackButton"
import Avatar from "../../components/Avatar"
import * as Icons from "phosphor-react-native"
import MessageItem from "../../components/MessageItem"
import Input from "../../components/Input"
import * as ImagePicker from "expo-image-picker"
import * as DocumentPicker from "expo-document-picker"
import { Image } from "expo-image"
import Loading from "../../components/Loading"
import {
    uploadFileToCloudinary,
    uploadAudioToCloudinary,
    uploadDocumentToCloudinary,
    getFileIcon,
    formatFileSize,
} from "../../services/imageService"
import {
    getMessages, newMessage, emitTyping, emitStopTyping,
    onTyping, onStopTyping, reactToMessage, markAsRead,
    messageDelivered, onMessageDelivered, onReadReceipt,
    deleteMessage, editMessage, onUserStatus, getUserStatus,
    callInvite, onCallRinging, onCallFailed,
    createPoll, onPollUpdated,
    pinMessage, unpinMessage, onPinnedMessageUpdated,
    openViewOnce, onViewOnceOpened,
    toggleStarMessage, onMessageStarred,
    forwardMessage, toggleMuteConversation,
    setGroupAdmin, getConversations,
    isSocketConnected, onSocketConnectionChange,
} from "../../socket/socketEvents"
import {
    MessageProps, ReplyToProps, ResponseProps,
    TypingPayload, UserStatusPayload, SelectedFileProps,
} from "../../types"
import Animated, {
    FadeInDown, FadeInUp, FadeIn, FadeOut, FadeOutDown,
    useSharedValue, useAnimatedStyle,
    withRepeat, withTiming, withDelay, withSpring
} from 'react-native-reanimated'
import moment from 'moment'
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder } from 'expo-audio'

// ── Types ──
type SeparatorItem = {
    id: string;
    type: 'separator';
    date: string;
};

type MessageListItem =
    | {
        id: string;
        type: 'message';
        message: MessageProps;
    }
    | SeparatorItem;

// ── Last Seen formatter ──
const formatLastSeen = (lastSeen: string | null): string => {
    if (!lastSeen) return 'Online';
    const date = moment(lastSeen);
    const now = moment();
    if (date.isSame(now, 'day')) return `Last seen today at ${date.format('h:mm A')}`;
    if (date.isSame(moment().subtract(1, 'day'), 'day')) return `Last seen yesterday at ${date.format('h:mm A')}`;
    return `Last seen ${date.format('MMM D [at] h:mm A')}`;
};

// ── Date label ──
const getDateLabel = (dateStr: string): string => {
    const date = moment(dateStr);
    const today = moment();
    const yesterday = moment().subtract(1, 'day');
    if (date.isSame(today, 'day')) return 'Today';
    if (date.isSame(yesterday, 'day')) return 'Yesterday';
    if (date.isSame(today, 'year')) return date.format('dddd, MMMM D');
    return date.format('MMMM D, YYYY');
};

// ── Date Separator ──
const DateSeparator = ({ date }: { date: string }) => (
    <View style={separatorStyles.wrapper}>
        <View style={separatorStyles.line} />
        <View style={separatorStyles.pill}>
            <Typo size={11} fontWeight="600" color={colors.neutral500}>{getDateLabel(date)}</Typo>
        </View>
        <View style={separatorStyles.line} />
    </View>
);

const separatorStyles = StyleSheet.create({
    wrapper: { flexDirection: 'row', alignItems: 'center', marginVertical: spacingY._10, paddingHorizontal: spacingX._10, gap: spacingX._10 },
    line: { flex: 1, height: 1, backgroundColor: colors.neutral200 },
    pill: { backgroundColor: colors.neutral100, paddingHorizontal: spacingX._12, paddingVertical: spacingY._5, borderRadius: radius.full, borderWidth: 1, borderColor: colors.neutral200 },
});

// ── Typing Dot ──
const TypingDot = ({ delay }: { delay: number }) => {
    const translateY = useSharedValue(0);
    useEffect(() => {
        translateY.value = withDelay(delay, withRepeat(withTiming(-4, { duration: 350 }), -1, true));
    }, []);
    const animStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
    return <Animated.View style={[typingStyles.dot, animStyle]} />;
};

const TypingIndicator = ({ name, isDirect }: { name: string; isDirect: boolean }) => (
    <Animated.View entering={FadeIn.duration(200)} style={typingStyles.container}>
        <View style={typingStyles.bubble}>
            <TypingDot delay={0} />
            <TypingDot delay={150} />
            <TypingDot delay={300} />
        </View>
        {!isDirect && <Typo size={11} color={colors.neutral400} fontWeight="500">{name} is typing...</Typo>}
    </Animated.View>
);

const typingStyles = StyleSheet.create({
    container: { flexDirection: 'row', alignItems: 'center', gap: spacingX._7, paddingHorizontal: spacingX._15, paddingBottom: spacingY._7 },
    bubble: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.otherBubble, paddingHorizontal: spacingX._12, paddingVertical: spacingY._10, borderRadius: radius._15, borderBottomLeftRadius: radius._3, gap: 4 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.neutral500 },
});

// ── Reply Preview Bar ──
const ReplyPreviewBar = ({ replyTo, onCancel }: { replyTo: ReplyToProps; onCancel: () => void }) => (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={replyStyles.container}>
        <View style={replyStyles.bar} />
        <View style={replyStyles.textWrap}>
            <Typo size={12} fontWeight="700" color={colors.neutral800}>{replyTo.senderName}</Typo>
            <Typo size={12} color={colors.neutral500} textProps={{ numberOfLines: 1 }}>
                {replyTo.voiceUrl ? "🎤 Voice message" : replyTo.content || "📷 Image"}
            </Typo>
        </View>
        <TouchableOpacity onPress={onCancel} style={replyStyles.closeBtn} activeOpacity={0.7}>
            <Icons.X size={verticalScale(14)} color={colors.neutral500} weight="bold" />
        </TouchableOpacity>
    </Animated.View>
);

const replyStyles = StyleSheet.create({
    container: { flexDirection: "row", alignItems: "center", backgroundColor: colors.neutral50, borderRadius: radius._12, overflow: "hidden", marginBottom: spacingY._7, borderWidth: 1, borderColor: colors.neutral200 },
    bar: { width: 3, alignSelf: "stretch", backgroundColor: colors.primary },
    textWrap: { flex: 1, paddingHorizontal: spacingX._12, paddingVertical: spacingY._10, gap: 2 },
    closeBtn: { padding: spacingX._12 },
});

// ─────────────────────────────────────────────
// CHAT WALLPAPERS & THEMES (Feature 14)
// ─────────────────────────────────────────────
export interface ChatTheme {
    id: string;
    name: string;
    icon: string;
    bg: string;
    bubbleMine: string;
    bubbleOther: string;
    isDark?: boolean;
}

export const CHAT_THEMES: ChatTheme[] = [
    {
        id: 'bubbly',
        name: 'Bubbly Warm',
        icon: '☀️',
        bg: colors.white,
        bubbleMine: colors.myBubble,
        bubbleOther: colors.otherBubble,
    },
    {
        id: 'latte',
        name: 'Vanilla Latte',
        icon: '☕',
        bg: '#FBF9F5',
        bubbleMine: '#FDEBD9',
        bubbleOther: '#F5EBE1',
    },
    {
        id: 'lavender',
        name: 'Lavender Dusk',
        icon: '💜',
        bg: '#FAF5FF',
        bubbleMine: '#F3E8FF',
        bubbleOther: '#EDE9FE',
    },
    {
        id: 'mint',
        name: 'Spring Mint',
        icon: '🌿',
        bg: '#F0FDF4',
        bubbleMine: '#DCFCE7',
        bubbleOther: '#E0F2FE',
    },
    {
        id: 'midnight',
        name: 'Midnight Slate',
        icon: '🌙',
        bg: '#0F172A',
        bubbleMine: '#1E293B',
        bubbleOther: '#334155',
        isDark: true,
    },
];

const ChatThemeModal = ({
    visible,
    currentThemeId,
    onSelectTheme,
    onClose,
}: {
    visible: boolean;
    currentThemeId: string;
    onSelectTheme: (theme: ChatTheme) => void;
    onClose: () => void;
}) => (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
        <TouchableWithoutFeedback onPress={onClose}>
            <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={themeModalStyles.overlay}>
                <TouchableWithoutFeedback>
                    <Animated.View entering={FadeInUp.duration(250).springify()} exiting={FadeOutDown.duration(150)} style={themeModalStyles.sheet}>
                        <View style={themeModalStyles.header}>
                            <View>
                                <Typo size={17} fontWeight="800" color={colors.neutral900}>Chat Wallpaper & Theme</Typo>
                                <Typo size={12} color={colors.neutral500}>Choose a warm aesthetic for this chat</Typo>
                            </View>
                            <TouchableOpacity onPress={onClose} style={themeModalStyles.closeBtn} activeOpacity={0.7}>
                                <Icons.X size={verticalScale(18)} color={colors.neutral500} weight="bold" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={themeModalStyles.cardsScroll}>
                            {CHAT_THEMES.map((th) => {
                                const isSelected = th.id === currentThemeId;
                                return (
                                    <TouchableOpacity
                                        key={th.id}
                                        onPress={() => onSelectTheme(th)}
                                        activeOpacity={0.85}
                                        style={[
                                            themeModalStyles.themeCard,
                                            { backgroundColor: th.bg },
                                            isSelected && themeModalStyles.themeCardSelected,
                                        ]}
                                    >
                                        <View style={themeModalStyles.previewWrap}>
                                            <View style={[themeModalStyles.miniBubble, { backgroundColor: th.bubbleOther, alignSelf: 'flex-start' }]} />
                                            <View style={[themeModalStyles.miniBubble, { backgroundColor: th.bubbleMine, alignSelf: 'flex-end' }]} />
                                        </View>
                                        <View style={themeModalStyles.cardFooter}>
                                            <Typo size={14}>{th.icon}</Typo>
                                            <Typo size={11} fontWeight={isSelected ? "700" : "600"} color={th.isDark ? colors.white : colors.neutral800}>
                                                {th.name}
                                            </Typo>
                                            {isSelected && (
                                                <Icons.CheckCircle size={verticalScale(14)} color={colors.primary} weight="fill" />
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </Animated.View>
                </TouchableWithoutFeedback>
            </Animated.View>
        </TouchableWithoutFeedback>
    </Modal>
);

const themeModalStyles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet: {
        backgroundColor: colors.white,
        borderTopLeftRadius: radius._30,
        borderTopRightRadius: radius._30,
        paddingTop: spacingY._20,
        paddingBottom: verticalScale(35),
        paddingHorizontal: spacingX._20,
        gap: spacingY._15,
    },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    closeBtn: { width: 32, height: 32, borderRadius: radius.full, backgroundColor: colors.neutral100, alignItems: 'center', justifyContent: 'center' },
    cardsScroll: { gap: spacingX._12, paddingVertical: spacingY._10 },
    themeCard: {
        width: scale(115),
        height: verticalScale(145),
        borderRadius: radius._15,
        borderWidth: 1.5,
        borderColor: colors.neutral200,
        padding: spacingY._10,
        justifyContent: 'space-between',
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    themeCardSelected: { borderColor: colors.primary, borderWidth: 2.5 },
    previewWrap: { gap: 6, paddingTop: 6 },
    miniBubble: { width: '70%', height: verticalScale(18), borderRadius: radius._6 },
    cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacingY._5 },
});

// ── Format duration ──
const formatDuration = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
};

// ── Recording Indicator ──
const RecordingIndicator = ({ duration }: { duration: number }) => {
    const opacity = useSharedValue(1);
    useEffect(() => { opacity.value = withRepeat(withTiming(0.3, { duration: 600 }), -1, true); }, []);
    const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
    return (
        <View style={recordingStyles.container}>
            <Animated.View style={[recordingStyles.dot, animStyle]} />
            <Typo size={15} fontWeight="600" color={colors.rose}>{formatDuration(duration)}</Typo>
            <Typo size={13} color={colors.neutral400}>Recording...</Typo>
        </View>
    );
};

const recordingStyles = StyleSheet.create({
    container: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacingX._10, paddingHorizontal: spacingX._10 },
    dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.rose },
});

// ── Load More Indicator ──
const LoadMoreIndicator = () => (
    <View style={loadMoreStyles.container}>
        <ActivityIndicator size="small" color={colors.neutral400} />
        <Typo size={12} color={colors.neutral400} fontWeight="500">Loading older messages...</Typo>
    </View>
);

const loadMoreStyles = StyleSheet.create({
    container: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacingX._10, paddingVertical: spacingY._15 },
});

// ── File Preview Bar ──
const FilePreviewBar = ({
    file,
    isViewOnce,
    onToggleViewOnce,
    onRemove,
}: {
    file: SelectedFileProps;
    isViewOnce?: boolean;
    onToggleViewOnce?: () => void;
    onRemove: () => void;
}) => (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={filePreviewStyles.container}>
        {file.isImage ? (
            <Image source={file.uri} style={filePreviewStyles.imageThumb} contentFit="cover" />
        ) : (
            <View style={filePreviewStyles.iconWrap}>
                <Typo size={22}>{getFileIcon(file.mimeType)}</Typo>
            </View>
        )}
        <View style={filePreviewStyles.info}>
            <Typo size={12} fontWeight="600" color={colors.neutral800} textProps={{ numberOfLines: 1 }}>{file.name}</Typo>
            <Typo size={11} color={colors.neutral400}>{formatFileSize(file.size)}</Typo>
        </View>
        {file.isImage && onToggleViewOnce && (
            <TouchableOpacity
                onPress={onToggleViewOnce}
                activeOpacity={0.7}
                style={[filePreviewStyles.viewOnceBtn, isViewOnce && filePreviewStyles.viewOnceActive]}
            >
                <Typo size={13} fontWeight="800" color={isViewOnce ? colors.primaryDark : colors.neutral400}>①</Typo>
            </TouchableOpacity>
        )}
        <TouchableOpacity onPress={onRemove} style={filePreviewStyles.closeBtn} activeOpacity={0.7}>
            <Icons.X size={verticalScale(14)} color={colors.neutral500} weight="bold" />
        </TouchableOpacity>
    </Animated.View>
);

const filePreviewStyles = StyleSheet.create({
    container: { flexDirection: "row", alignItems: "center", backgroundColor: colors.neutral50, borderRadius: radius._12, borderWidth: 1, borderColor: colors.neutral200, marginBottom: spacingY._7, padding: spacingX._10, gap: spacingX._10 },
    imageThumb: { width: verticalScale(42), height: verticalScale(42), borderRadius: radius._10, backgroundColor: colors.neutral200 },
    iconWrap: { width: verticalScale(42), height: verticalScale(42), borderRadius: radius._10, backgroundColor: colors.neutral100, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.neutral200 },
    info: { flex: 1, gap: 2 },
    closeBtn: { padding: spacingX._5 },
    viewOnceBtn: {
        width: verticalScale(30),
        height: verticalScale(30),
        borderRadius: radius.full,
        backgroundColor: colors.neutral100,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1.5,
        borderColor: colors.neutral300,
    },
    viewOnceActive: {
        backgroundColor: colors.primaryLight,
        borderColor: colors.primaryDark,
    },
});

// ── Pinned Message Banner (Feature 3) ──
const PinnedMessageBanner = ({
    pinnedMessages,
    onPress,
    onUnpin,
}: {
    pinnedMessages: any[];
    onPress: (id: string) => void;
    onUnpin: (id: string) => void;
}) => {
    if (!pinnedMessages || pinnedMessages.length === 0) return null;
    const current = pinnedMessages[0];

    return (
        <Animated.View entering={FadeInDown.duration(200)} exiting={FadeOut.duration(150)} style={pinnedBannerStyles.container}>
            <TouchableOpacity onPress={() => onPress(current.id)} activeOpacity={0.8} style={pinnedBannerStyles.mainClick}>
                <View style={pinnedBannerStyles.iconWrap}>
                    <Icons.PushPin size={verticalScale(13)} color={colors.primaryDark} weight="fill" />
                </View>
                <View style={pinnedBannerStyles.textWrap}>
                    <Typo size={11} fontWeight="700" color={colors.neutral800}>
                        Pinned Message {pinnedMessages.length > 1 ? `(${pinnedMessages.length})` : ''}
                    </Typo>
                    <Typo size={12} color={colors.neutral600} textProps={{ numberOfLines: 1 }}>
                        {current.content || (current.type === "image" ? "📷 Photo" : "📎 Attachment")}
                    </Typo>
                </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onUnpin(current.id)} activeOpacity={0.7} style={pinnedBannerStyles.closeBtn}>
                <Icons.X size={verticalScale(13)} color={colors.neutral400} weight="bold" />
            </TouchableOpacity>
        </Animated.View>
    );
};

const pinnedBannerStyles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        paddingHorizontal: spacingX._15,
        paddingVertical: spacingY._8,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral200,
        gap: spacingX._10,
    },
    mainClick: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacingX._10,
    },
    iconWrap: {
        width: scale(26),
        height: scale(26),
        borderRadius: radius.full,
        backgroundColor: colors.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textWrap: {
        flex: 1,
        gap: 1,
    },
    closeBtn: {
        padding: spacingX._5,
    },
});

// ── In-Chat Search Bar (Feature 4) ──
const ChatSearchBar = ({
    query,
    onChangeQuery,
    matchCount,
    currentIndex,
    onPrev,
    onNext,
    onClose,
}: {
    query: string;
    onChangeQuery: (text: string) => void;
    matchCount: number;
    currentIndex: number;
    onPrev: () => void;
    onNext: () => void;
    onClose: () => void;
}) => (
    <Animated.View entering={FadeInDown.duration(200)} exiting={FadeOut.duration(150)} style={searchBarStyles.container}>
        <Icons.MagnifyingGlass size={verticalScale(16)} color={colors.neutral500} />
        <TextInput
            value={query}
            onChangeText={onChangeQuery}
            placeholder="Search in chat..."
            placeholderTextColor={colors.neutral400}
            style={searchBarStyles.input}
            autoFocus
        />
        {query.trim().length > 0 && (
            <View style={searchBarStyles.navRow}>
                <Typo size={12} color={colors.neutral500} fontWeight="500">
                    {matchCount > 0 ? `${currentIndex + 1} of ${matchCount}` : "0 matches"}
                </Typo>
                <TouchableOpacity onPress={onPrev} disabled={matchCount === 0} style={searchBarStyles.navBtn}>
                    <Icons.CaretUp size={verticalScale(15)} color={matchCount > 0 ? colors.neutral800 : colors.neutral300} weight="bold" />
                </TouchableOpacity>
                <TouchableOpacity onPress={onNext} disabled={matchCount === 0} style={searchBarStyles.navBtn}>
                    <Icons.CaretDown size={verticalScale(15)} color={matchCount > 0 ? colors.neutral800 : colors.neutral300} weight="bold" />
                </TouchableOpacity>
            </View>
        )}
        <TouchableOpacity onPress={onClose} style={searchBarStyles.closeBtn}>
            <Icons.X size={verticalScale(15)} color={colors.neutral600} weight="bold" />
        </TouchableOpacity>
    </Animated.View>
);

const searchBarStyles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        paddingHorizontal: spacingX._15,
        paddingVertical: spacingY._8,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral200,
        gap: spacingX._10,
    },
    input: {
        flex: 1,
        fontSize: scale(14),
        color: colors.neutral900,
        padding: 0,
        margin: 0,
    },
    navRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacingX._6,
    },
    navBtn: {
        padding: 3,
    },
    closeBtn: {
        padding: spacingX._5,
    },
});

// ── Forward Modal (Feature 5) ──
const ForwardModal = ({
    visible,
    conversations,
    currentUserId,
    onSelect,
    onClose,
}: {
    visible: boolean;
    conversations: any[];
    currentUserId: string;
    onSelect: (targetId: string) => void;
    onClose: () => void;
}) => (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <TouchableWithoutFeedback onPress={onClose}>
            <View style={forwardStyles.overlay}>
                <TouchableWithoutFeedback>
                    <View style={forwardStyles.sheet}>
                        <View style={forwardStyles.handle} />
                        <View style={forwardStyles.header}>
                            <Typo size={17} fontWeight="700" color={colors.neutral900}>Forward To...</Typo>
                            <TouchableOpacity onPress={onClose} style={forwardStyles.closeBtn}>
                                <Icons.X size={16} color={colors.neutral600} weight="bold" />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={conversations}
                            keyExtractor={(item) => item._id}
                            contentContainerStyle={forwardStyles.list}
                            ListEmptyComponent={
                                <View style={forwardStyles.empty}>
                                    <Typo size={13} color={colors.neutral400}>No other conversations available</Typo>
                                </View>
                            }
                            renderItem={({ item }) => {
                                const displayName = item.type === 'group'
                                    ? item.name
                                    : (item.participants?.find((p: any) => p._id !== currentUserId)?.name || "Chat");
                                return (
                                    <TouchableOpacity onPress={() => onSelect(item._id)} activeOpacity={0.7} style={forwardStyles.itemRow}>
                                        <Avatar size={42} uri={item.avatar} isGroup={item.type === 'group'} />
                                        <View style={forwardStyles.itemInfo}>
                                            <Typo size={15} fontWeight="600" color={colors.neutral900}>{displayName}</Typo>
                                            <Typo size={12} color={colors.neutral400}>
                                                {item.type === 'group' ? `${item.participants?.length || 0} members` : "Direct chat"}
                                            </Typo>
                                        </View>
                                        <Icons.PaperPlaneTilt size={18} color={colors.primaryDark} weight="fill" />
                                    </TouchableOpacity>
                                );
                            }}
                        />
                    </View>
                </TouchableWithoutFeedback>
            </View>
        </TouchableWithoutFeedback>
    </Modal>
);

const forwardStyles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: colors.white, borderTopLeftRadius: radius._30, borderTopRightRadius: radius._30, paddingBottom: verticalScale(34), maxHeight: '80%' },
    handle: { width: scale(36), height: verticalScale(4), borderRadius: radius.full, backgroundColor: colors.neutral300, alignSelf: 'center', marginTop: verticalScale(10), marginBottom: verticalScale(4) },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacingX._20, paddingVertical: spacingY._15, borderBottomWidth: 1, borderBottomColor: colors.neutral100 },
    closeBtn: { width: verticalScale(30), height: verticalScale(30), borderRadius: radius.full, backgroundColor: colors.neutral100, alignItems: 'center', justifyContent: 'center' },
    list: { padding: spacingX._15, gap: spacingY._10 },
    itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacingX._12, paddingVertical: spacingY._8 },
    itemInfo: { flex: 1, gap: 2 },
    empty: { padding: spacingY._30, alignItems: 'center' },
});

// ── Group Info Modal (Feature 10 & 20) ──
const GroupInfoModal = ({
    visible,
    conversationName,
    conversationAvatar,
    participants,
    admins,
    createdBy,
    currentUserId,
    mediaItems = [],
    onPromote,
    onDemote,
    onClose,
}: {
    visible: boolean;
    conversationName?: string;
    conversationAvatar?: string;
    participants: any[];
    admins: any[];
    createdBy?: string;
    currentUserId: string;
    mediaItems?: MessageProps[];
    onPromote: (userId: string) => void;
    onDemote: (userId: string) => void;
    onClose: () => void;
}) => {
    const isAdmin = admins?.some((a: any) => (a._id || a).toString() === currentUserId);
    const [infoTab, setInfoTab] = useState<'members' | 'media'>('members');

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={groupInfoStyles.overlay}>
                    <TouchableWithoutFeedback>
                        <View style={groupInfoStyles.sheet}>
                            <View style={groupInfoStyles.handle} />
                            <View style={groupInfoStyles.header}>
                                <Avatar size={50} uri={conversationAvatar} isGroup={true} />
                                <Typo size={18} fontWeight="700" color={colors.neutral900}>{conversationName || "Group"}</Typo>
                                <Typo size={13} color={colors.neutral500}>{participants.length} members</Typo>
                            </View>

                            {/* ── Segmented Tabs ── */}
                            <View style={groupInfoStyles.tabRow}>
                                <TouchableOpacity
                                    onPress={() => setInfoTab('members')}
                                    style={[groupInfoStyles.tabBtn, infoTab === 'members' && groupInfoStyles.tabBtnActive]}
                                    activeOpacity={0.7}
                                >
                                    <Typo size={13} fontWeight={infoTab === 'members' ? "700" : "500"} color={infoTab === 'members' ? colors.neutral900 : colors.neutral400}>
                                        Members ({participants.length})
                                    </Typo>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => setInfoTab('media')}
                                    style={[groupInfoStyles.tabBtn, infoTab === 'media' && groupInfoStyles.tabBtnActive]}
                                    activeOpacity={0.7}
                                >
                                    <Typo size={13} fontWeight={infoTab === 'media' ? "700" : "500"} color={infoTab === 'media' ? colors.neutral900 : colors.neutral400}>
                                        Media & Docs ({mediaItems.length})
                                    </Typo>
                                </TouchableOpacity>
                            </View>

                            {infoTab === 'members' ? (
                                <FlatList
                                    data={participants}
                                    keyExtractor={(p) => p._id}
                                    contentContainerStyle={groupInfoStyles.list}
                                    renderItem={({ item }) => {
                                        const userIsAdmin = admins?.some((a: any) => (a._id || a).toString() === item._id);
                                        const userIsCreator = createdBy?.toString() === item._id;
                                        return (
                                            <View style={groupInfoStyles.memberRow}>
                                                <Avatar size={38} uri={item.avatar} />
                                                <View style={groupInfoStyles.memberInfo}>
                                                    <Typo size={14} fontWeight="600" color={colors.neutral900}>
                                                        {item.name} {item._id === currentUserId ? "(You)" : ""}
                                                    </Typo>
                                                    {userIsCreator ? (
                                                        <Typo size={11} color={colors.primaryDark} fontWeight="700">Creator</Typo>
                                                    ) : userIsAdmin ? (
                                                        <Typo size={11} color={colors.green} fontWeight="700">Admin</Typo>
                                                    ) : (
                                                        <Typo size={11} color={colors.neutral400}>Member</Typo>
                                                    )}
                                                </View>
                                                {isAdmin && item._id !== currentUserId && !userIsCreator && (
                                                    <TouchableOpacity
                                                        onPress={() => userIsAdmin ? onDemote(item._id) : onPromote(item._id)}
                                                        style={groupInfoStyles.roleBtn}
                                                    >
                                                        <Typo size={11} fontWeight="600" color={colors.primaryDark}>
                                                            {userIsAdmin ? "Demote" : "Make Admin"}
                                                        </Typo>
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        );
                                    }}
                                />
                            ) : (
                                <ScrollView contentContainerStyle={groupInfoStyles.mediaScroll} showsVerticalScrollIndicator={false}>
                                    {mediaItems.length === 0 ? (
                                        <View style={groupInfoStyles.emptyMedia}>
                                            <Icons.Images size={32} color={colors.neutral300} />
                                            <Typo size={13} color={colors.neutral400}>No photos or documents shared yet</Typo>
                                        </View>
                                    ) : (
                                        <View style={groupInfoStyles.mediaGrid}>
                                            {mediaItems.map((m) => {
                                                if (m.attachement) {
                                                    return (
                                                        <View key={m.id} style={groupInfoStyles.mediaThumbWrap}>
                                                            <Image source={m.attachement} style={groupInfoStyles.mediaThumb} contentFit="cover" />
                                                        </View>
                                                    );
                                                }
                                                if (m.attachmentMeta) {
                                                    return (
                                                        <View key={m.id} style={groupInfoStyles.docItem}>
                                                            <View style={groupInfoStyles.docIconWrap}>
                                                                <Icons.FileText size={20} color={colors.primaryDark} />
                                                            </View>
                                                            <View style={{ flex: 1 }}>
                                                                <Typo size={12} fontWeight="600" color={colors.neutral800} textProps={{ numberOfLines: 1 }}>
                                                                    {m.attachmentMeta.name}
                                                                </Typo>
                                                                <Typo size={10} color={colors.neutral400}>
                                                                    {formatFileSize(m.attachmentMeta.size)}
                                                                </Typo>
                                                            </View>
                                                        </View>
                                                    );
                                                }
                                                return null;
                                            })}
                                        </View>
                                    )}
                                </ScrollView>
                            )}
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const groupInfoStyles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: colors.white, borderTopLeftRadius: radius._30, borderTopRightRadius: radius._30, paddingBottom: verticalScale(34), maxHeight: '85%' },
    handle: { width: scale(36), height: verticalScale(4), borderRadius: radius.full, backgroundColor: colors.neutral300, alignSelf: 'center', marginTop: verticalScale(10), marginBottom: verticalScale(4) },
    header: { alignItems: 'center', gap: spacingY._6, paddingVertical: spacingY._15 },
    tabRow: { flexDirection: 'row', paddingHorizontal: spacingX._20, gap: spacingX._10, marginBottom: spacingY._10 },
    tabBtn: { flex: 1, alignItems: 'center', paddingVertical: spacingY._10, borderBottomWidth: 2, borderBottomColor: colors.neutral200 },
    tabBtnActive: { borderBottomColor: colors.primary },
    list: { paddingHorizontal: spacingX._20, paddingBottom: spacingY._20 },
    memberRow: { flexDirection: 'row', alignItems: 'center', gap: spacingX._12, paddingVertical: spacingY._10 },
    memberInfo: { flex: 1, gap: 2 },
    roleBtn: { paddingHorizontal: spacingX._10, paddingVertical: spacingY._5, backgroundColor: colors.primaryLight, borderRadius: radius.full },
    mediaScroll: { paddingHorizontal: spacingX._20, paddingBottom: spacingY._20 },
    emptyMedia: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacingY._30, gap: spacingY._7 },
    mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(8) },
    mediaThumbWrap: { width: scale(100), height: scale(100), borderRadius: radius._10, overflow: 'hidden' },
    mediaThumb: { width: '100%', height: '100%' },
    docItem: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: spacingX._10, paddingVertical: spacingY._8, borderBottomWidth: 1, borderBottomColor: colors.neutral100 },
    docIconWrap: { width: scale(36), height: scale(36), borderRadius: radius._10, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
});

// ── Attachment Options ──
const AttachmentOptions = ({
    onPickImage, onPickFile, onCreatePoll, onClose,
}: {
    onPickImage: () => void;
    onPickFile: () => void;
    onCreatePoll: () => void;
    onClose: () => void;
}) => (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={attachStyles.container}>
        <TouchableOpacity style={attachStyles.option} onPress={onPickImage} activeOpacity={0.7}>
            <View style={[attachStyles.iconWrap, { backgroundColor: colors.primaryLight }]}>
                <Icons.Image size={verticalScale(20)} color={colors.primaryDark} weight="fill" />
            </View>
            <Typo size={12} fontWeight="600" color={colors.neutral700}>Image</Typo>
        </TouchableOpacity>

        <TouchableOpacity style={attachStyles.option} onPress={onPickFile} activeOpacity={0.7}>
            <View style={[attachStyles.iconWrap, { backgroundColor: colors.neutral100 }]}>
                <Icons.FileText size={verticalScale(20)} color={colors.neutral600} weight="fill" />
            </View>
            <Typo size={12} fontWeight="600" color={colors.neutral700}>File</Typo>
        </TouchableOpacity>

        <TouchableOpacity style={attachStyles.option} onPress={onCreatePoll} activeOpacity={0.7}>
            <View style={[attachStyles.iconWrap, { backgroundColor: '#f0fdf4' }]}>
                <Icons.ChartBar size={verticalScale(20)} color={colors.green} weight="fill" />
            </View>
            <Typo size={12} fontWeight="600" color={colors.neutral700}>Poll</Typo>
        </TouchableOpacity>

        <TouchableOpacity style={attachStyles.closeOption} onPress={onClose} activeOpacity={0.7}>
            <Icons.X size={verticalScale(16)} color={colors.neutral500} weight="bold" />
        </TouchableOpacity>
    </Animated.View>
);

const attachStyles = StyleSheet.create({
    container: {
        flexDirection: "row", alignItems: "center",
        backgroundColor: colors.white, borderRadius: radius._15,
        borderWidth: 1, borderColor: colors.neutral200,
        marginBottom: spacingY._7, paddingHorizontal: spacingX._15,
        paddingVertical: spacingY._10, gap: spacingX._15,
        shadowColor: colors.black, shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
    },
    option: { alignItems: "center", gap: spacingY._5 },
    iconWrap: { width: verticalScale(44), height: verticalScale(44), borderRadius: radius._12, alignItems: "center", justifyContent: "center" },
    closeOption: { marginLeft: "auto", padding: spacingX._5, backgroundColor: colors.neutral100, borderRadius: radius.full, width: verticalScale(30), height: verticalScale(30), alignItems: "center", justifyContent: "center" },
});

// ─────────────────────────────────────────────
// MAIN CONVERSATION COMPONENT
// ─────────────────────────────────────────────
const Conversation = () => {
    const { user: currentUser } = useAuth();
    const router = useRouter();
    const { id: conversationId, name, participants: stringifiedParticipants, avatar, type } = useLocalSearchParams();

    const [message, setMessage] = useState('');
    const participants: any[] = (() => {
        try {
            if (typeof stringifiedParticipants === "string" && stringifiedParticipants.trim()) {
                const parsed = JSON.parse(stringifiedParticipants);
                return Array.isArray(parsed) ? parsed : [];
            }
            return [];
        } catch {
            return [];
        }
    })();
    const [selectedFile, setSelectedFile] = useState<SelectedFileProps | null>(null);
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState<MessageProps[]>([]);
    const [messageStatuses, setMessageStatuses] = useState<Record<string, "sent" | "delivered" | "seen">>({});
    const [replyTo, setReplyTo] = useState<ReplyToProps | null>(null);
    const [typingUser, setTypingUser] = useState<string | null>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isTypingRef = useRef(false);

    // ── Attachment picker ──
    const [showAttachOptions, setShowAttachOptions] = useState(false);

    // ── Poll state ──
    const [showPollModal, setShowPollModal] = useState(false);
    const [pollQuestion, setPollQuestion] = useState('');
    const [pollOptions, setPollOptions] = useState(['', '']);
    const [pollAllowMultiple, setPollAllowMultiple] = useState(false);

    // ── Pagination ──
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const isLoadingMoreRef = useRef(false);

    // ── Online Status ──
    const [contactIsOnline, setContactIsOnline] = useState(false);
    const [contactLastSeen, setContactLastSeen] = useState<string | null>(null);

    // ── Voice recording ──
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [isUploadingVoice, setIsUploadingVoice] = useState(false);
    const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
    const recordingRef = useRef<ReturnType<typeof useAudioRecorder> | null>(null);
    const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const micScale = useSharedValue(1);
    const micAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: micScale.value }] }));

    const isDirect = type === 'direct';
    const otherParticipant = isDirect ? participants.find((p: any) => p._id !== currentUser?.id) : null;

    let conversationAvatar = avatar;
    if (isDirect && otherParticipant) conversationAvatar = otherParticipant.avatar;
    let conversationName = isDirect ? otherParticipant?.name : name;

    // ── Advanced Features State (Features 2, 3, 4, 5, 7, 9, 10) ──
    const [pinnedMessages, setPinnedMessages] = useState<any[]>([]);
    const [isViewOnce, setIsViewOnce] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeSearchIndex, setActiveSearchIndex] = useState(0);
    const [forwardModalVisible, setForwardModalVisible] = useState(false);
    const [forwardingMessage, setForwardingMessage] = useState<MessageProps | null>(null);
    const [recentConversations, setRecentConversations] = useState<any[]>([]);
    const [groupInfoVisible, setGroupInfoVisible] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    // ── Chat Wallpaper & Theme (Feature 14) ──
    const [selectedTheme, setSelectedTheme] = useState<ChatTheme>(CHAT_THEMES[0]);
    const [showThemeModal, setShowThemeModal] = useState(false);

    useEffect(() => {
        if (!conversationId) return;
        AsyncStorage.getItem(`@bubbly_chat_theme_${conversationId}`).then((savedId) => {
            if (savedId) {
                const found = CHAT_THEMES.find(t => t.id === savedId);
                if (found) setSelectedTheme(found);
            }
        }).catch(() => {});
    }, [conversationId]);

    const handleSelectTheme = (th: ChatTheme) => {
        setSelectedTheme(th);
        setShowThemeModal(false);
        if (conversationId) {
            AsyncStorage.setItem(`@bubbly_chat_theme_${conversationId}`, th.id).catch(() => {});
        }
    };

    // ── Network status & Auto-scroll pill (Features 17 & 18) ──
    const [isOnlineNetwork, setIsOnlineNetwork] = useState(isSocketConnected());
    const [isScrolledUp, setIsScrolledUp] = useState(false);
    const [newMessagesBelow, setNewMessagesBelow] = useState(0);

    // ── Android Back Button Listener ──
    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            if (isSearching) {
                setIsSearching(false);
                setSearchQuery('');
                return true;
            }
            if (showThemeModal) {
                setShowThemeModal(false);
                return true;
            }
            if (groupInfoVisible) {
                setGroupInfoVisible(false);
                return true;
            }
            if (forwardModalVisible) {
                setForwardModalVisible(false);
                return true;
            }
            if (showAttachOptions) {
                setShowAttachOptions(false);
                return true;
            }
            return false;
        });
        return () => backHandler.remove();
    }, [isSearching, showThemeModal, groupInfoVisible, forwardModalVisible, showAttachOptions]);

    // ── Connection Status Listener ──
    useEffect(() => {
        return onSocketConnectionChange(setIsOnlineNetwork);
    }, []);

    const handleScroll = (event: any) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        const scrolled = offsetY > 180;
        setIsScrolledUp(scrolled);
        if (!scrolled) {
            setNewMessagesBelow(0);
        }
    };

    const scrollToBottom = () => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        setNewMessagesBelow(0);
        setIsScrolledUp(false);
    };

    // ─────────────────────────────────────────────
    // SOCKET SETUP
    // ─────────────────────────────────────────────
    useEffect(() => {
        newMessage(newMessageHandler);
        getMessages(messagesHandler);
        onTyping(typingHandler);
        onStopTyping(stopTypingHandler);
        reactToMessage(reactionHandler);
        deleteMessage(deleteMessageHandler);
        editMessage(editMessageHandler);
        onUserStatus(userStatusHandler);
        getUserStatus(getUserStatusHandler);
        onCallRinging(callRingingHandler);
        onCallFailed(callFailedHandler);
        onPollUpdated(pollUpdatedHandler);
        onMessageDelivered(messageDeliveredHandler);
        onReadReceipt(readReceiptHandler);
        onPinnedMessageUpdated(pinnedMessageHandler);
        onViewOnceOpened(viewOnceOpenedHandler);
        onMessageStarred(starMessageHandler);

        getMessages({ conversationId, page: 0, limit: 30 });
        markAsRead(conversationId as string);

        if (isDirect && otherParticipant) {
            getUserStatus({ userId: otherParticipant._id });
        }

        return () => {
            newMessage(newMessageHandler, true);
            getMessages(messagesHandler, true);
            onTyping(typingHandler, true);
            onStopTyping(stopTypingHandler, true);
            reactToMessage(reactionHandler, true);
            deleteMessage(deleteMessageHandler, true);
            editMessage(editMessageHandler, true);
            onUserStatus(userStatusHandler, true);
            getUserStatus(getUserStatusHandler, true);
            onCallRinging(callRingingHandler, true);
            onCallFailed(callFailedHandler, true);
            onPollUpdated(pollUpdatedHandler, true);
            onMessageDelivered(messageDeliveredHandler, true);
            onReadReceipt(readReceiptHandler, true);
            onPinnedMessageUpdated(pinnedMessageHandler, true);
            onViewOnceOpened(viewOnceOpenedHandler, true);
            onMessageStarred(starMessageHandler, true);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            stopRecording(true);
        };
    }, []);

    // ─────────────────────────────────────────────
    // MESSAGE RECEIPT HANDLERS
    // ─────────────────────────────────────────────
    const messageDeliveredHandler = useCallback((data: {
        messageId: string;
        conversationId: string;
    }) => {
        if (data.conversationId?.toString() !== conversationId?.toString()) return;

        setMessageStatuses(prev => {
            if (prev[data.messageId] === "seen") return prev;
            return { ...prev, [data.messageId]: "delivered" };
        });
    }, [conversationId]);

    const readReceiptHandler = useCallback((data: {
        conversationId: string;
        userId: string;
    }) => {
        if (!isDirect) return;
        if (data.conversationId?.toString() !== conversationId?.toString()) return;
        if (data.userId?.toString() === currentUser?.id?.toString()) return;

        // In a direct chat, the other participant opening the chat means
        // all currently tracked outgoing messages are seen.
        setMessageStatuses(prev => {
            const next = { ...prev };
            let changed = false;
            for (const messageId of Object.keys(next)) {
                if (next[messageId] !== "seen") {
                    next[messageId] = "seen";
                    changed = true;
                }
            }
            return changed ? next : prev;
        });
    }, [conversationId, currentUser?.id, isDirect]);

    // ─────────────────────────────────────────────
    // CALL HANDLERS
    // ─────────────────────────────────────────────
    const handleStartCall = useCallback((callKind: 'voice' | 'video') => {
        if (!otherParticipant || !currentUser) return;
        callInvite({ conversationId: conversationId as string, calleeId: otherParticipant._id, kind: callKind });
    }, [otherParticipant, currentUser, conversationId]);

    const callRingingHandler = useCallback((data: any) => {
        router.push({
            pathname: '/(main)/callScreen',
            params: {
                callId: data.callId, kind: data.kind,
                conversationId: data.conversationId,
                remoteUserName: isDirect ? otherParticipant?.name : name,
                remoteUserAvatar: isDirect ? otherParticipant?.avatar : avatar,
                isOutgoing: 'true',
            },
        });
    }, [otherParticipant, isDirect, name, avatar]);

    const callFailedHandler = useCallback((data: any) => {
        Alert.alert(data.reason === 'busy' ? '🔴 User Busy' : '❌ Call Failed', data.msg || 'Could not connect the call');
    }, []);

    // ─────────────────────────────────────────────
    // POLL HANDLER
    // ─────────────────────────────────────────────
    const pollUpdatedHandler = useCallback((res: ResponseProps) => {
        if (!res.success || !res.data?.messageId) return;

        if (
            res.data.conversationId &&
            res.data.conversationId.toString() !== conversationId?.toString()
        ) {
            return;
        }

        setMessages(prev =>
            prev.map(msg =>
                msg.id === res.data.messageId
                    ? {
                        ...msg,
                        type: "poll",
                        poll: res.data.poll,
                    }
                    : msg
            )
        );
    }, [conversationId]);

    const handleCreatePoll = () => {
        const validOptions = pollOptions.filter(o => o.trim());
        if (!pollQuestion.trim()) { Alert.alert('Error', 'Please enter a question'); return; }
        if (validOptions.length < 2) { Alert.alert('Error', 'Please add at least 2 options'); return; }

        createPoll({
            conversationId,
            question: pollQuestion.trim(),
            options: validOptions,
            allowMultiple: pollAllowMultiple,
        });

        setShowPollModal(false);
        setPollQuestion('');
        setPollOptions(['', '']);
        setPollAllowMultiple(false);
    };

    // ─────────────────────────────────────────────
    // MESSAGE HANDLERS
    // ─────────────────────────────────────────────
    const newMessageHandler = (res: ResponseProps) => {
        setLoading(false);

        if (!res.success) {
            Alert.alert("Error", res.msg);
            return;
        }

        if (!res.data?.id) return;

        if (
            res.data.conversationId?.toString() !==
            conversationId?.toString()
        ) {
            return;
        }

        const incoming = res.data as MessageProps;

        const isActualPoll =
            incoming.type === "poll" ||
            (
                !!incoming.poll &&
                typeof incoming.poll.question === "string" &&
                incoming.poll.question.trim().length > 0 &&
                Array.isArray(incoming.poll.options) &&
                incoming.poll.options.length >= 2
            );

        const normalizedMessage: MessageProps = {
            ...incoming,
            type: isActualPoll ? "poll" : (incoming.type || "text"),
            content: incoming.content || "",
            poll: isActualPoll ? incoming.poll : null,
            conversationId: conversationId as string,
        };

        const isOwnMessage = normalizedMessage.sender?.id?.toString() === currentUser?.id?.toString();

        setMessageStatuses(prev => ({
            ...prev,
            [normalizedMessage.id]: isOwnMessage ? (prev[normalizedMessage.id] || "sent") : prev[normalizedMessage.id],
        }));

        // We received this from another user, so confirm delivery back to the sender.
        if (!isOwnMessage) {
            messageDelivered({
                messageId: normalizedMessage.id,
                conversationId: conversationId as string,
            });
            if (isScrolledUp) {
                setNewMessagesBelow(prev => prev + 1);
            }
        }

        setMessages((prev) => {
            if (prev.some((msg) => msg.id === normalizedMessage.id)) {
                return prev;
            }

            return [normalizedMessage, ...prev];
        });

        setTypingUser(null);
        markAsRead(conversationId as string);
    };

    const messagesHandler = (res: ResponseProps) => {
        if (res.success) {
            const incomingPage = res.page ?? 0;
            setHasMore(res.hasMore ?? false);
            setIsLoadingMore(false);
            isLoadingMoreRef.current = false;
            const pageMessages = res.data as MessageProps[];
            setMessageStatuses(prev => {
                const next = { ...prev };
                for (const msg of pageMessages) {
                    if (msg.sender?.id?.toString() === currentUser?.id?.toString() && !next[msg.id]) {
                        next[msg.id] = "sent";
                    }
                }
                return next;
            });

            if ((res as any).pinnedMessages) {
                setPinnedMessages((res as any).pinnedMessages);
            }

            if (incomingPage === 0) { setMessages(pageMessages); setPage(0); }
            else { setMessages(prev => [...prev, ...pageMessages]); setPage(incomingPage); }
        } else {
            setIsLoadingMore(false);
            isLoadingMoreRef.current = false;
        }
    };

    const pinnedMessageHandler = useCallback((res: any) => {
        if (res?.success && res.data?.conversationId === conversationId) {
            setPinnedMessages(res.data.pinnedMessages || []);
            if (res.data.action === "pinned") {
                setMessages(prev => prev.map(m => m.id === res.data.messageId ? { ...m, isPinned: true } : m));
            } else if (res.data.action === "unpinned") {
                setMessages(prev => prev.map(m => m.id === res.data.messageId ? { ...m, isPinned: false } : m));
            }
        }
    }, [conversationId]);

    const viewOnceOpenedHandler = useCallback((res: any) => {
        if (res?.success && res.data?.conversationId === conversationId) {
            setMessages(prev => prev.map(m => {
                if (m.id === res.data.messageId) {
                    const list = m.viewOnceOpenedBy || [];
                    return {
                        ...m,
                        viewOnceOpenedBy: [...list, res.data.userId],
                    };
                }
                return m;
            }));
        }
    }, [conversationId]);

    const starMessageHandler = useCallback((res: any) => {
        if (res?.success && res.data?.conversationId === conversationId) {
            setMessages(prev => prev.map(m => m.id === res.data.messageId ? { ...m, isSaved: res.data.isSaved } : m));
        }
    }, [conversationId]);

    const typingHandler = useCallback((data: TypingPayload) => {
        if (data.senderId === currentUser?.id) return;
        if (data.conversationId !== conversationId) return;
        setTypingUser(data.senderName);
    }, [currentUser?.id, conversationId]);

    const stopTypingHandler = useCallback((data: { conversationId: string; senderId: string }) => {
        if (data.senderId === currentUser?.id) return;
        if (data.conversationId !== conversationId) return;
        setTypingUser(null);
    }, [currentUser?.id, conversationId]);

    const reactionHandler = useCallback((res: ResponseProps) => {
        if (res.success) {
            setMessages(prev => prev.map(msg => msg.id === res.data.messageId ? { ...msg, reactions: res.data.reactions } : msg));
        }
    }, []);

    const deleteMessageHandler = useCallback((res: ResponseProps) => {
        if (res.success) {
            setMessages(prev => prev.map(msg => msg.id === res.data.messageId ? { ...msg, isDeleted: true, content: "", attachement: null, voiceUrl: null } : msg));
        }
    }, []);

    const editMessageHandler = useCallback((res: ResponseProps) => {
        if (res.success) {
            setMessages(prev => prev.map(msg => msg.id === res.data.messageId ? { ...msg, content: res.data.content, isEdited: true } : msg));
        }
    }, []);

    const userStatusHandler = useCallback((data: UserStatusPayload) => {
        if (!isDirect || !otherParticipant) return;
        if (data.userId !== otherParticipant._id) return;
        setContactIsOnline(data.isOnline);
        setContactLastSeen(data.lastSeen);
    }, [isDirect, otherParticipant]);

    const getUserStatusHandler = useCallback((res: ResponseProps) => {
        if (res.success) { setContactIsOnline(res.data.isOnline); setContactLastSeen(res.data.lastSeen); }
    }, []);

    // ─────────────────────────────────────────────
    // LOAD MORE
    // ─────────────────────────────────────────────
    const handleLoadMore = useCallback(() => {
        if (isLoadingMoreRef.current || !hasMore) return;
        isLoadingMoreRef.current = true;
        setIsLoadingMore(true);
        getMessages({ conversationId, page: page + 1, limit: 30 });
    }, [page, hasMore, conversationId]);

    // ─────────────────────────────────────────────
    // REACTION
    // ─────────────────────────────────────────────
    const handleReaction = useCallback((messageId: string, emoji: string) => {
        if (!currentUser) return;
        reactToMessage({ messageId, conversationId, emoji, userId: currentUser.id, userName: currentUser.name });
    }, [currentUser, conversationId]);

    // ─────────────────────────────────────────────
    // TYPING
    // ─────────────────────────────────────────────
    const handleMessageChange = (text: string) => {
        setMessage(text);
        if (!currentUser || !conversationId) return;
        if (!isTypingRef.current) {
            isTypingRef.current = true;
            emitTyping({ conversationId: conversationId as string, senderId: currentUser.id as string, senderName: currentUser.name });
        }
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            isTypingRef.current = false;
            emitStopTyping({ conversationId: conversationId as string, senderId: currentUser.id as string });
        }, 2000);
    };

    // ─────────────────────────────────────────────
    // REPLY
    // ─────────────────────────────────────────────
    const handleReply = (item: MessageProps) => {
        setReplyTo({ id: item.id, content: item.content, senderName: item.sender.name, voiceUrl: item.voiceUrl || null });
    };

    const handleCancelReply = () => setReplyTo(null);

    // ─────────────────────────────────────────────
    // VOICE RECORDING
    // ─────────────────────────────────────────────
    const startRecording = async () => {
        try {
            const { granted } = await AudioModule.requestRecordingPermissionsAsync();
            if (!granted) { Alert.alert("Permission needed", "Microphone permission is required."); return; }
            await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
            await audioRecorder.prepareToRecordAsync();
            audioRecorder.record();
            recordingRef.current = audioRecorder;
            setIsRecording(true);
            setRecordingDuration(0);
            micScale.value = withSpring(1.3);
            recordingTimerRef.current = setInterval(() => {
                setRecordingDuration(prev => { if (prev >= 120) { stopRecording(); return prev; } return prev + 1; });
            }, 1000);
        } catch (error) {
            console.log("startRecording error:", error);
            Alert.alert("Error", "Could not start recording");
        }
    };

    const stopRecording = async (cancel = false) => {
        try {
            if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
            micScale.value = withSpring(1);
            if (!recordingRef.current) { setIsRecording(false); return; }
            const recording = recordingRef.current;
            recordingRef.current = null;
            await recording.stop();
            await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
            setIsRecording(false);
            if (cancel || recordingDuration < 1) { setRecordingDuration(0); return; }
            const uri = recording.uri;
            if (!uri) return;
            const duration = recordingDuration;
            setRecordingDuration(0);
            await sendVoiceMessage(uri, duration);
        } catch (error) {
            console.log("stopRecording error:", error);
            setIsRecording(false);
            setRecordingDuration(0);
        }
    };

    const cancelRecording = async () => { await stopRecording(true); };

    const sendVoiceMessage = async (uri: string, duration: number) => {
        if (!currentUser) return;
        setIsUploadingVoice(true);
        try {
            const uploadResult = await uploadAudioToCloudinary(uri, "voice-messages");
            if (!uploadResult.success || !uploadResult.data) { Alert.alert("Error", "Could not upload voice message"); return; }
            newMessage({ conversationId, sender: { id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar }, content: "", attachement: null, replyTo: replyTo?.id || null, voiceUrl: uploadResult.data, voiceDuration: duration });
            setReplyTo(null);
        } catch { Alert.alert("Error", "Failed to send voice message"); }
        finally { setIsUploadingVoice(false); }
    };

    // ─────────────────────────────────────────────
    // IMAGE PICKER
    // ─────────────────────────────────────────────
    const onPickImage = async () => {
        setShowAttachOptions(false);
        let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], aspect: [4, 3], quality: 0.7 });
        if (!result.canceled) {
            const asset = result.assets[0];
            setSelectedFile({ uri: asset.uri, name: asset.uri.split('/').pop() || 'image.jpg', mimeType: asset.mimeType || 'image/jpeg', size: asset.fileSize || 0, isImage: true });
        }
    };

    // ─────────────────────────────────────────────
    // DOCUMENT PICKER
    // ─────────────────────────────────────────────
    const onPickFile = async () => {
        setShowAttachOptions(false);
        try {
            const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false });
            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                if (asset.size && asset.size > 50 * 1024 * 1024) { Alert.alert("File too large", "Please select a file smaller than 50MB."); return; }
                const mimeType = asset.mimeType || 'application/octet-stream';
                setSelectedFile({ uri: asset.uri, name: asset.name || 'file', mimeType, size: asset.size || 0, isImage: mimeType.startsWith('image/') });
            }
        } catch { Alert.alert("Error", "Could not pick file"); }
    };

    // ─────────────────────────────────────────────
    // SEND MESSAGE
    // ─────────────────────────────────────────────
    const onSend = async () => {
        if (!message.trim() && !selectedFile) return;
        if (!currentUser) return;

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        if (isTypingRef.current) {
            isTypingRef.current = false;
            emitStopTyping({ conversationId: conversationId as string, senderId: currentUser.id as string });
        }

        setLoading(true);
        try {
            let attachement = null;
            let attachmentMeta = null;
            let messageType = 'text';

            if (selectedFile) {
                if (selectedFile.isImage) {
                    const uploadResult = await uploadFileToCloudinary({ uri: selectedFile.uri }, "message-attachements");
                    if (!uploadResult.success) { setLoading(false); Alert.alert("Error", "Could not send the image!"); return; }
                    attachement = uploadResult.data;
                    messageType = 'image';
                } else {
                    const uploadResult = await uploadDocumentToCloudinary(selectedFile.uri, selectedFile.mimeType, selectedFile.name, "chat-files");
                    if (!uploadResult.success || !uploadResult.data) { setLoading(false); Alert.alert("Error", "Could not send the file!"); return; }
                    attachement = uploadResult.data.url;
                    attachmentMeta = { url: uploadResult.data.url, name: uploadResult.data.name, mimeType: uploadResult.data.mimeType, size: uploadResult.data.size, resourceType: uploadResult.data.resourceType };
                    messageType = 'file';
                }
            }

            newMessage({
                conversationId,
                sender: { id: currentUser?.id, name: currentUser.name, avatar: currentUser.avatar },
                content: message.trim(),
                attachement,
                attachmentMeta,
                type: messageType,
                replyTo: replyTo?.id || null,
                isViewOnce: selectedFile?.isImage ? isViewOnce : false,
            });
            setMessage(""); setSelectedFile(null); setReplyTo(null); setIsViewOnce(false);
        } catch { Alert.alert("Error", "Failed to send message"); }
        finally { setLoading(false); }
    };

    // ─────────────────────────────────────────────
    // DATE SEPARATORS
    // ─────────────────────────────────────────────
    const mediaMessages = useMemo(() => {
        return messages.filter(m => (!!m.attachement && !m.isViewOnce) || !!m.attachmentMeta);
    }, [messages]);

    const messagesWithSeparators = useMemo((): MessageListItem[] => {
        if (messages.length === 0) return [];

        const chronological = [...messages].reverse();
        const result: MessageListItem[] = [];
        let lastDateStr = '';

        chronological.forEach((msg) => {
            const msgDateStr = moment(msg.createdAt).format('YYYY-MM-DD');

            if (msgDateStr !== lastDateStr) {
                result.push({
                    id: `separator-${msgDateStr}-${msg.id}`,
                    type: 'separator',
                    date: msg.createdAt
                });

                lastDateStr = msgDateStr;
            }

            result.push({
                id: msg.id,
                type: 'message',
                message: msg,
            });
        });

        return result.reverse();
    }, [messages]);

    const handleJumpToMessage = (messageId: string) => {
        const idx = messagesWithSeparators.findIndex(
            (m) => m.type === 'message' && m.message.id === messageId
        );
        if (idx !== -1) {
            flatListRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.5 });
        }
    };

    const handlePin = (messageId: string) => {
        pinMessage({ conversationId: conversationId as string, messageId });
    };

    const handleUnpin = (messageId: string) => {
        unpinMessage({ conversationId: conversationId as string, messageId });
    };

    const handleToggleStar = (messageId: string) => {
        toggleStarMessage({ messageId, conversationId: conversationId as string });
    };

    const handleOpenForward = (msg: MessageProps) => {
        setForwardingMessage(msg);
        getConversations((res: any) => {
            if (res?.success && Array.isArray(res.data)) {
                setRecentConversations(res.data.filter((c: any) => c._id !== conversationId));
            }
        });
        setForwardModalVisible(true);
    };

    const handleSendForward = (targetConvId: string) => {
        if (!forwardingMessage) return;
        forwardMessage({ messageId: forwardingMessage.id, targetConversationIds: [targetConvId] });
        setForwardModalVisible(false);
        setForwardingMessage(null);
        Alert.alert("Forwarded", "Message forwarded successfully!");
    };

    const handleMuteOptions = () => {
        Alert.alert(
            "Mute Notifications",
            "Select duration to mute notifications:",
            [
                { text: "8 Hours", onPress: () => toggleMuteConversation({ conversationId: conversationId as string, durationHours: 8 }) },
                { text: "1 Week", onPress: () => toggleMuteConversation({ conversationId: conversationId as string, durationHours: 168 }) },
                { text: "Always", onPress: () => toggleMuteConversation({ conversationId: conversationId as string, durationHours: 0 }) },
                { text: "Unmute", onPress: () => toggleMuteConversation({ conversationId: conversationId as string, unmute: true }) },
                { text: "Cancel", style: "cancel" },
            ]
        );
    };

    const handleOpenMoreMenu = () => {
        const options: { text: string; onPress?: () => void; style?: "default" | "cancel" | "destructive" }[] = [
            {
                text: isSearching ? "Close Search" : "Search in Chat",
                onPress: () => {
                    setIsSearching(prev => !prev);
                    if (isSearching) setSearchQuery('');
                },
            },
            {
                text: "Chat Wallpaper & Theme",
                onPress: () => setShowThemeModal(true),
            },
            { text: "Mute Notifications", onPress: handleMuteOptions },
        ];
        if (type === 'group') {
            options.push({ text: "Group Members & Info", onPress: () => setGroupInfoVisible(true) });
        }
        options.push({ text: "Cancel", style: "cancel" });

        Alert.alert("Chat Options", undefined, options);
    };

    const handlePromoteAdmin = (targetUserId: string) => {
        setGroupAdmin({ conversationId: conversationId as string, targetUserId, promote: true });
    };

    const handleDemoteAdmin = (targetUserId: string) => {
        setGroupAdmin({ conversationId: conversationId as string, targetUserId, promote: false });
    };

    const searchMatches = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const q = searchQuery.toLowerCase();
        const matches: number[] = [];
        messagesWithSeparators.forEach((item, index) => {
            if (item.type === 'message' && item.message.content?.toLowerCase().includes(q)) {
                matches.push(index);
            }
        });
        return matches;
    }, [messagesWithSeparators, searchQuery]);

    const handleSearchPrev = () => {
        if (searchMatches.length === 0) return;
        const nextIdx = (activeSearchIndex - 1 + searchMatches.length) % searchMatches.length;
        setActiveSearchIndex(nextIdx);
        flatListRef.current?.scrollToIndex({ index: searchMatches[nextIdx], animated: true, viewPosition: 0.5 });
    };

    const handleSearchNext = () => {
        if (searchMatches.length === 0) return;
        const nextIdx = (activeSearchIndex + 1) % searchMatches.length;
        setActiveSearchIndex(nextIdx);
        flatListRef.current?.scrollToIndex({ index: searchMatches[nextIdx], animated: true, viewPosition: 0.5 });
    };

    const canSend = message.trim().length > 0 || selectedFile !== null;

    // ── Memoized Message Item Renderer (High Performance) ──
    const renderMessageItem = useCallback(({ item }: { item: MessageListItem }) => {
        if (item.type === 'separator') {
            return <DateSeparator date={item.date} />;
        }

        return (
            <MessageItem
                item={{
                    ...item.message,
                    conversationId: conversationId as string,
                }}
                isDirect={isDirect as boolean}
                onReply={handleReply}
                onReact={handleReaction}
                onForward={handleOpenForward}
                onToggleStar={handleToggleStar}
                onPin={handlePin}
                onUnpin={handleUnpin}
                deliveryStatus={messageStatuses[item.message.id]}
                searchHighlight={isSearching && searchQuery.trim() ? searchQuery.trim() : undefined}
                customBubbleMine={selectedTheme.bubbleMine}
                customBubbleOther={selectedTheme.bubbleOther}
            />
        );
    }, [
        conversationId,
        isDirect,
        handleReply,
        handleReaction,
        handleOpenForward,
        handleToggleStar,
        handlePin,
        handleUnpin,
        messageStatuses,
        isSearching,
        searchQuery,
        selectedTheme.bubbleMine,
        selectedTheme.bubbleOther,
    ]);

    // ─────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────
    return (
        <ScreenWrapper showPattern={true} bgOpacity={0.5}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? "padding" : undefined} style={styles.container}>

                {/* ── Header ── */}
                <Animated.View entering={FadeInDown.duration(400).springify()} style={styles.header}>
                    <View style={styles.headerLeft}>
                        <BackButton iconSize={22} />
                        <TouchableOpacity style={styles.headerInfo} activeOpacity={0.75}>
                            <View style={styles.avatarWrap}>
                                <Avatar size={38} uri={conversationAvatar as string} isGroup={type === 'group'} />
                                {isDirect && contactIsOnline && <View style={styles.onlineDot} />}
                            </View>
                            <View style={styles.headerText}>
                                <Typo color={colors.white} fontWeight="700" size={16} textProps={{ numberOfLines: 1 }}>{conversationName}</Typo>
                                {typingUser ? (
                                    <Animated.View entering={FadeIn.duration(200)} style={styles.headerTypingRow}>
                                        <View style={styles.headerTypingDots}>
                                            <TypingDot delay={0} /><TypingDot delay={150} /><TypingDot delay={300} />
                                        </View>
                                        <Typo color={'rgba(255,255,255,0.8)'} size={12} fontWeight="500">
                                            {isDirect ? 'typing...' : `${typingUser} is typing...`}
                                        </Typo>
                                    </Animated.View>
                                ) : (
                                    <Typo color={'rgba(255,255,255,0.55)'} size={12} fontWeight="400">
                                        {isDirect ? contactIsOnline ? 'Online' : formatLastSeen(contactLastSeen) : `${participants.length} members`}
                                    </Typo>
                                )}
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* ── Header Right ── */}
                    <View style={styles.headerRight}>
                        <TouchableOpacity style={styles.callBtn} onPress={() => setIsSearching(prev => !prev)} activeOpacity={0.7}>
                            <Icons.MagnifyingGlass weight="bold" color={colors.white} size={verticalScale(18)} />
                        </TouchableOpacity>
                        {isDirect && (
                            <>
                                <TouchableOpacity style={styles.callBtn} onPress={() => handleStartCall('voice')} activeOpacity={0.7}>
                                    <Icons.Phone weight="fill" color={colors.white} size={verticalScale(18)} />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.callBtn} onPress={() => handleStartCall('video')} activeOpacity={0.7}>
                                    <Icons.VideoCamera weight="fill" color={colors.white} size={verticalScale(18)} />
                                </TouchableOpacity>
                            </>
                        )}
                        <TouchableOpacity style={styles.moreBtn} activeOpacity={0.7} onPress={handleOpenMoreMenu}>
                            <Icons.DotsThreeVertical weight="bold" color={colors.white} size={verticalScale(20)} />
                        </TouchableOpacity>
                    </View>
                </Animated.View>

                {/* ── Network Offline Reconnecting Banner (Feature 18) ── */}
                {!isOnlineNetwork && (
                    <Animated.View entering={FadeInDown.duration(250)} exiting={FadeOut.duration(200)} style={styles.networkBanner}>
                        <Icons.WifiSlash size={verticalScale(14)} color={colors.rose} weight="bold" />
                        <Typo size={12} color={colors.rose} fontWeight="600">Waiting for network...</Typo>
                    </Animated.View>
                )}

                {/* ── Content Sheet with Custom Theme Background ── */}
                <View style={[styles.content, { backgroundColor: selectedTheme.bg }]}>
                    {/* ── Search Bar ── */}
                    {isSearching && (
                        <ChatSearchBar
                            query={searchQuery}
                            onChangeQuery={(q) => { setSearchQuery(q); setActiveSearchIndex(0); }}
                            matchCount={searchMatches.length}
                            currentIndex={activeSearchIndex}
                            onPrev={handleSearchPrev}
                            onNext={handleSearchNext}
                            onClose={() => { setIsSearching(false); setSearchQuery(''); }}
                        />
                    )}

                    {/* ── Pinned Message Banner ── */}
                    {pinnedMessages.length > 0 && !isSearching && (
                        <PinnedMessageBanner
                            pinnedMessages={pinnedMessages}
                            onPress={handleJumpToMessage}
                            onUnpin={handleUnpin}
                        />
                    )}

                    <FlatList
                        ref={flatListRef}
                        data={messagesWithSeparators}
                        inverted={true}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.messagesContent}
                        keyExtractor={(item) => item.id}
                        renderItem={renderMessageItem}
                        onEndReached={handleLoadMore}
                        onEndReachedThreshold={0.3}
                        initialNumToRender={15}
                        maxToRenderPerBatch={10}
                        windowSize={11}
                        removeClippedSubviews={Platform.OS === 'android'}
                        keyboardShouldPersistTaps="handled"
                        onScroll={handleScroll}
                        scrollEventThrottle={32}
                        ListFooterComponent={isLoadingMore ? <LoadMoreIndicator /> : null}
                        ListHeaderComponent={typingUser ? <TypingIndicator name={typingUser} isDirect={isDirect as boolean} /> : null}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <View style={styles.emptyIconWrap}>
                                    <Icons.ChatTeardropDots size={verticalScale(30)} color={colors.neutral300} weight="regular" />
                                </View>
                                <Typo size={14} fontWeight="600" color={colors.neutral500}>No messages yet</Typo>
                                <Typo size={12} color={colors.neutral400} style={{ textAlign: 'center' }}>Say hello to start the conversation!</Typo>
                            </View>
                        }
                    />

                    {/* ── Auto-Scroll to Bottom Floating Pill (Feature 17) ── */}
                    {isScrolledUp && (
                        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={styles.scrollToBottomWrap}>
                            <TouchableOpacity style={styles.scrollToBottomBtn} onPress={scrollToBottom} activeOpacity={0.8}>
                                <Icons.CaretDown size={verticalScale(18)} color={colors.neutral800} weight="bold" />
                                {newMessagesBelow > 0 && (
                                    <View style={styles.newMsgBadge}>
                                        <Typo size={10} color={colors.white} fontWeight="800">
                                            {newMessagesBelow > 99 ? '99+' : newMessagesBelow}
                                        </Typo>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </Animated.View>
                    )}

                    {/* ── Input Bar ── */}
                    <View style={styles.inputBar}>
                        {replyTo && <ReplyPreviewBar replyTo={replyTo} onCancel={handleCancelReply} />}
                        {selectedFile && (
                            <FilePreviewBar
                                file={selectedFile}
                                isViewOnce={isViewOnce}
                                onToggleViewOnce={() => setIsViewOnce(prev => !prev)}
                                onRemove={() => { setSelectedFile(null); setIsViewOnce(false); }}
                            />
                        )}
                        {showAttachOptions && (
                            <AttachmentOptions
                                onPickImage={onPickImage}
                                onPickFile={onPickFile}
                                onCreatePoll={() => { setShowAttachOptions(false); setShowPollModal(true); }}
                                onClose={() => setShowAttachOptions(false)}
                            />
                        )}

                        <View style={styles.inputRow}>
                            {isRecording ? (
                                <View style={styles.recordingRow}>
                                    <TouchableOpacity style={styles.trashRecordBtn} onPress={cancelRecording} activeOpacity={0.7}>
                                        <Icons.Trash size={verticalScale(18)} color={colors.white} weight="fill" />
                                    </TouchableOpacity>
                                    <RecordingIndicator duration={recordingDuration} />
                                    <TouchableOpacity style={styles.sendBtn} onPress={() => stopRecording(false)} activeOpacity={0.8}>
                                        <Icons.PaperPlaneTilt color={colors.black} weight="fill" size={verticalScale(18)} />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <>
                                    <TouchableOpacity
                                        style={[styles.actionBtn, showAttachOptions && { backgroundColor: colors.primaryLight }]}
                                        onPress={() => setShowAttachOptions(prev => !prev)}
                                        activeOpacity={0.75}
                                    >
                                        <Icons.Paperclip color={showAttachOptions ? colors.primaryDark : colors.neutral600} weight="bold" size={verticalScale(20)} />
                                    </TouchableOpacity>

                                    <Input
                                        value={message}
                                        onChangeText={handleMessageChange}
                                        containerStyle={styles.textInput}
                                        placeholder={replyTo ? "Reply..." : "Message..."}
                                    />

                                    {canSend ? (
                                        <TouchableOpacity style={styles.sendBtn} onPress={onSend} activeOpacity={0.8}>
                                            {loading || isUploadingVoice ? (
                                                <Loading size="small" color={colors.black} />
                                            ) : (
                                                <Icons.PaperPlaneTilt color={colors.black} weight="fill" size={verticalScale(18)} />
                                            )}
                                        </TouchableOpacity>
                                    ) : (
                                        <Animated.View style={micAnimStyle}>
                                            <TouchableOpacity style={styles.micBtn} onPressIn={startRecording} activeOpacity={0.8}>
                                                {isUploadingVoice ? (
                                                    <Loading size="small" color={colors.black} />
                                                ) : (
                                                    <Icons.Microphone color={colors.black} weight="fill" size={verticalScale(20)} />
                                                )}
                                            </TouchableOpacity>
                                        </Animated.View>
                                    )}
                                </>
                            )}
                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>

            {/* ── Poll Creator Modal ── */}
            <Modal visible={showPollModal} transparent animationType="slide" onRequestClose={() => setShowPollModal(false)}>
                <TouchableWithoutFeedback onPress={() => setShowPollModal(false)}>
                    <View style={pollModalStyles.overlay}>
                        <TouchableWithoutFeedback>
                            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={pollModalStyles.sheet}>
                                <View style={pollModalStyles.handle} />

                                <View style={pollModalStyles.header}>
                                    <Typo size={17} fontWeight="700" color={colors.neutral800}>Create Poll</Typo>
                                    <TouchableOpacity onPress={() => setShowPollModal(false)} style={pollModalStyles.closeBtn}>
                                        <Icons.X size={18} color={colors.neutral600} weight="bold" />
                                    </TouchableOpacity>
                                </View>

                                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={pollModalStyles.scrollContent}>
                                    {/* ── Question ── */}
                                    <Typo size={13} fontWeight="600" color={colors.neutral600} style={{ marginBottom: spacingY._7 }}>Question</Typo>
                                    <TextInput
                                        style={pollModalStyles.questionInput}
                                        placeholder="Ask a question..."
                                        placeholderTextColor={colors.neutral400}
                                        value={pollQuestion}
                                        onChangeText={setPollQuestion}
                                        maxLength={200}
                                        multiline
                                    />

                                    {/* ── Options ── */}
                                    <Typo size={13} fontWeight="600" color={colors.neutral600} style={{ marginBottom: spacingY._7, marginTop: spacingY._15 }}>Options</Typo>
                                    {pollOptions.map((option, index) => (
                                        <View key={index} style={pollModalStyles.optionRow}>
                                            <View style={pollModalStyles.optionNumber}>
                                                <Typo size={12} fontWeight="700" color={colors.neutral500}>{index + 1}</Typo>
                                            </View>
                                            <TextInput
                                                style={pollModalStyles.optionInput}
                                                placeholder={`Option ${index + 1}`}
                                                placeholderTextColor={colors.neutral400}
                                                value={option}
                                                onChangeText={(text) => {
                                                    const updated = [...pollOptions];
                                                    updated[index] = text;
                                                    setPollOptions(updated);
                                                }}
                                                maxLength={100}
                                            />
                                            {pollOptions.length > 2 && (
                                                <TouchableOpacity onPress={() => setPollOptions(pollOptions.filter((_, i) => i !== index))} style={pollModalStyles.removeOption}>
                                                    <Icons.X size={14} color={colors.rose} weight="bold" />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    ))}

                                    {/* ── Add option ── */}
                                    {pollOptions.length < 10 && (
                                        <TouchableOpacity style={pollModalStyles.addOptionBtn} onPress={() => setPollOptions([...pollOptions, ''])} activeOpacity={0.7}>
                                            <Icons.Plus size={16} color={colors.primary} weight="bold" />
                                            <Typo size={13} fontWeight="600" color={colors.primaryDark}>Add Option</Typo>
                                        </TouchableOpacity>
                                    )}

                                    {/* ── Multiple choice toggle ── */}
                                    <TouchableOpacity style={pollModalStyles.toggleRow} onPress={() => setPollAllowMultiple(prev => !prev)} activeOpacity={0.7}>
                                        <View style={pollModalStyles.toggleInfo}>
                                            <Typo size={14} fontWeight="600" color={colors.neutral800}>Multiple Choice</Typo>
                                            <Typo size={12} color={colors.neutral500}>Allow voting for multiple options</Typo>
                                        </View>
                                        <View style={[pollModalStyles.toggle, pollAllowMultiple && pollModalStyles.toggleActive]}>
                                            <View style={[pollModalStyles.toggleDot, pollAllowMultiple && pollModalStyles.toggleDotActive]} />
                                        </View>
                                    </TouchableOpacity>

                                    {/* ── Create button ── */}
                                    <TouchableOpacity style={pollModalStyles.createBtn} onPress={handleCreatePoll} activeOpacity={0.8}>
                                        <Icons.ChartBar size={18} color={colors.black} weight="fill" />
                                        <Typo size={15} fontWeight="700" color={colors.black}>Create Poll</Typo>
                                    </TouchableOpacity>
                                </ScrollView>
                            </KeyboardAvoidingView>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {/* ── Forward Modal ── */}
            <ForwardModal
                visible={forwardModalVisible}
                conversations={recentConversations}
                currentUserId={currentUser?.id || ''}
                onSelect={handleSendForward}
                onClose={() => { setForwardModalVisible(false); setForwardingMessage(null); }}
            />

            {/* ── Group Info Modal ── */}
            <GroupInfoModal
                visible={groupInfoVisible}
                conversationName={conversationName}
                conversationAvatar={conversationAvatar as string}
                participants={participants}
                admins={[]}
                createdBy={undefined}
                currentUserId={currentUser?.id || ''}
                mediaItems={mediaMessages}
                onPromote={handlePromoteAdmin}
                onDemote={handleDemoteAdmin}
                onClose={() => setGroupInfoVisible(false)}
            />

            {/* ── Chat Wallpaper & Theme Modal ── */}
            <ChatThemeModal
                visible={showThemeModal}
                currentThemeId={selectedTheme.id}
                onSelectTheme={handleSelectTheme}
                onClose={() => setShowThemeModal(false)}
            />
        </ScreenWrapper>
    );
};

export default Conversation;

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacingX._15, paddingTop: spacingY._10, paddingBottom: spacingY._15 },
    headerLeft: { flexDirection: "row", alignItems: "center", gap: spacingX._10, flex: 1 },
    headerInfo: { flexDirection: "row", alignItems: "center", gap: spacingX._10, flex: 1 },
    avatarWrap: { position: "relative" },
    onlineDot: { position: "absolute", bottom: 1, right: 1, width: verticalScale(10), height: verticalScale(10), borderRadius: radius.full, backgroundColor: colors.green, borderWidth: 1.5, borderColor: colors.white },
    headerText: { flex: 1, gap: 2 },
    headerTypingRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    headerTypingDots: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacingX._5 },
    callBtn: { width: verticalScale(36), height: verticalScale(36), borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.15)' },
    moreBtn: { padding: spacingY._7 },
    content: { flex: 1, backgroundColor: colors.white, borderTopRightRadius: radius._50, borderTopLeftRadius: radius._50, borderCurve: "continuous", overflow: "hidden" },
    messagesContent: { paddingHorizontal: spacingX._15, paddingTop: spacingY._20, paddingBottom: spacingY._10, gap: spacingY._12, flexGrow: 1 },
    emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacingY._12, paddingTop: verticalScale(100), paddingHorizontal: spacingX._30 },
    emptyIconWrap: { backgroundColor: colors.neutral100, padding: spacingY._20, borderRadius: radius._30, marginBottom: spacingY._5 },
    inputBar: { paddingHorizontal: spacingX._15, paddingTop: spacingY._10, paddingBottom: verticalScale(24), borderTopWidth: 1, borderTopColor: colors.neutral100, gap: spacingY._7 },
    inputRow: { flexDirection: "row", alignItems: "center", gap: spacingX._10 },
    actionBtn: { width: verticalScale(42), height: verticalScale(42), borderRadius: radius.full, backgroundColor: colors.neutral100, alignItems: "center", justifyContent: "center" },
    textInput: { flex: 1, height: verticalScale(46), borderRadius: radius.full, paddingHorizontal: spacingX._15, backgroundColor: colors.neutral50, borderColor: colors.neutral200 },
    sendBtn: { width: verticalScale(46), height: verticalScale(46), borderRadius: radius.full, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", shadowColor: colors.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 4 },
    micBtn: { width: verticalScale(46), height: verticalScale(46), borderRadius: radius.full, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", shadowColor: colors.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 4 },
    cancelRecordBtn: { width: verticalScale(42), height: verticalScale(42), borderRadius: radius.full, backgroundColor: colors.neutral100, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: colors.rose },
    networkBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacingX._7,
        backgroundColor: '#fff1f2',
        paddingVertical: spacingY._5,
        borderBottomWidth: 1,
        borderBottomColor: '#fecdd3',
    },
    recordingRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacingX._10,
    },
    trashRecordBtn: {
        width: verticalScale(40),
        height: verticalScale(40),
        borderRadius: radius.full,
        backgroundColor: colors.rose,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.rose,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    scrollToBottomWrap: {
        position: 'absolute',
        bottom: verticalScale(85),
        right: spacingX._15,
        zIndex: 50,
    },
    scrollToBottomBtn: {
        width: verticalScale(40),
        height: verticalScale(40),
        borderRadius: radius.full,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.18,
        shadowRadius: 6,
        elevation: 5,
        borderWidth: 1,
        borderColor: colors.neutral100,
    },
    newMsgBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: colors.primary,
        borderRadius: radius.full,
        minWidth: scale(18),
        height: scale(18),
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
        borderWidth: 1.5,
        borderColor: colors.white,
    },
});

const pollModalStyles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: colors.white, borderTopLeftRadius: radius._30, borderTopRightRadius: radius._30, paddingBottom: verticalScale(34), maxHeight: '90%' },
    handle: { width: scale(36), height: verticalScale(4), borderRadius: radius.full, backgroundColor: colors.neutral300, alignSelf: 'center', marginTop: verticalScale(10), marginBottom: verticalScale(4) },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacingX._20, paddingVertical: spacingY._15, borderBottomWidth: 1, borderBottomColor: colors.neutral100 },
    closeBtn: { width: verticalScale(32), height: verticalScale(32), borderRadius: radius.full, backgroundColor: colors.neutral100, alignItems: 'center', justifyContent: 'center' },
    scrollContent: { padding: spacingX._20, paddingBottom: verticalScale(20) },
    questionInput: { backgroundColor: colors.neutral50, borderRadius: radius._12, borderWidth: 1, borderColor: colors.neutral200, paddingHorizontal: spacingX._15, paddingVertical: spacingY._12, fontSize: verticalScale(15), color: colors.neutral800, minHeight: verticalScale(60), textAlignVertical: 'top' },
    optionRow: { flexDirection: 'row', alignItems: 'center', gap: spacingX._10, marginBottom: spacingY._10 },
    optionNumber: { width: verticalScale(28), height: verticalScale(28), borderRadius: radius.full, backgroundColor: colors.neutral100, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    optionInput: { flex: 1, backgroundColor: colors.neutral50, borderRadius: radius._10, borderWidth: 1, borderColor: colors.neutral200, paddingHorizontal: spacingX._15, paddingVertical: spacingY._12, fontSize: verticalScale(14), color: colors.neutral800 },
    removeOption: { width: verticalScale(28), height: verticalScale(28), borderRadius: radius.full, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    addOptionBtn: { flexDirection: 'row', alignItems: 'center', gap: spacingX._7, paddingVertical: spacingY._12, paddingHorizontal: spacingX._15, backgroundColor: colors.primaryLight, borderRadius: radius._10, borderWidth: 1, borderColor: colors.primary, marginBottom: spacingY._15 },
    toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacingY._15, borderTopWidth: 1, borderTopColor: colors.neutral100, marginBottom: spacingY._20 },
    toggleInfo: { gap: 2 },
    toggle: { width: scale(46), height: scale(26), borderRadius: radius.full, backgroundColor: colors.neutral300, padding: 3, justifyContent: 'center' },
    toggleActive: { backgroundColor: colors.primary },
    toggleDot: { width: scale(20), height: scale(20), borderRadius: radius.full, backgroundColor: colors.white },
    toggleDotActive: { alignSelf: 'flex-end' },
    createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacingX._10, backgroundColor: colors.primary, borderRadius: radius.full, paddingVertical: spacingY._15, shadowColor: colors.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 4 },
});