import {
    FlatList, KeyboardAvoidingView, Platform,
    StyleSheet, TouchableOpacity, View,
    ActivityIndicator, Modal, TouchableWithoutFeedback,
    TextInput, ScrollView, BackHandler, Share, useWindowDimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BubblyAlert } from "../../components/BubblyAlert"
import * as Clipboard from 'expo-clipboard'
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
    setGroupAdmin, removeGroupMember, leaveGroup, getConversations, onGroupUpdated, onRemovedFromGroup,
    setDisappearingTimer, scheduleMessage, getScheduledMessages, cancelScheduledMessage, onScheduledMessageSent,
    onMessageAck,
    onChecklistUpdated,
    isSocketConnected, onSocketConnectionChange,
} from "../../socket/socketEvents"
import { connectSocket } from "../../socket/socket"
import {
    MessageProps, ReplyToProps, ResponseProps,
    TypingPayload, UserStatusPayload, SelectedFileProps, ChecklistProps,
} from "../../types"
import { ComposerFormatBar, EmptyChatStarters, QuickReplyBar } from "../../components/RichChatFeatures"
import {
    ChatInsightsModal,
    ChatScratchpadModal,
    ChecklistCreatorModal,
    CountdownCreatorModal,
    DoodlePadModal,
    EventCreatorModal,
    FancyTextModal,
    GamePickerModal,
    QuickRepliesManagerModal,
    rollBubblyGame,
    SplitBillModal,
    WouldYouRatherModal,
} from "../../components/ConversationFeatureModals"
import { GifPickerModal, GifSelection } from "../../components/GifPickerModal"
import {
    ACCENT_SWATCHES,
    BubblyCountdownPayload,
    BubblyDoodlePayload,
    BubblyEventPayload,
    BubblyGameKind,
    BubblyGamePayload,
    BubblySplitPayload,
    BubblyWyrPayload,
    ChatAppearanceConfig,
    DEFAULT_APPEARANCE,
    encodeChecklistFallback,
    encodeCountdownCard,
    encodeDoodleCard,
    encodeEventCard,
    encodeGameCard,
    encodeSplitCard,
    encodeWyrCard,
    formatRichPreviewText,
    getChatAppearance,
    getFocusMode,
    getLocalSilentIds,
    getNicknamesMap,
    getPrivacyShield,
    getQuickReplies,
    markLocalSilentMessage,
    parseBubblyCard,
    QuickReplyTemplate,
    recordMessageSentActivity,
    saveQuickReplies,
    subscribeFeatureUpdates,
} from "../../utils/featureStorage"
import { hapticTap } from "../../utils/haptics"
import {
    formatSeparatorDateLabel,
    getCachedMessages,
    getLocalDateKey,
    getMemoryMessages,
    setCachedMessages,
} from "../../utils/chatCache"
import Animated, {
    FadeInDown, FadeInUp, FadeIn, FadeOut, FadeOutDown,
    useSharedValue, useAnimatedStyle,
    withRepeat, withTiming, withDelay, withSpring
} from 'react-native-reanimated'
import moment from 'moment'
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio'
import { setActiveConversationId, getActiveConversationId } from "../../services/notificationService"

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
const getDateLabel = (dateStr: string): string => formatSeparatorDateLabel(dateStr)

// ── Date Separator ──
const DateSeparator = React.memo(({ date }: { date: string }) => (
    <View style={separatorStyles.wrapper}>
        <View style={separatorStyles.line} />
        <View style={separatorStyles.pill}>
            <Typo size={11} fontWeight="600" color={colors.neutral500}>{getDateLabel(date)}</Typo>
        </View>
        <View style={separatorStyles.line} />
    </View>
));

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
                {replyTo.voiceUrl ? "🎤 Voice message" : replyTo.type === "file" ? "📎 File" : formatRichPreviewText(replyTo.content) || "📷 Image"}
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
    onPickCustomWallpaper,
    onClose,
}: {
    visible: boolean;
    currentThemeId: string;
    onSelectTheme: (theme: ChatTheme) => void;
    onPickCustomWallpaper?: () => void;
    onClose: () => void;
}) => {
    const insets = useSafeAreaInsets();
    return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
        <TouchableWithoutFeedback onPress={onClose}>
            <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={themeModalStyles.overlay}>
                <TouchableWithoutFeedback>
                    <Animated.View
                        entering={FadeInUp.duration(250).springify()}
                        exiting={FadeOutDown.duration(150)}
                        style={[themeModalStyles.sheet, { paddingBottom: Math.max(insets.bottom, spacingY._20) + spacingY._8 }]}
                    >
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

                        {onPickCustomWallpaper && (
                            <TouchableOpacity
                                style={themeModalStyles.customWallBtn}
                                onPress={onPickCustomWallpaper}
                                activeOpacity={0.8}
                            >
                                <Icons.Image size={18} color={colors.primaryDark} weight="fill" />
                                <Typo size={13.5} fontWeight="700" color={colors.neutral800}>
                                    Choose Photo from Gallery
                                </Typo>
                            </TouchableOpacity>
                        )}
                    </Animated.View>
                </TouchableWithoutFeedback>
            </Animated.View>
        </TouchableWithoutFeedback>
    </Modal>
    );
};

// ── Disappearing Messages Modal ──
const DISAPPEARING_OPTIONS = [
    { label: "Off", seconds: 0, desc: "Messages will not disappear" },
    { label: "24 Hours", seconds: 86400, desc: "New messages disappear after 24 hours" },
    { label: "7 Days", seconds: 604800, desc: "New messages disappear after 7 days" },
    { label: "90 Days", seconds: 7776000, desc: "New messages disappear after 90 days" },
];

const DisappearingModal = ({
    visible,
    currentSeconds,
    onSelect,
    onClose,
}: {
    visible: boolean;
    currentSeconds: number;
    onSelect: (sec: number) => void;
    onClose: () => void;
}) => {
    const insets = useSafeAreaInsets();
    return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
        <TouchableWithoutFeedback onPress={onClose}>
            <View style={disappearingStyles.overlay}>
                <TouchableWithoutFeedback>
                    <Animated.View
                        entering={FadeInUp.duration(260).springify()}
                        style={[disappearingStyles.sheet, { paddingBottom: Math.max(insets.bottom, spacingY._20) + spacingY._8 }]}
                    >
                        <View style={disappearingStyles.handle} />
                        <View style={disappearingStyles.header}>
                            <Icons.Timer size={22} color={colors.primaryDark} weight="fill" />
                            <Typo size={17} fontWeight="800" color={colors.neutral900}>
                                Disappearing Messages
                            </Typo>
                        </View>
                        <Typo size={12.5} color={colors.neutral500} style={{ marginBottom: verticalScale(14) }}>
                            For enhanced privacy, new messages will disappear automatically from this chat.
                        </Typo>

                        {DISAPPEARING_OPTIONS.map((opt) => {
                            const isSelected = currentSeconds === opt.seconds;
                            return (
                                <TouchableOpacity
                                    key={opt.seconds}
                                    style={[disappearingStyles.row, isSelected && disappearingStyles.rowSelected]}
                                    onPress={() => onSelect(opt.seconds)}
                                    activeOpacity={0.7}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Typo size={14.5} fontWeight={isSelected ? "700" : "500"} color={colors.neutral900}>
                                            {opt.label}
                                        </Typo>
                                        <Typo size={11.5} color={colors.neutral400} style={{ marginTop: 2 }}>
                                            {opt.desc}
                                        </Typo>
                                    </View>
                                    <View style={[disappearingStyles.radio, isSelected && disappearingStyles.radioActive]}>
                                        {isSelected && <View style={disappearingStyles.radioInner} />}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </Animated.View>
                </TouchableWithoutFeedback>
            </View>
        </TouchableWithoutFeedback>
    </Modal>
    );
};

// ── Group Mention Autocomplete Bar ──
const GroupMentionBar = ({
    candidates,
    onSelect,
}: {
    candidates: any[];
    onSelect: (candidate: any) => void;
}) => {
    if (!candidates || candidates.length === 0) return null;

    return (
        <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(140)} style={mentionStyles.container}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={mentionStyles.scroll}>
                {candidates.map((member) => (
                    <TouchableOpacity
                        key={member._id || member.id}
                        style={mentionStyles.pill}
                        onPress={() => onSelect(member)}
                        activeOpacity={0.75}
                    >
                        <Avatar uri={member.avatar} size={22} />
                        <Typo size={12} fontWeight="600" color={colors.neutral800}>
                            @{member.name}
                        </Typo>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </Animated.View>
    );
};

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
    customWallBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale(8),
        backgroundColor: colors.neutral100,
        borderRadius: radius.full,
        paddingVertical: verticalScale(11),
        borderWidth: 1,
        borderColor: colors.neutral200,
        marginTop: verticalScale(6),
    },
});

const disappearingStyles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: colors.white, borderTopLeftRadius: radius._30, borderTopRightRadius: radius._30, paddingHorizontal: spacingX._20, paddingTop: verticalScale(14), paddingBottom: verticalScale(34) },
    handle: { width: scale(36), height: verticalScale(4), borderRadius: radius.full, backgroundColor: colors.neutral300, alignSelf: 'center', marginBottom: verticalScale(12) },
    header: { flexDirection: 'row', alignItems: 'center', gap: scale(8), marginBottom: verticalScale(4) },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: verticalScale(12), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.neutral100 },
    rowSelected: { backgroundColor: colors.primaryLight + "30", borderRadius: radius._10, paddingHorizontal: spacingX._8 },
    radio: { width: scale(20), height: scale(20), borderRadius: radius.full, borderWidth: 2, borderColor: colors.neutral300, alignItems: 'center', justifyContent: 'center' },
    radioActive: { borderColor: colors.primary, backgroundColor: colors.primary },
    radioInner: { width: scale(8), height: scale(8), borderRadius: radius.full, backgroundColor: colors.white },
});

const mentionStyles = StyleSheet.create({
    container: { backgroundColor: colors.white, paddingVertical: verticalScale(6), paddingHorizontal: spacingX._12, borderTopWidth: 1, borderTopColor: colors.neutral200 },
    scroll: { gap: scale(8) },
    pill: { flexDirection: 'row', alignItems: 'center', gap: scale(6), backgroundColor: colors.neutral100, borderRadius: radius.full, paddingHorizontal: scale(8), paddingVertical: verticalScale(4), borderWidth: 1, borderColor: colors.neutral200 },
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
    isHd,
    onToggleHd,
    onRemove,
}: {
    file: SelectedFileProps;
    isViewOnce?: boolean;
    onToggleViewOnce?: () => void;
    isHd?: boolean;
    onToggleHd?: () => void;
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
        {file.isImage && onToggleHd && (
            <TouchableOpacity
                onPress={onToggleHd}
                activeOpacity={0.7}
                style={[filePreviewStyles.hdBtn, isHd && filePreviewStyles.hdActive]}
            >
                <Typo size={11} fontWeight="800" color={isHd ? colors.primaryDark : colors.neutral400}>HD</Typo>
            </TouchableOpacity>
        )}
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
    hdBtn: {
        paddingHorizontal: scale(7),
        height: verticalScale(28),
        borderRadius: radius._6,
        backgroundColor: colors.neutral100,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1.5,
        borderColor: colors.neutral300,
    },
    hdActive: {
        backgroundColor: colors.primaryLight,
        borderColor: colors.primaryDark,
    },
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
    const [pinIdx, setPinIdx] = useState(0);
    if (!pinnedMessages || pinnedMessages.length === 0) return null;
    const safeIdx = pinIdx % pinnedMessages.length;
    const current = pinnedMessages[safeIdx];

    return (
        <Animated.View entering={FadeInDown.duration(200)} exiting={FadeOut.duration(150)} style={pinnedBannerStyles.container}>
            <TouchableOpacity onPress={() => { hapticTap("light"); onPress(current.id); }} activeOpacity={0.8} style={pinnedBannerStyles.mainClick}>
                <View style={pinnedBannerStyles.iconWrap}>
                    <Icons.PushPin size={verticalScale(13)} color={colors.primaryDark} weight="fill" />
                </View>
                <View style={pinnedBannerStyles.textWrap}>
                    <Typo size={11} fontWeight="700" color={colors.neutral800}>
                        Pinned Message {pinnedMessages.length > 1 ? `(${safeIdx + 1} of ${pinnedMessages.length})` : ''}
                    </Typo>
                    <Typo size={12} color={colors.neutral600} textProps={{ numberOfLines: 1 }}>
                        {formatRichPreviewText(current.content) || (current.type === "image" ? "📷 Photo" : "📎 Attachment")}
                    </Typo>
                </View>
            </TouchableOpacity>
            {pinnedMessages.length > 1 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                    <TouchableOpacity
                        onPress={() => {
                            hapticTap("light");
                            setPinIdx((p) => (p - 1 + pinnedMessages.length) % pinnedMessages.length);
                        }}
                        activeOpacity={0.7}
                        style={pinnedBannerStyles.closeBtn}
                    >
                        <Icons.CaretLeft size={verticalScale(14)} color={colors.primaryDark} weight="bold" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => {
                            hapticTap("light");
                            setPinIdx((p) => (p + 1) % pinnedMessages.length);
                        }}
                        activeOpacity={0.7}
                        style={pinnedBannerStyles.closeBtn}
                    >
                        <Icons.CaretRight size={verticalScale(14)} color={colors.primaryDark} weight="bold" />
                    </TouchableOpacity>
                </View>
            )}
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

// ── In-Chat Search Bar (Feature 4 + Smart Type Filter Chips) ──
type SearchFilterKind = "all" | "media" | "links" | "voice" | "cards";

const ChatSearchBar = ({
    query,
    onChangeQuery,
    filterKind,
    onChangeFilterKind,
    matchCount,
    currentIndex,
    onPrev,
    onNext,
    onClose,
}: {
    query: string;
    onChangeQuery: (text: string) => void;
    filterKind: SearchFilterKind;
    onChangeFilterKind: (kind: SearchFilterKind) => void;
    matchCount: number;
    currentIndex: number;
    onPrev: () => void;
    onNext: () => void;
    onClose: () => void;
}) => (
    <Animated.View entering={FadeInDown.duration(200)} exiting={FadeOut.duration(150)} style={searchBarStyles.wrapper}>
        <View style={searchBarStyles.container}>
            <Icons.MagnifyingGlass size={verticalScale(16)} color={colors.neutral500} />
            <TextInput
                value={query}
                onChangeText={onChangeQuery}
                placeholder="Search text or filter by type..."
                placeholderTextColor={colors.neutral400}
                style={searchBarStyles.input}
                autoFocus
            />
            {(query.trim().length > 0 || filterKind !== "all") && (
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
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={searchBarStyles.chipScroll}>
            {([
                { key: "all" as const, label: "All" },
                { key: "media" as const, label: "🖼️ Media" },
                { key: "links" as const, label: "🔗 Links" },
                { key: "voice" as const, label: "🎤 Voice" },
                { key: "cards" as const, label: "✨ Cards & Polls" },
            ]).map((chip) => {
                const active = filterKind === chip.key;
                return (
                    <TouchableOpacity
                        key={chip.key}
                        onPress={() => { hapticTap("light"); onChangeFilterKind(chip.key); }}
                        activeOpacity={0.75}
                        style={[searchBarStyles.filterChip, active && searchBarStyles.filterChipActive]}
                    >
                        <Typo size={11} fontWeight={active ? "800" : "600"} color={active ? colors.primaryDark : colors.neutral600}>
                            {chip.label}
                        </Typo>
                    </TouchableOpacity>
                );
            })}
        </ScrollView>
    </Animated.View>
);

const searchBarStyles = StyleSheet.create({
    wrapper: {
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral200,
    },
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacingX._15,
        paddingTop: spacingY._8,
        paddingBottom: spacingY._6,
        gap: spacingX._10,
    },
    chipScroll: {
        paddingHorizontal: spacingX._15,
        paddingBottom: spacingY._8,
        gap: scale(6),
    },
    filterChip: {
        paddingHorizontal: scale(10),
        paddingVertical: verticalScale(4),
        borderRadius: radius.full,
        backgroundColor: colors.neutral100,
        borderWidth: 1,
        borderColor: colors.neutral200,
    },
    filterChipActive: {
        backgroundColor: colors.primaryLight,
        borderColor: colors.primary,
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

// ── Forward Modal (Feature 6: Multi-Select Broadcast Forwarding) ──
const ForwardModal = ({
    visible,
    conversations,
    currentUserId,
    onSelectMultiple,
    onClose,
}: {
    visible: boolean;
    conversations: any[];
    currentUserId: string;
    onSelectMultiple: (targetIds: string[]) => void;
    onClose: () => void;
}) => {
    const insets = useSafeAreaInsets();
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    useEffect(() => {
        if (!visible) setSelectedIds([]);
    }, [visible]);

    const toggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={forwardStyles.overlay}>
                    <TouchableWithoutFeedback>
                        <View style={[forwardStyles.sheet, { paddingBottom: Math.max(insets.bottom, spacingY._20) + spacingY._8 }]}>
                            <View style={forwardStyles.handle} />
                            <View style={forwardStyles.header}>
                                <Typo size={17} fontWeight="700" color={colors.neutral900}>
                                    Forward to {selectedIds.length > 0 ? `(${selectedIds.length})` : "..."}
                                </Typo>
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
                                    const isSelected = selectedIds.includes(item._id);
                                    return (
                                        <TouchableOpacity
                                            onPress={() => toggleSelect(item._id)}
                                            activeOpacity={0.7}
                                            style={[forwardStyles.itemRow, isSelected && forwardStyles.itemRowSelected]}
                                        >
                                            <Avatar size={42} uri={item.avatar} isGroup={item.type === 'group'} />
                                            <View style={forwardStyles.itemInfo}>
                                                <Typo size={15} fontWeight="600" color={colors.neutral900}>{displayName}</Typo>
                                                <Typo size={12} color={colors.neutral400}>
                                                    {item.type === 'group' ? `${item.participants?.length || 0} members` : "Direct chat"}
                                                </Typo>
                                            </View>
                                            <View style={[forwardStyles.checkbox, isSelected && forwardStyles.checkboxSelected]}>
                                                {isSelected && (
                                                    <Icons.Check size={12} color={colors.white} weight="bold" />
                                                )}
                                            </View>
                                        </TouchableOpacity>
                                    );
                                }}
                            />
                            {selectedIds.length > 0 && (
                                <View style={forwardStyles.footer}>
                                    <TouchableOpacity
                                        style={forwardStyles.confirmBtn}
                                        onPress={() => onSelectMultiple(selectedIds)}
                                        activeOpacity={0.8}
                                    >
                                        <Icons.PaperPlaneTilt size={18} color={colors.black} weight="fill" />
                                        <Typo size={15} fontWeight="700" color={colors.black}>
                                            Forward to {selectedIds.length} {selectedIds.length === 1 ? "Chat" : "Chats"}
                                        </Typo>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

// ── Schedule Message Modal (Feature 3) ──
const ScheduleModal = ({
    visible,
    onSchedule,
    onClose,
}: {
    visible: boolean;
    onSchedule: (delayMs: number, label: string) => void;
    onClose: () => void;
}) => {
    const insets = useSafeAreaInsets();
    const SCHEDULE_PRESETS = [
        { label: "In 15 minutes", delay: 15 * 60 * 1000, desc: "Quick follow-up" },
        { label: "In 1 hour", delay: 60 * 60 * 1000, desc: "Later today" },
        { label: "In 3 hours", delay: 3 * 3600 * 1000, desc: "This evening" },
        {
            label: "Tomorrow at 9:00 AM",
            delay: (() => {
                const now = new Date();
                const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0, 0);
                return Math.max(tomorrow.getTime() - now.getTime(), 60000);
            })(),
            desc: "Next morning"
        },
    ];

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={scheduleStyles.overlay}>
                    <TouchableWithoutFeedback>
                        <Animated.View
                            entering={FadeInUp.duration(260).springify()}
                            style={[scheduleStyles.sheet, { paddingBottom: Math.max(insets.bottom, spacingY._20) + spacingY._8 }]}
                        >
                            <View style={scheduleStyles.handle} />
                            <View style={scheduleStyles.header}>
                                <Icons.ClockCountdown size={22} color={colors.primaryDark} weight="fill" />
                                <Typo size={17} fontWeight="800" color={colors.neutral900}>
                                    Schedule Message
                                </Typo>
                            </View>
                            <Typo size={12.5} color={colors.neutral500} style={{ marginBottom: verticalScale(14) }}>
                                Pick when to automatically dispatch this message:
                            </Typo>

                            {SCHEDULE_PRESETS.map((preset) => (
                                <TouchableOpacity
                                    key={preset.label}
                                    style={scheduleStyles.presetRow}
                                    onPress={() => onSchedule(preset.delay, preset.label)}
                                    activeOpacity={0.7}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Typo size={14.5} fontWeight="700" color={colors.neutral900}>{preset.label}</Typo>
                                        <Typo size={11.5} color={colors.neutral400} style={{ marginTop: 2 }}>{preset.desc}</Typo>
                                    </View>
                                    <Icons.CaretRight size={16} color={colors.neutral400} />
                                </TouchableOpacity>
                            ))}
                        </Animated.View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const scheduleStyles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: colors.white, borderTopLeftRadius: radius._30, borderTopRightRadius: radius._30, paddingHorizontal: spacingX._20, paddingTop: verticalScale(14), paddingBottom: verticalScale(34) },
    handle: { width: scale(36), height: verticalScale(4), borderRadius: radius.full, backgroundColor: colors.neutral300, alignSelf: 'center', marginBottom: verticalScale(12) },
    header: { flexDirection: 'row', alignItems: 'center', gap: scale(8), marginBottom: verticalScale(4) },
    presetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: verticalScale(12), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.neutral100 },
});

const forwardStyles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: colors.white, borderTopLeftRadius: radius._30, borderTopRightRadius: radius._30, paddingBottom: verticalScale(34), maxHeight: '80%' },
    handle: { width: scale(36), height: verticalScale(4), borderRadius: radius.full, backgroundColor: colors.neutral300, alignSelf: 'center', marginTop: verticalScale(10), marginBottom: verticalScale(4) },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacingX._20, paddingVertical: spacingY._15, borderBottomWidth: 1, borderBottomColor: colors.neutral100 },
    closeBtn: { width: verticalScale(30), height: verticalScale(30), borderRadius: radius.full, backgroundColor: colors.neutral100, alignItems: 'center', justifyContent: 'center' },
    list: { padding: spacingX._15, gap: spacingY._10 },
    itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacingX._12, paddingVertical: spacingY._8 },
    itemRowSelected: { backgroundColor: colors.primaryLight + "30", borderRadius: radius._12, paddingHorizontal: spacingX._8 },
    itemInfo: { flex: 1, gap: 2 },
    checkbox: { width: scale(22), height: scale(22), borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.neutral300, alignItems: "center", justifyContent: "center" },
    checkboxSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    footer: { paddingHorizontal: spacingX._20, paddingTop: spacingY._10, borderTopWidth: 1, borderTopColor: colors.neutral100 },
    confirmBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: scale(8), backgroundColor: colors.primary, borderRadius: radius.full, paddingVertical: verticalScale(12) },
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
    onRemoveMember,
    onLeaveGroup,
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
    onRemoveMember?: (userId: string) => void;
    onLeaveGroup?: () => void;
    onClose: () => void;
}) => {
    const isAdmin = admins?.some((a: any) => (a._id || a).toString() === currentUserId) || createdBy?.toString() === currentUserId;
    const [infoTab, setInfoTab] = useState<'members' | 'media'>('members');
    const insets = useSafeAreaInsets();
    const { width: screenWidth } = useWindowDimensions();
    const mediaThumbSize = Math.floor((Math.min(screenWidth, 600) - spacingX._20 * 2 - scale(8) * 2) / 3);

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={groupInfoStyles.overlay}>
                    <TouchableWithoutFeedback>
                        <View style={[groupInfoStyles.sheet, { paddingBottom: Math.max(insets.bottom, spacingY._20) + spacingY._8 }]}>
                            <View style={groupInfoStyles.handle} />
                            <View style={groupInfoStyles.header}>
                                <Avatar size={50} uri={conversationAvatar} isGroup={true} />
                                <Typo size={18} fontWeight="700" color={colors.neutral900} textProps={{ numberOfLines: 1 }} style={{ maxWidth: '88%' }}>{conversationName || "Group"}</Typo>
                                <Typo size={13} color={colors.neutral500}>{participants.length} members</Typo>
                            </View>

                            {/* ── Segmented Tabs ── */}
                            <View style={groupInfoStyles.tabRow}>
                                <TouchableOpacity
                                    onPress={() => setInfoTab('members')}
                                    style={[groupInfoStyles.tabBtn, infoTab === 'members' && groupInfoStyles.tabBtnActive]}
                                    activeOpacity={0.7}
                                >
                                    <Typo size={13} fontWeight={infoTab === 'members' ? "700" : "500"} color={infoTab === 'members' ? colors.neutral900 : colors.neutral400} textProps={{ numberOfLines: 1 }}>
                                        Members ({participants.length})
                                    </Typo>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => setInfoTab('media')}
                                    style={[groupInfoStyles.tabBtn, infoTab === 'media' && groupInfoStyles.tabBtnActive]}
                                    activeOpacity={0.7}
                                >
                                    <Typo size={13} fontWeight={infoTab === 'media' ? "700" : "500"} color={infoTab === 'media' ? colors.neutral900 : colors.neutral400} textProps={{ numberOfLines: 1 }}>
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
                                                    <Typo size={14} fontWeight="600" color={colors.neutral900} textProps={{ numberOfLines: 1 }}>
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
                                                    <View style={groupInfoStyles.memberActions}>
                                                        <TouchableOpacity
                                                            onPress={() => userIsAdmin ? onDemote(item._id) : onPromote(item._id)}
                                                            style={groupInfoStyles.roleBtn}
                                                        >
                                                            <Typo size={11} fontWeight="600" color={colors.primaryDark}>
                                                                {userIsAdmin ? "Demote" : "Make Admin"}
                                                            </Typo>
                                                        </TouchableOpacity>
                                                        {onRemoveMember && (
                                                            <TouchableOpacity
                                                                onPress={() => onRemoveMember(item._id)}
                                                                style={groupInfoStyles.removeBtn}
                                                            >
                                                                <Icons.UserMinus size={14} color={colors.rose} weight="bold" />
                                                            </TouchableOpacity>
                                                        )}
                                                    </View>
                                                )}
                                            </View>
                                        );
                                    }}
                                    ListFooterComponent={onLeaveGroup ? (
                                        <TouchableOpacity onPress={onLeaveGroup} style={groupInfoStyles.leaveBtn} activeOpacity={0.8}>
                                            <Icons.SignOut size={16} color={colors.rose} weight="bold" />
                                            <Typo size={13} fontWeight="700" color={colors.rose}>Leave Group</Typo>
                                        </TouchableOpacity>
                                    ) : null}
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
                                                        <View key={m.id} style={[groupInfoStyles.mediaThumbWrap, { width: mediaThumbSize, height: mediaThumbSize }]}>
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
    memberInfo: { flex: 1, minWidth: 0, gap: 2 },
    memberActions: { flexDirection: 'row', alignItems: 'center', flexShrink: 0, gap: spacingX._6 },
    roleBtn: { paddingHorizontal: spacingX._10, paddingVertical: spacingY._5, backgroundColor: colors.primaryLight, borderRadius: radius.full },
    removeBtn: { padding: spacingX._7, backgroundColor: '#fef2f2', borderRadius: radius.full },
    leaveBtn: { marginTop: spacingY._12, paddingVertical: spacingY._12, borderRadius: radius._15, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.25)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacingX._8 },
    mediaScroll: { paddingHorizontal: spacingX._20, paddingBottom: spacingY._20 },
    emptyMedia: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacingY._30, gap: spacingY._7 },
    mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(8) },
    mediaThumbWrap: { borderRadius: radius._10, overflow: 'hidden' },
    mediaThumb: { width: '100%', height: '100%' },
    docItem: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: spacingX._10, paddingVertical: spacingY._8, borderBottomWidth: 1, borderBottomColor: colors.neutral100 },
    docIconWrap: { width: scale(36), height: scale(36), borderRadius: radius._10, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
});

// ── Attachment Options ──
const AttachmentOptions = ({
    onPickImage, onPickGif, onPickFile, onCreatePoll, onSchedule, onCreateChecklist, onOpenGames, onCreateCountdown, onSplitBill, onOpenDoodle, onCreateEvent, onOpenWyr, onClose,
}: {
    onPickImage: () => void;
    onPickGif: () => void;
    onPickFile: () => void;
    onCreatePoll: () => void;
    onSchedule: () => void;
    onCreateChecklist: () => void;
    onOpenGames: () => void;
    onCreateCountdown: () => void;
    onSplitBill: () => void;
    onOpenDoodle: () => void;
    onCreateEvent: () => void;
    onOpenWyr: () => void;
    onClose: () => void;
}) => (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={attachStyles.container}>
        <View style={attachStyles.headerRow}>
            <Typo size={11.5} fontWeight="800" color={colors.neutral500}>ATTACH & INTERACTIVE</Typo>
            <TouchableOpacity style={attachStyles.closeOption} onPress={() => { hapticTap("light"); onClose(); }} activeOpacity={0.7}>
                <Icons.X size={verticalScale(14)} color={colors.neutral500} weight="bold" />
            </TouchableOpacity>
        </View>

        <View style={attachStyles.gridRow}>
            <TouchableOpacity style={attachStyles.option} onPress={() => { hapticTap("medium"); onPickImage(); }} activeOpacity={0.7}>
                <View style={[attachStyles.iconWrap, { backgroundColor: colors.primaryLight }]}>
                    <Icons.Image size={verticalScale(20)} color={colors.primaryDark} weight="fill" />
                </View>
                <Typo size={11} fontWeight="600" color={colors.neutral700} textProps={{ numberOfLines: 1 }}>Image</Typo>
            </TouchableOpacity>

            <TouchableOpacity style={attachStyles.option} onPress={() => { hapticTap("medium"); onPickGif(); }} activeOpacity={0.7}>
                <View style={[attachStyles.iconWrap, { backgroundColor: '#f3e8ff' }]}>
                    <Icons.FilmStrip size={verticalScale(20)} color="#7c3aed" weight="fill" />
                </View>
                <Typo size={11} fontWeight="600" color={colors.neutral700} textProps={{ numberOfLines: 1 }}>GIF</Typo>
            </TouchableOpacity>

            <TouchableOpacity style={attachStyles.option} onPress={() => { hapticTap("medium"); onPickFile(); }} activeOpacity={0.7}>
                <View style={[attachStyles.iconWrap, { backgroundColor: colors.neutral100 }]}>
                    <Icons.FileText size={verticalScale(20)} color={colors.neutral600} weight="fill" />
                </View>
                <Typo size={11} fontWeight="600" color={colors.neutral700} textProps={{ numberOfLines: 1 }}>File</Typo>
            </TouchableOpacity>

            <TouchableOpacity style={attachStyles.option} onPress={() => { hapticTap("medium"); onCreatePoll(); }} activeOpacity={0.7}>
                <View style={[attachStyles.iconWrap, { backgroundColor: '#f0fdf4' }]}>
                    <Icons.ChartBar size={verticalScale(20)} color={colors.green} weight="fill" />
                </View>
                <Typo size={11} fontWeight="600" color={colors.neutral700} textProps={{ numberOfLines: 1 }}>Poll</Typo>
            </TouchableOpacity>

            <TouchableOpacity style={attachStyles.option} onPress={() => { hapticTap("medium"); onCreateChecklist(); }} activeOpacity={0.7}>
                <View style={[attachStyles.iconWrap, { backgroundColor: '#eff6ff' }]}>
                    <Icons.CheckSquare size={verticalScale(20)} color="#0284c7" weight="fill" />
                </View>
                <Typo size={11} fontWeight="600" color={colors.neutral700} textProps={{ numberOfLines: 1 }}>Checklist</Typo>
            </TouchableOpacity>

            <TouchableOpacity style={attachStyles.option} onPress={() => { hapticTap("medium"); onSchedule(); }} activeOpacity={0.7}>
                <View style={[attachStyles.iconWrap, { backgroundColor: '#fef3c7' }]}>
                    <Icons.ClockCountdown size={verticalScale(20)} color="#d97706" weight="fill" />
                </View>
                <Typo size={11} fontWeight="600" color={colors.neutral700} textProps={{ numberOfLines: 1 }}>Schedule</Typo>
            </TouchableOpacity>

            <TouchableOpacity style={attachStyles.option} onPress={() => { hapticTap("medium"); onOpenGames(); }} activeOpacity={0.7}>
                <View style={[attachStyles.iconWrap, { backgroundColor: '#f5f3ff' }]}>
                    <Icons.GameController size={verticalScale(20)} color="#7c3aed" weight="fill" />
                </View>
                <Typo size={11} fontWeight="600" color={colors.neutral700} textProps={{ numberOfLines: 1 }}>Games</Typo>
            </TouchableOpacity>

            <TouchableOpacity style={attachStyles.option} onPress={() => { hapticTap("medium"); onCreateCountdown(); }} activeOpacity={0.7}>
                <View style={[attachStyles.iconWrap, { backgroundColor: '#fff1f2' }]}>
                    <Icons.HourglassMedium size={verticalScale(20)} color="#e11d48" weight="fill" />
                </View>
                <Typo size={11} fontWeight="600" color={colors.neutral700} textProps={{ numberOfLines: 1 }}>Timer</Typo>
            </TouchableOpacity>

            <TouchableOpacity style={attachStyles.option} onPress={() => { hapticTap("medium"); onSplitBill(); }} activeOpacity={0.7}>
                <View style={[attachStyles.iconWrap, { backgroundColor: '#ecfdf5' }]}>
                    <Icons.Receipt size={verticalScale(20)} color="#059669" weight="fill" />
                </View>
                <Typo size={11} fontWeight="600" color={colors.neutral700} textProps={{ numberOfLines: 1 }}>Split Bill</Typo>
            </TouchableOpacity>

            <TouchableOpacity style={attachStyles.option} onPress={() => { hapticTap("medium"); onOpenDoodle(); }} activeOpacity={0.7}>
                <View style={[attachStyles.iconWrap, { backgroundColor: '#fefce8' }]}>
                    <Icons.PaintBrush size={verticalScale(20)} color="#ca8a04" weight="fill" />
                </View>
                <Typo size={11} fontWeight="600" color={colors.neutral700} textProps={{ numberOfLines: 1 }}>Doodle</Typo>
            </TouchableOpacity>

            <TouchableOpacity style={attachStyles.option} onPress={() => { hapticTap("medium"); onCreateEvent(); }} activeOpacity={0.7}>
                <View style={[attachStyles.iconWrap, { backgroundColor: '#e0f2fe' }]}>
                    <Icons.CalendarCheck size={verticalScale(20)} color="#0284c7" weight="fill" />
                </View>
                <Typo size={11} fontWeight="600" color={colors.neutral700} textProps={{ numberOfLines: 1 }}>Event</Typo>
            </TouchableOpacity>

            <TouchableOpacity style={attachStyles.option} onPress={() => { hapticTap("medium"); onOpenWyr(); }} activeOpacity={0.7}>
                <View style={[attachStyles.iconWrap, { backgroundColor: '#fae8ff' }]}>
                    <Icons.Scales size={verticalScale(20)} color="#a21caf" weight="fill" />
                </View>
                <Typo size={11} fontWeight="600" color={colors.neutral700} textProps={{ numberOfLines: 1 }}>This/That</Typo>
            </TouchableOpacity>
        </View>
    </Animated.View>
);

const attachStyles = StyleSheet.create({
    container: {
        backgroundColor: colors.white, borderRadius: radius._15,
        borderWidth: 1, borderColor: colors.neutral200,
        marginBottom: spacingY._7, paddingHorizontal: spacingX._12,
        paddingVertical: spacingY._10, gap: spacingY._8,
        shadowColor: colors.black, shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
    },
    headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 2 },
    gridRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start", rowGap: spacingY._10, columnGap: "2%" },
    option: { width: "23%", alignItems: "center", gap: spacingY._5 },
    iconWrap: { width: verticalScale(44), height: verticalScale(44), borderRadius: radius._12, alignItems: "center", justifyContent: "center" },
    closeOption: { padding: spacingX._5, backgroundColor: colors.neutral100, borderRadius: radius.full, width: verticalScale(26), height: verticalScale(26), alignItems: "center", justifyContent: "center" },
});

// ─────────────────────────────────────────────
// MAIN CONVERSATION COMPONENT
// ─────────────────────────────────────────────
const Conversation = () => {
    const { user: currentUser } = useAuth();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const rawParams = useLocalSearchParams();
    const conversationId = Array.isArray(rawParams.id) ? rawParams.id[0] : rawParams.id;
    const initialName = Array.isArray(rawParams.name) ? rawParams.name[0] : rawParams.name;
    const stringifiedParticipants = Array.isArray(rawParams.participants) ? rawParams.participants[0] : rawParams.participants;
    const initialAvatar = Array.isArray(rawParams.avatar) ? rawParams.avatar[0] : rawParams.avatar;
    const type = Array.isArray(rawParams.type) ? rawParams.type[0] : rawParams.type;
    const highlightMessageId = Array.isArray(rawParams.highlightMessageId) ? rawParams.highlightMessageId[0] : rawParams.highlightMessageId;
    const stringifiedAdmins = Array.isArray(rawParams.admins) ? rawParams.admins[0] : rawParams.admins;
    const initialCreatedBy = Array.isArray(rawParams.createdBy) ? rawParams.createdBy[0] : rawParams.createdBy;
    const initialDisappearing = Array.isArray(rawParams.disappearingSeconds) ? rawParams.disappearingSeconds[0] : rawParams.disappearingSeconds;

    const [name, setName] = useState(initialName || "");
    const [avatar, setAvatar] = useState(initialAvatar || "");
    const [message, setMessage] = useState('');
    const parseParamArray = (raw?: string) => {
        try {
            if (typeof raw === "string" && raw.trim()) {
                const parsed = JSON.parse(raw);
                return Array.isArray(parsed) ? parsed : [];
            }
            return [];
        } catch {
            return [];
        }
    };
    const [participants, setParticipants] = useState<any[]>(() => parseParamArray(stringifiedParticipants));
    const [groupAdmins, setGroupAdmins] = useState<any[]>(() => parseParamArray(stringifiedAdmins));
    const [groupCreatedBy, setGroupCreatedBy] = useState<string | undefined>(initialCreatedBy || undefined);
    const [selectedFile, setSelectedFile] = useState<SelectedFileProps | null>(null);
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState<MessageProps[]>(
        () => getMemoryMessages(conversationId) ?? []
    );
    const [isInitialLoading, setIsInitialLoading] = useState<boolean>(
        () => !(typeof conversationId === 'string' && conversationId.startsWith('notes_')) &&
            !(getMemoryMessages(conversationId)?.length)
    );
    const hasSyncedMessagesRef = useRef((getMemoryMessages(conversationId)?.length ?? 0) > 0);
    const initialLoadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [messageStatuses, setMessageStatuses] = useState<Record<string, "sending" | "sent" | "delivered" | "seen">>({});
    const [replyTo, setReplyTo] = useState<ReplyToProps | null>(null);
    const [typingUser, setTypingUser] = useState<string | null>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isTypingRef = useRef(false);
    const isMountedRef = useRef(true);
    const isStartingRecordingRef = useRef(false);
    const pendingSchedAckRef = useRef<((res: any) => void) | null>(null);
    const pendingForwardListRef = useRef<((res: any) => void) | null>(null);
    const currentUserRef = useRef(currentUser);
    currentUserRef.current = currentUser;
    const isDirectRef = useRef(type === 'direct');
    isDirectRef.current = type === 'direct';
    const prevConvIdRef = useRef(conversationId);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // ── Attachment picker ──
    const [showAttachOptions, setShowAttachOptions] = useState(false);

    // ── Poll state ──
    const [showPollModal, setShowPollModal] = useState(false);
    const [pollQuestion, setPollQuestion] = useState('');
    const [pollOptions, setPollOptions] = useState(['', '']);
    const [pollAllowMultiple, setPollAllowMultiple] = useState(false);
    const [pollError, setPollError] = useState('');

    // ── Pagination ──
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const isLoadingMoreRef = useRef(false);
    const minLoadedPageRef = useRef(0);
    const loadingNewerRef = useRef(false);
    const pendingJumpIdRef = useRef<string | null>(null);
    const prevDisappearingRef = useRef(0);

    // ── Online Status ──
    const [contactIsOnline, setContactIsOnline] = useState(false);
    const [contactLastSeen, setContactLastSeen] = useState<string | null>(null);

    // ── Voice recording ──
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const recordingDurationRef = useRef(0);
    const [isUploadingVoice, setIsUploadingVoice] = useState(false);
    const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
    const recordingRef = useRef<ReturnType<typeof useAudioRecorder> | null>(null);
    const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const micScale = useSharedValue(1);
    const micAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: micScale.value }] }));

    const isDirect = type === 'direct';
    const isNotesToSelf = typeof conversationId === 'string' && conversationId.startsWith('notes_');
    const isGroupAdmin =
        type === 'group' &&
        (groupAdmins?.some((a: any) => (a._id || a).toString() === currentUser?.id) ||
            groupCreatedBy?.toString() === currentUser?.id);
    const otherParticipant = useMemo(() => {
        if (isNotesToSelf) return null;
        const fromParticipants = isDirect ? participants.find((p: any) => (p._id || p.id) !== currentUser?.id) : null;
        if (fromParticipants) return fromParticipants;
        if (!isDirect) return null;
        const otherMsg = messages.find(m => m.sender?.id && m.sender.id !== currentUser?.id);
        if (otherMsg?.sender) {
            return {
                _id: otherMsg.sender.id,
                name: otherMsg.sender.name,
                avatar: otherMsg.sender.avatar,
            };
        }
        return null;
    }, [isDirect, isNotesToSelf, participants, currentUser?.id, messages]);

    let conversationAvatar = avatar;
    if (isNotesToSelf) conversationAvatar = currentUser?.avatar || avatar;
    else if (isDirect && otherParticipant) conversationAvatar = otherParticipant.avatar;
    const baseConversationName = isNotesToSelf ? "Notes to Self 📝" : (isDirect ? otherParticipant?.name : name);

    // ── v4.0.1 Flagship Feature States ──
    const [nicknamesMap, setNicknamesMap] = useState<Record<string, string>>({});
    const [appearance, setAppearance] = useState<ChatAppearanceConfig>(DEFAULT_APPEARANCE);
    const [quickReplies, setQuickReplies] = useState<QuickReplyTemplate[]>([]);
    const [showFormatBar, setShowFormatBar] = useState(false);
    const [isSilentSend, setIsSilentSend] = useState(false);
    const [showChecklistModal, setShowChecklistModal] = useState(false);
    const [showGameModal, setShowGameModal] = useState(false);
    const [showCountdownModal, setShowCountdownModal] = useState(false);
    const [showQuickRepliesMgr, setShowQuickRepliesMgr] = useState(false);
    const [showInsightsModal, setShowInsightsModal] = useState(false);
    const [showGifModal, setShowGifModal] = useState(false);
    const [showSplitModal, setShowSplitModal] = useState(false);
    const [showDoodleModal, setShowDoodleModal] = useState(false);
    const [showScratchpadModal, setShowScratchpadModal] = useState(false);
    const [showEventModal, setShowEventModal] = useState(false);
    const [showWyrModal, setShowWyrModal] = useState(false);
    const [showFancyTextModal, setShowFancyTextModal] = useState(false);
    const [searchFilterKind, setSearchFilterKind] = useState<SearchFilterKind>("all");
    const [selectedMsgIds, setSelectedMsgIds] = useState<string[]>([]);
    const [outboxCount, setOutboxCount] = useState(0);
    const [contactCustomStatus, setContactCustomStatus] = useState<{ emoji?: string; text?: string } | null>(null);
    const focusActiveRef = useRef(false);
    const hideNotifPreviewRef = useRef(false);
    const composerSelectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

    useEffect(() => {
        const loadFeatureState = () => {
            getNicknamesMap().then(setNicknamesMap);
            getChatAppearance().then(setAppearance);
            getQuickReplies().then(setQuickReplies);
            getFocusMode().then((f) => { focusActiveRef.current = f.enabled; });
            getPrivacyShield().then((p) => { hideNotifPreviewRef.current = p.hideNotificationPreview; });
        };
        loadFeatureState();
        return subscribeFeatureUpdates(loadFeatureState);
    }, []);

    let conversationName = baseConversationName;
    if (!isNotesToSelf) {
        const alias = (conversationId && nicknamesMap[conversationId])
            || (otherParticipant?._id && nicknamesMap[otherParticipant._id]);
        if (alias) conversationName = alias;
    }

    const isSelectionMode = selectedMsgIds.length > 0;

    // ── Advanced Features State (Features 2, 3, 4, 5, 7, 9, 10, V3.1.2) ──
    const [pinnedMessages, setPinnedMessages] = useState<any[]>([]);
    const [isViewOnce, setIsViewOnce] = useState(false);
    const [isHd, setIsHd] = useState(false);
    const [voiceReview, setVoiceReview] = useState<{ uri: string; duration: number } | null>(null);
    const voiceReviewRef = useRef(voiceReview);
    voiceReviewRef.current = voiceReview;
    const reviewPlayer = useAudioPlayer(voiceReview?.uri ? { uri: voiceReview.uri } : null);
    const reviewPlayerStatus = useAudioPlayerStatus(reviewPlayer);
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeSearchIndex, setActiveSearchIndex] = useState(0);
    const [forwardModalVisible, setForwardModalVisible] = useState(false);
    const [forwardingMessage, setForwardingMessage] = useState<MessageProps | null>(null);
    const [recentConversations, setRecentConversations] = useState<any[]>([]);
    const [groupInfoVisible, setGroupInfoVisible] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    // ── Track active conversation for foreground notification suppression ──
    useEffect(() => {
        const idStr = typeof conversationId === 'string' ? conversationId : null;
        setActiveConversationId(idStr);
        return () => {
            if (getActiveConversationId() === idStr) {
                setActiveConversationId(null);
            }
        };
    }, [conversationId]);

    // ── Draft Restoration (V3.1.2) ──
    useEffect(() => {
        if (!conversationId) return;
        if (prevConvIdRef.current !== conversationId) {
            prevConvIdRef.current = conversationId;
            setName(initialName || "");
            setAvatar(initialAvatar || "");
            setParticipants(parseParamArray(stringifiedParticipants));
            setGroupAdmins(parseParamArray(stringifiedAdmins));
            setGroupCreatedBy(initialCreatedBy || undefined);
            setMessages(getMemoryMessages(conversationId) ?? []);
            hasSyncedMessagesRef.current = (getMemoryMessages(conversationId)?.length ?? 0) > 0;
            setIsInitialLoading(!isNotesToSelf && !(getMemoryMessages(conversationId)?.length));
            setMessageStatuses({});
            setPinnedMessages([]);
            setMessage('');
            setReplyTo(null);
            setSelectedFile(null);
            setTypingUser(null);
            setContactIsOnline(false);
            setContactLastSeen(null);
            setPage(0);
            setHasMore(true);
            isLoadingMoreRef.current = false;
            minLoadedPageRef.current = 0;
            loadingNewerRef.current = false;
            pendingJumpIdRef.current = null;
            setIsSearching(false);
            setSearchQuery('');
            setSearchFilterKind('all');
            setScheduledMessages([]);
            setSelectedMsgIds([]);
            setIsSilentSend(false);
            setShowFormatBar(false);
            setContactCustomStatus(null);
            setPollError('');
            const parsedDisappearing = parseInt(String(initialDisappearing || "0"), 10);
            setDisappearingSeconds(isNaN(parsedDisappearing) ? 0 : parsedDisappearing);
            setSelectedTheme(CHAT_THEMES[0]);
            setCustomWallpaperUri(null);
        }
        AsyncStorage.getItem(`@bubbly_draft_${conversationId}`).then((draft) => {
            if (draft && draft.trim()) {
                setMessage(draft);
            }
        }).catch(() => {});
        if (!isNotesToSelf) {
            getCachedMessages(conversationId).then((cached) => {
                if (cached.length > 0 && isMountedRef.current) {
                    hasSyncedMessagesRef.current = true;
                    setMessages((prev) => (prev.length === 0 ? cached : prev));
                    setIsInitialLoading(false);
                }
            }).catch(() => {});
        } else {
            setIsInitialLoading(false);
        }
    }, [conversationId, isNotesToSelf]);

    useEffect(() => {
        if (!conversationId || isNotesToSelf || !hasSyncedMessagesRef.current) return;
        const timer = setTimeout(() => {
            setCachedMessages(conversationId, messages);
        }, 120);
        return () => clearTimeout(timer);
    }, [messages, conversationId, isNotesToSelf]);

    // ── Scheduled Messages (Feature 3: Backend Worker + Local Notes Fallback) ──
    const [scheduledMessages, setScheduledMessages] = useState<{ id: string; conversationId: string; content: string; sendAt: number; label: string }[]>([]);
    const [showScheduleModal, setShowScheduleModal] = useState(false);

    useEffect(() => {
        if (!conversationId) return;
        if (!isNotesToSelf && isSocketConnected()) {
            const onSchedList = (res: any) => {
                if (res?.success && Array.isArray(res.data)) {
                    setScheduledMessages(res.data.map((s: any) => ({
                        id: s._id || s.id,
                        conversationId: s.conversationId,
                        content: s.content,
                        sendAt: new Date(s.sendAt).getTime(),
                        label: new Date(s.sendAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    })));
                }
            };
            getScheduledMessages(onSchedList);
            getScheduledMessages({ conversationId });
            return () => {
                getScheduledMessages(onSchedList, true);
            };
        }
        AsyncStorage.getItem(`@bubbly_scheduled_${conversationId}`).then((raw) => {
            if (raw) {
                try {
                    const list = JSON.parse(raw);
                    if (Array.isArray(list)) setScheduledMessages(list);
                } catch (_) {}
            }
        }).catch(() => {});
    }, [conversationId, isNotesToSelf]);

    const saveScheduled = useCallback(async (list: { id: string; conversationId: string; content: string; sendAt: number; label: string }[]) => {
        setScheduledMessages(list);
        if (conversationId) {
            await AsyncStorage.setItem(`@bubbly_scheduled_${conversationId}`, JSON.stringify(list)).catch(() => {});
        }
    }, [conversationId]);

    useEffect(() => {
        if (!conversationId || scheduledMessages.length === 0 || (!isNotesToSelf && isSocketConnected())) return;
        const interval = setInterval(() => {
            if (!isNotesToSelf && !isSocketConnected()) return;
            const now = Date.now();
            const due = scheduledMessages.filter(m => m.sendAt <= now);
            if (due.length > 0) {
                const remaining = scheduledMessages.filter(m => m.sendAt > now);
                saveScheduled(remaining);
                if (isNotesToSelf) {
                    const noteItems: MessageProps[] = due.map((item) => ({
                        id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                        conversationId: conversationId as string,
                        sender: { id: currentUser?.id as string, name: currentUser?.name || "You", avatar: currentUser?.avatar || null },
                        content: item.content,
                        attachement: null,
                        attachmentMeta: null,
                        type: 'text',
                        replyTo: null,
                        reactions: [],
                        createdAt: new Date().toISOString(),
                    }));
                    setMessages(prev => {
                        const updated = [...noteItems, ...prev];
                        AsyncStorage.setItem(`@bubbly_notes_${conversationId}`, JSON.stringify(updated)).catch(() => {});
                        return updated;
                    });
                } else {
                    due.forEach((item) => {
                        newMessage({
                            conversationId,
                            sender: { id: currentUser?.id, name: currentUser?.name, avatar: currentUser?.avatar },
                            content: item.content,
                            attachement: null,
                            attachmentMeta: null,
                            type: 'text',
                            replyTo: null,
                        });
                    });
                }
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [scheduledMessages, conversationId, currentUser, saveScheduled, isNotesToSelf]);

    const flushOfflineScheduled = useCallback(async () => {
        if (!conversationId || isNotesToSelf || !isSocketConnected()) return;
        try {
            const raw = await AsyncStorage.getItem(`@bubbly_scheduled_${conversationId}`);
            if (!raw) return;
            const list = JSON.parse(raw);
            if (!Array.isArray(list) || list.length === 0) return;
            for (const item of list) {
                const sendAtIso = new Date(Math.max(Number(item.sendAt) || Date.now(), Date.now() + 20_000)).toISOString();
                scheduleMessage({
                    conversationId,
                    content: item.content,
                    sendAt: sendAtIso,
                });
            }
            await AsyncStorage.removeItem(`@bubbly_scheduled_${conversationId}`).catch(() => {});
            getScheduledMessages({ conversationId });
        } catch (_) {}
    }, [conversationId, isNotesToSelf]);

    const handleConfirmSchedule = (delayMs: number, label: string) => {
        if (!message.trim()) {
            setShowScheduleModal(false);
            setTimeout(() => {
                BubblyAlert.alert("Empty Message", "Please type a message before scheduling.");
            }, 90);
            return;
        }
        const safeDelay = Math.max(delayMs, 20_000);
        if (!isNotesToSelf && isSocketConnected()) {
            const sendAtIso = new Date(Date.now() + safeDelay).toISOString();
            if (pendingSchedAckRef.current) {
                scheduleMessage(pendingSchedAckRef.current, true);
            }
            const onSchedAck = (res: any) => {
                scheduleMessage(onSchedAck, true);
                pendingSchedAckRef.current = null;
                if (res?.success && res.data) {
                    setScheduledMessages(prev => [...prev, {
                        id: res.data._id || `sched_${Date.now()}`,
                        conversationId: conversationId as string,
                        content: res.data.content,
                        sendAt: new Date(res.data.sendAt).getTime(),
                        label,
                    }]);
                } else {
                    BubblyAlert.alert("Schedule Error", res?.msg || "Could not schedule message.");
                }
            };
            pendingSchedAckRef.current = onSchedAck;
            scheduleMessage(onSchedAck);
            scheduleMessage({
                conversationId,
                content: message.trim(),
                sendAt: sendAtIso,
            });
            setMessage("");
            setShowScheduleModal(false);
            setTimeout(() => {
                BubblyAlert.alert("Message Scheduled ⏱️", `Your message will be automatically delivered in ${label.toLowerCase()}.`);
            }, 90);
            return;
        }
        const item = {
            id: `sched_${Date.now()}`,
            conversationId: conversationId as string,
            content: message.trim(),
            sendAt: Date.now() + safeDelay,
            label,
        };
        const updated = [...scheduledMessages, item];
        saveScheduled(updated);
        setMessage("");
        setShowScheduleModal(false);
        setTimeout(() => {
            BubblyAlert.alert("Message Scheduled ⏱️", `Your message will be automatically sent in ${label.toLowerCase()}.`);
        }, 90);
    };

    const handleCancelScheduled = (id: string) => {
        if (!isNotesToSelf && isSocketConnected()) {
            cancelScheduledMessage({ id });
            setScheduledMessages(prev => prev.filter(m => m.id !== id));
            return;
        }
        const updated = scheduledMessages.filter(m => m.id !== id);
        saveScheduled(updated);
    };

    // ── Chat Wallpaper & Theme (Feature 14 & V3.2.0 Custom Wallpaper) ──
    const [selectedTheme, setSelectedTheme] = useState<ChatTheme>(CHAT_THEMES[0]);
    const accentMineBubble = useMemo(
        () => ACCENT_SWATCHES.find((s) => s.color === appearance.accentColor)?.myBubble,
        [appearance.accentColor]
    );
    const [customWallpaperUri, setCustomWallpaperUri] = useState<string | null>(null);
    const [showThemeModal, setShowThemeModal] = useState(false);

    useEffect(() => {
        if (!conversationId) return;
        AsyncStorage.getItem(`@bubbly_chat_theme_${conversationId}`).then((savedId) => {
            if (savedId) {
                const found = CHAT_THEMES.find(t => t.id === savedId);
                if (found) setSelectedTheme(found);
            }
        }).catch(() => {});
        AsyncStorage.getItem(`@bubbly_custom_wallpaper_${conversationId}`).then((savedUri) => {
            if (savedUri) setCustomWallpaperUri(savedUri);
        }).catch(() => {});
    }, [conversationId]);

    const handleSelectTheme = (th: ChatTheme) => {
        setSelectedTheme(th);
        setCustomWallpaperUri(null);
        setShowThemeModal(false);
        if (conversationId) {
            AsyncStorage.setItem(`@bubbly_chat_theme_${conversationId}`, th.id).catch(() => {});
            AsyncStorage.removeItem(`@bubbly_custom_wallpaper_${conversationId}`).catch(() => {});
        }
    };

    const handlePickCustomWallpaper = async () => {
        setShowThemeModal(false);
        try {
            const res = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: false,
                quality: 0.85,
            });
            if (!res.canceled && res.assets && res.assets[0]?.uri) {
                const uri = res.assets[0].uri;
                setCustomWallpaperUri(uri);
                if (conversationId) {
                    await AsyncStorage.setItem(`@bubbly_custom_wallpaper_${conversationId}`, uri).catch(() => {});
                }
            }
        } catch (e) {
            console.log("handlePickCustomWallpaper error:", e);
        }
    };

    // ── Disappearing Messages State (Feature 8) ──
    const [disappearingSeconds, setDisappearingSeconds] = useState<number>(() => {
        const parsed = parseInt(String(initialDisappearing || "0"), 10);
        return isNaN(parsed) ? 0 : parsed;
    });
    const [showDisappearingModal, setShowDisappearingModal] = useState<boolean>(false);

    useEffect(() => {
        if (!conversationId || !isNotesToSelf) return;
        AsyncStorage.getItem(`@bubbly_disappearing_${conversationId}`).then((saved) => {
            if (saved) {
                const sec = parseInt(saved, 10);
                if (!isNaN(sec)) setDisappearingSeconds(sec);
            }
        }).catch(() => {});
    }, [conversationId, isNotesToSelf]);

    const handleSelectDisappearing = async (seconds: number) => {
        setShowDisappearingModal(false);
        if (type === 'group' && !isGroupAdmin) {
            setTimeout(() => {
                BubblyAlert.alert("Admin Only", "Only group admins can change disappearing messages.");
            }, 90);
            return;
        }
        prevDisappearingRef.current = disappearingSeconds;
        setDisappearingSeconds(seconds);
        if (conversationId) {
            if (isNotesToSelf) {
                await AsyncStorage.setItem(`@bubbly_disappearing_${conversationId}`, seconds.toString()).catch(() => {});
            } else if (isSocketConnected()) {
                setDisappearingTimer({ conversationId, seconds });
            } else {
                setDisappearingSeconds(prevDisappearingRef.current);
                setTimeout(() => {
                    BubblyAlert.alert("Offline", "Connect to the internet to update disappearing messages.");
                }, 90);
                return;
            }
        }
        setTimeout(() => {
            BubblyAlert.alert(
                "Disappearing Messages",
                seconds === 0
                    ? "Disappearing messages turned off."
                    : `New messages will now disappear after ${seconds === 86400 ? "24 hours" : seconds === 604800 ? "7 days" : "90 days"}.`
            );
        }, 90);
    };

    // ── Group Mention Candidates (Feature 7) ──
    const mentionCandidates = useMemo(() => {
        if (type !== 'group' || !message) return [];
        const match = message.match(/@(\w*)$/);
        if (!match) return [];
        const prefix = match[1].toLowerCase();
        return participants.filter(p => {
            const pId = (p._id || p.id)?.toString();
            if (pId === currentUser?.id?.toString()) return false;
            if (!prefix) return true;
            return (p.name || "").toLowerCase().includes(prefix);
        });
    }, [type, message, participants, currentUser?.id]);

    const handleSelectMention = (member: any) => {
        const newText = message.replace(/@(\w*)$/, `@${member.name} `);
        setMessage(newText);
    };

    // ── Network status & Auto-scroll pill (Features 17 & 18) ──
    const [isOnlineNetwork, setIsOnlineNetwork] = useState(isSocketConnected());
    const [isScrolledUp, setIsScrolledUp] = useState(false);
    const isScrolledUpRef = useRef(false);
    isScrolledUpRef.current = isScrolledUp;
    const otherParticipantRef = useRef(otherParticipant);
    otherParticipantRef.current = otherParticipant;
    const nameRef = useRef(name);
    nameRef.current = name;
    const avatarRef = useRef(avatar);
    avatarRef.current = avatar;
    const [newMessagesBelow, setNewMessagesBelow] = useState(0);

    // ── Offline Message Outbox & Auto-Sync (Feature 1) ──
    const flushOutbox = useCallback(async () => {
        if (!conversationId || isNotesToSelf || !isSocketConnected()) {
            if (conversationId && !isNotesToSelf) {
                AsyncStorage.getItem(`@bubbly_outbox_${conversationId}`).then((raw) => {
                    const q = raw ? JSON.parse(raw) : [];
                    setOutboxCount(Array.isArray(q) ? q.length : 0);
                }).catch(() => setOutboxCount(0));
            }
            return;
        }
        try {
            const key = `@bubbly_outbox_${conversationId}`;
            const raw = await AsyncStorage.getItem(key);
            if (!raw) { setOutboxCount(0); return; }
            const queue: any[] = JSON.parse(raw);
            if (!Array.isArray(queue) || queue.length === 0) { setOutboxCount(0); return; }
            setOutboxCount(queue.length);

            for (const item of queue) {
                newMessage({
                    conversationId: item.conversationId,
                    sender: item.sender,
                    content: item.content,
                    attachement: item.attachement,
                    attachmentMeta: item.attachmentMeta,
                    type: item.type,
                    replyTo: item.replyTo,
                    isSilent: !!item.isSilent,
                    clientId: item.tempId,
                });
                if (item.tempId) {
                    setMessageStatuses(prev => ({
                        ...prev,
                        [item.tempId]: "sent",
                    }));
                }
            }
        } catch (err) {
            console.log("flushOutbox error:", err);
        }
    }, [conversationId, isNotesToSelf]);

    useEffect(() => {
        if (isSocketConnected()) {
            flushOutbox();
        }
    }, [flushOutbox]);

    // ── Android Back Button Listener ──
    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            if (isSelectionMode) {
                setSelectedMsgIds([]);
                return true;
            }
            if (isSearching) {
                setIsSearching(false);
                setSearchQuery('');
                return true;
            }
            if (showThemeModal) {
                setShowThemeModal(false);
                return true;
            }
            if (showDisappearingModal) {
                setShowDisappearingModal(false);
                return true;
            }
            if (showPollModal) {
                setShowPollModal(false);
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
            if (showScheduleModal) {
                setShowScheduleModal(false);
                return true;
            }
            if (showAttachOptions) {
                setShowAttachOptions(false);
                return true;
            }
            return false;
        });
        return () => backHandler.remove();
    }, [isSelectionMode, isSearching, showThemeModal, showDisappearingModal, showPollModal, groupInfoVisible, forwardModalVisible, showScheduleModal, showAttachOptions]);

    // ── Connection Status Listener ──
    useEffect(() => {
        if (isSocketConnected()) {
            flushOfflineScheduled();
        }
        return onSocketConnectionChange((connected) => {
            setIsOnlineNetwork(connected);
            if (connected) {
                flushOutbox();
                flushOfflineScheduled();
                if (!isNotesToSelf && conversationId) {
                    getMessages({ conversationId, page: 0, limit: 30 });
                    markAsRead(conversationId as string);
                }
            }
        });
    }, [flushOutbox, flushOfflineScheduled, conversationId, isNotesToSelf]);

    const handleScroll = (event: any) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        const scrolled = offsetY > 180;
        setIsScrolledUp(scrolled);
        if (!scrolled) {
            setNewMessagesBelow(0);
        }
        if (
            !isNotesToSelf &&
            offsetY < 80 &&
            minLoadedPageRef.current > 0 &&
            !loadingNewerRef.current &&
            isSocketConnected()
        ) {
            loadingNewerRef.current = true;
            getMessages({ conversationId, page: minLoadedPageRef.current - 1, limit: 30 });
        }
    };

    const scrollToBottom = () => {
        hapticTap("medium");
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        setNewMessagesBelow(0);
        setIsScrolledUp(false);
    };

    // ─────────────────────────────────────────────
    // SOCKET SETUP (or Local Notes to Self load)
    // ─────────────────────────────────────────────
    useEffect(() => {
        if (isNotesToSelf) {
            setHasMore(false);
            AsyncStorage.getItem(`@bubbly_notes_${conversationId}`).then((raw) => {
                if (raw) {
                    try {
                        const saved = JSON.parse(raw);
                        if (Array.isArray(saved)) setMessages(saved);
                    } catch (_) {}
                }
            }).catch(() => {});
            return () => {
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
                if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
                if (recordingRef.current) {
                    const rec = recordingRef.current;
                    recordingRef.current = null;
                    try {
                        Promise.resolve(rec.stop()).catch(() => {});
                    } catch {}
                }
                if (voiceReviewRef.current?.uri) {
                    try { reviewPlayer.pause(); } catch (_) {}
                }
            };
        }

        const groupUpdatedHandler = (res: any) => {
            if (res?.success && res.data?._id === conversationId) {
                if (res.data.name) setName(res.data.name);
                if (res.data.avatar !== undefined) setAvatar(res.data.avatar || "");
                if (Array.isArray(res.data.participants)) setParticipants(res.data.participants);
                if (Array.isArray(res.data.admins)) setGroupAdmins(res.data.admins);
                if (res.data.createdBy) setGroupCreatedBy(res.data.createdBy);
                if (typeof res.data.disappearingSeconds === "number") setDisappearingSeconds(res.data.disappearingSeconds);
            }
        };

        const disappearingHandler = (res: any) => {
            if (res?.success === false) {
                setDisappearingSeconds(prevDisappearingRef.current);
                BubblyAlert.alert("Permission Denied", res.msg || "Could not update disappearing messages.");
                return;
            }
            if (res?.success && res.data?.conversationId === conversationId) {
                setDisappearingSeconds(res.data.disappearingSeconds || 0);
            }
        };

        const removedFromGroupHandler = (data: { conversationId?: string }) => {
            if (data?.conversationId?.toString() === conversationId?.toString()) {
                setGroupInfoVisible(false);
                BubblyAlert.alert(
                    "Removed from Group",
                    "You are no longer a member of this group.",
                    [{ text: "OK", onPress: () => router.replace("/(main)/home") }],
                    { cancelable: false }
                );
            }
        };

        const scheduledSentHandler = (data: { id?: string; conversationId?: string }) => {
            if (data?.conversationId?.toString() === conversationId?.toString() && data?.id) {
                setScheduledMessages(prev => prev.filter(s => s.id !== data.id));
            }
        };

        const checklistUpdatedHandler = (res: any) => {
            if (res?.success && res.data?.conversationId === conversationId && res.data?.messageId) {
                setMessages(prev => prev.map(m =>
                    m.id === res.data.messageId ? { ...m, checklist: res.data.checklist } : m
                ));
            }
        };

        const messageAckHandler = async (ack: any) => {
            if (!ack?.clientId) return;
            if (!ack?.success) {
                setMessages(prev => prev.filter(m => m.id !== ack.clientId));
                setMessageStatuses(prev => {
                    const next = { ...prev };
                    delete next[ack.clientId];
                    return next;
                });
                if (ack?.msg) {
                    BubblyAlert.alert("Send Failed", ack.msg);
                }
                return;
            }
            if (!ack.data?.id) return;
            const localSilent = (await getLocalSilentIds()).has(ack.clientId);
            if (localSilent || ack.data.isSilent) {
                await markLocalSilentMessage(ack.data.id);
            }
            setMessages(prev => {
                const hasTemp = prev.some(m => m.id === ack.clientId);
                if (!hasTemp) return prev;
                const tempMsg = prev.find(m => m.id === ack.clientId);
                const resolvedSilent = Boolean(ack.data.isSilent || tempMsg?.isSilent || localSilent);
                const deduped = prev.filter(m => m.id !== ack.data.id);
                const updated = deduped.map(m => m.id === ack.clientId ? { ...ack.data, isSilent: resolvedSilent, conversationId: conversationId as string } : m);
                hasSyncedMessagesRef.current = true;
                return updated;
            });
            setMessageStatuses(prev => {
                const next = { ...prev };
                delete next[ack.clientId];
                next[ack.data.id] = "sent";
                return next;
            });
            try {
                const key = `@bubbly_outbox_${conversationId}`;
                const raw = await AsyncStorage.getItem(key);
                if (raw) {
                    const queue = JSON.parse(raw);
                    if (Array.isArray(queue)) {
                        const remaining = queue.filter((q: any) => q.tempId !== ack.clientId);
                        setOutboxCount(remaining.length);
                        if (remaining.length === 0) await AsyncStorage.removeItem(key);
                        else await AsyncStorage.setItem(key, JSON.stringify(remaining));
                    }
                }
            } catch (_) {}
        };

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
        onGroupUpdated(groupUpdatedHandler);
        onRemovedFromGroup(removedFromGroupHandler);
        setDisappearingTimer(disappearingHandler);
        onScheduledMessageSent(scheduledSentHandler);
        onChecklistUpdated(checklistUpdatedHandler);
        onMessageAck(messageAckHandler);

        initialLoadTimerRef.current = setTimeout(() => {
            setIsInitialLoading(false);
            initialLoadTimerRef.current = null;
        }, 4500);

        getMessages({
            conversationId,
            page: 0,
            limit: 30,
            ...(highlightMessageId ? { aroundMessageId: highlightMessageId } : {}),
        });
        markAsRead(conversationId as string);

        return () => {
            if (initialLoadTimerRef.current) {
                clearTimeout(initialLoadTimerRef.current);
                initialLoadTimerRef.current = null;
            }
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
            onGroupUpdated(groupUpdatedHandler, true);
            onRemovedFromGroup(removedFromGroupHandler, true);
            setDisappearingTimer(disappearingHandler, true);
            onScheduledMessageSent(scheduledSentHandler, true);
            onChecklistUpdated(checklistUpdatedHandler, true);
            onMessageAck(messageAckHandler, true);
            if (pendingSchedAckRef.current) {
                scheduleMessage(pendingSchedAckRef.current, true);
                pendingSchedAckRef.current = null;
            }
            if (pendingForwardListRef.current) {
                getConversations(pendingForwardListRef.current, true);
                pendingForwardListRef.current = null;
            }
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
            if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
            if (recordingRef.current) {
                const rec = recordingRef.current;
                recordingRef.current = null;
                try {
                    Promise.resolve(rec.stop()).catch(() => {});
                } catch {}
            }
            if (voiceReviewRef.current?.uri) {
                try { reviewPlayer.pause(); } catch (_) {}
            }
        };
    }, [conversationId, isNotesToSelf]);

    useEffect(() => {
        if (isDirect && otherParticipant?._id) {
            getUserStatus({ userId: otherParticipant._id });
        }
    }, [isDirect, otherParticipant?._id]);

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
    const handleStartCall = useCallback(async (callKind: 'voice' | 'video') => {
        hapticTap("boom");
        if (!currentUser || !conversationId || isNotesToSelf) return;
        const targetCalleeId = otherParticipant?._id || "";
        if (!targetCalleeId && !isDirect) return;

        if (!isSocketConnected()) {
            try {
                await connectSocket();
                await new Promise(resolve => setTimeout(resolve, 450));
            } catch (_) {}
        }

        if (!isSocketConnected()) {
            BubblyAlert.alert("Connecting...", "Reconnecting your real-time session. Please try again in a moment.");
            return;
        }
        callInvite({ conversationId: conversationId as string, calleeId: targetCalleeId, kind: callKind });
    }, [otherParticipant, currentUser, conversationId, isDirect, isNotesToSelf]);

    const callRingingHandler = useCallback((data: any) => {
        if (data?.conversationId && data.conversationId.toString() !== conversationId?.toString()) return;
        router.push({
            pathname: '/(main)/callScreen',
            params: {
                callId: data.callId, kind: data.kind,
                conversationId: data.conversationId,
                remoteUserName: isDirect ? otherParticipantRef.current?.name : nameRef.current,
                remoteUserAvatar: isDirect ? otherParticipantRef.current?.avatar : avatarRef.current,
                isOutgoing: 'true',
            },
        });
    }, [isDirect, conversationId]);

    const callFailedHandler = useCallback((data: any) => {
        BubblyAlert.alert(data.reason === 'busy' ? '🔴 User Busy' : '❌ Call Failed', data.msg || 'Could not connect the call');
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
        if (isNotesToSelf) {
            setShowPollModal(false);
            setTimeout(() => {
                BubblyAlert.alert('Notes to Self', 'Polls are only available in group or direct chats.');
            }, 90);
            return;
        }
        const validOptions = pollOptions.filter(o => o.trim());
        if (!pollQuestion.trim()) {
            setPollError('Please enter a poll question.');
            return;
        }
        if (validOptions.length < 2) {
            setPollError('Please provide at least 2 poll options.');
            return;
        }

        createPoll({
            conversationId,
            question: pollQuestion.trim(),
            options: validOptions,
            allowMultiple: pollAllowMultiple,
        });

        setShowPollModal(false);
        setPollError('');
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
            BubblyAlert.alert("Error", res.msg);
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
            if (isScrolledUpRef.current) {
                setNewMessagesBelow(prev => prev + 1);
            }
        }

        hasSyncedMessagesRef.current = true;
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
        if ((res as any).conversationId && (res as any).conversationId !== conversationId) return;
        if (initialLoadTimerRef.current) {
            clearTimeout(initialLoadTimerRef.current);
            initialLoadTimerRef.current = null;
        }
        setIsInitialLoading(false);
        if (res.success) {
            const incomingPage = res.page ?? 0;
            hasSyncedMessagesRef.current = true;
            setHasMore(res.hasMore ?? false);
            setIsLoadingMore(false);
            isLoadingMoreRef.current = false;
            const rawMessages = Array.isArray(res.data) ? (res.data as MessageProps[]) : [];
            const pageMessages = rawMessages.map(msg => ({
                ...msg,
                conversationId: msg.conversationId || (conversationId as string),
            }));
            setMessageStatuses(prev => {
                const next = { ...prev };
                for (const msg of pageMessages) {
                    if (msg.sender?.id?.toString() === currentUserRef.current?.id?.toString() && !next[msg.id]) {
                        next[msg.id] = "sent";
                    }
                }
                return next;
            });

            if ((res as any).pinnedMessages) {
                setPinnedMessages((res as any).pinnedMessages);
            }

            if ((res as any).aroundMessageId) {
                setMessages(pageMessages);
                setPage(incomingPage);
                minLoadedPageRef.current = incomingPage;
                loadingNewerRef.current = false;
                if (pendingJumpIdRef.current) {
                    const jumpTarget = pendingJumpIdRef.current;
                    pendingJumpIdRef.current = null;
                    setTimeout(() => {
                        const jumpIdx = pageMessages.findIndex(m => m.id === jumpTarget);
                        if (jumpIdx !== -1) {
                            try {
                                flatListRef.current?.scrollToIndex({ index: jumpIdx, animated: true, viewPosition: 0.5 });
                            } catch {
                                flatListRef.current?.scrollToOffset({ offset: jumpIdx * 76, animated: true });
                            }
                        }
                    }, 220);
                }
            } else if (incomingPage === 0) {
                setMessages(prev => {
                    if (minLoadedPageRef.current > 0) {
                        const existingIds = new Set(prev.map(m => m.id));
                        const newer = pageMessages.filter(m => !existingIds.has(m.id));
                        return [...newer, ...prev];
                    }
                    const pageIds = new Set(pageMessages.map(m => m.id));
                    const pendingLocal = prev.filter(m => m.id?.startsWith("temp_") && !pageIds.has(m.id));
                    return [...pendingLocal, ...pageMessages];
                });
                if (minLoadedPageRef.current > 0) {
                    minLoadedPageRef.current = 0;
                    loadingNewerRef.current = false;
                } else {
                    setPage(0);
                    minLoadedPageRef.current = 0;
                }
            } else if (incomingPage < minLoadedPageRef.current) {
                setMessages(prev => {
                    const existingIds = new Set(prev.map(m => m.id));
                    const newer = pageMessages.filter(m => !existingIds.has(m.id));
                    return [...newer, ...prev];
                });
                minLoadedPageRef.current = incomingPage;
                loadingNewerRef.current = false;
            } else {
                setMessages(prev => {
                    const existingIds = new Set(prev.map(m => m.id));
                    const older = pageMessages.filter(m => !existingIds.has(m.id));
                    return [...prev, ...older];
                });
                setPage(incomingPage);
            }
        } else {
            setIsLoadingMore(false);
            isLoadingMoreRef.current = false;
            loadingNewerRef.current = false;
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
        const currentOther = otherParticipantRef.current;
        if (!isDirect || !currentOther) return;
        if (data.userId !== currentOther._id) return;
        setContactIsOnline(data.isOnline);
        setContactLastSeen(data.lastSeen);
    }, [isDirect]);

    const getUserStatusHandler = useCallback((res: ResponseProps) => {
        if (res.success) {
            setContactIsOnline(res.data.isOnline);
            setContactLastSeen(res.data.lastSeen);
            if (res.data.customStatus?.text || res.data.customStatus?.emoji) {
                setContactCustomStatus(res.data.customStatus);
            } else {
                setContactCustomStatus(null);
            }
        }
    }, []);

    // ── Rich Card & Feature Handlers (v4.0.1) ──
    const sendRichTextPayload = useCallback((textPayload: string, checklistObj?: ChecklistProps) => {
        if (!currentUser || !conversationId) return;
        if (isNotesToSelf) {
            const noteMsg: MessageProps = {
                id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                conversationId: conversationId as string,
                sender: { id: currentUser.id as string, name: currentUser.name || "You", avatar: currentUser.avatar || null },
                content: textPayload,
                type: checklistObj ? "checklist" : "text",
                checklist: checklistObj || null,
                reactions: [],
                createdAt: new Date().toISOString(),
                isSilent: isSilentSend,
            };
            setMessages(prev => {
                const updated = [noteMsg, ...prev];
                AsyncStorage.setItem(`@bubbly_notes_${conversationId}`, JSON.stringify(updated)).catch(() => {});
                return updated;
            });
            recordMessageSentActivity(conversationId as string);
            recordMessageSentActivity(conversationId as string);
            setIsSilentSend(false);
            return;
        }
        if (!isSocketConnected()) {
            BubblyAlert.alert("Offline", "Connect to the internet to send rich cards.");
            return;
        }
        const clientId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const optimisticCard: MessageProps = {
            id: clientId,
            conversationId: conversationId as string,
            sender: { id: currentUser.id as string, name: currentUser.name || "You", avatar: currentUser.avatar || null },
            content: textPayload,
            type: checklistObj ? "checklist" : "text",
            checklist: checklistObj || null,
            reactions: [],
            isSilent: isSilentSend,
            createdAt: new Date().toISOString(),
        };
        setMessages(prev => [optimisticCard, ...prev]);
        setMessageStatuses(prev => ({ ...prev, [clientId]: "sending" }));
        newMessage({
            conversationId,
            sender: { id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar },
            content: textPayload,
            type: "text",
            isSilent: isSilentSend,
            clientId,
        });
        recordMessageSentActivity(conversationId as string);
        setIsSilentSend(false);
    }, [currentUser, conversationId, isNotesToSelf, isSilentSend]);

    const handleCreateChecklist = useCallback((checklist: ChecklistProps) => {
        setShowChecklistModal(false);
        sendRichTextPayload(encodeChecklistFallback(checklist), checklist);
    }, [sendRichTextPayload]);

    const handleSendGame = useCallback((game: BubblyGamePayload) => {
        setShowGameModal(false);
        sendRichTextPayload(encodeGameCard(game));
    }, [sendRichTextPayload]);

    const handleReplayGame = useCallback((kind: BubblyGameKind) => {
        sendRichTextPayload(encodeGameCard(rollBubblyGame(kind)));
    }, [sendRichTextPayload]);

    const handleSendCountdown = useCallback((payload: BubblyCountdownPayload) => {
        setShowCountdownModal(false);
        sendRichTextPayload(encodeCountdownCard(payload));
    }, [sendRichTextPayload]);

    const handleSendSplitBill = useCallback((payload: BubblySplitPayload) => {
        setShowSplitModal(false);
        sendRichTextPayload(encodeSplitCard(payload));
    }, [sendRichTextPayload]);

    const handleSendDoodle = useCallback((payload: BubblyDoodlePayload) => {
        setShowDoodleModal(false);
        sendRichTextPayload(encodeDoodleCard(payload));
    }, [sendRichTextPayload]);

    const handleSendEvent = useCallback((payload: BubblyEventPayload) => {
        setShowEventModal(false);
        sendRichTextPayload(encodeEventCard(payload));
    }, [sendRichTextPayload]);

    const handleSendWyr = useCallback((payload: BubblyWyrPayload) => {
        setShowWyrModal(false);
        sendRichTextPayload(encodeWyrCard(payload));
    }, [sendRichTextPayload]);

    const handleToggleChecklistLocal = useCallback((messageId: string, itemId: string) => {
        if (!conversationId) return;
        setMessages(prev => {
            const updated = prev.map(m => {
                if (m.id !== messageId || !m.checklist) return m;
                return {
                    ...m,
                    checklist: {
                        ...m.checklist,
                        items: m.checklist.items.map(it =>
                            it.id === itemId ? { ...it, completed: !it.completed } : it
                        ),
                    },
                };
            });
            if (isNotesToSelf) {
                AsyncStorage.setItem(`@bubbly_notes_${conversationId}`, JSON.stringify(updated)).catch(() => {});
            }
            return updated;
        });
    }, [conversationId, isNotesToSelf]);

    const handleApplyFormat = useCallback((fmt: "bold" | "italic" | "strike" | "code" | "spoiler" | "quote" | "bullet" | "stamp") => {
        const { start, end } = composerSelectionRef.current;
        const hasSelection = end > start && end <= message.length;

        if (fmt === "stamp") {
            const stamp = moment().format("MMM D, h:mm A");
            if (hasSelection) {
                setMessage(`${message.slice(0, start)}${stamp}${message.slice(end)}`);
            } else if (!message.trim()) {
                setMessage(`📅 ${stamp} — `);
            } else {
                setMessage(`${message}${message.endsWith(" ") ? "" : " "}${stamp}`);
            }
            return;
        }
        if (fmt === "bullet") {
            if (hasSelection) {
                const selected = message.slice(start, end);
                const bulleted = selected.split('\n').map(l => (l.startsWith('• ') ? l : `• ${l}`)).join('\n');
                setMessage(`${message.slice(0, start)}${bulleted}${message.slice(end)}`);
            } else if (!message.trim()) {
                setMessage("• ");
            } else {
                setMessage(`${message}\n• `);
            }
            return;
        }
        if (fmt === "quote") {
            if (hasSelection) {
                const selected = message.slice(start, end);
                const quoted = selected.split('\n').map(l => (l.startsWith('> ') ? l : `> ${l}`)).join('\n');
                setMessage(`${message.slice(0, start)}${quoted}${message.slice(end)}`);
                return;
            }
            setMessage(message.startsWith("> ") ? message.slice(2) : `> ${message}`);
            return;
        }
        const wrap = fmt === "bold" ? "*" : fmt === "italic" ? "_" : fmt === "strike" ? "~" : fmt === "spoiler" ? "||" : "`";
        const placeholder = fmt === "spoiler" ? "secret" : "text";
        if (hasSelection) {
            const selected = message.slice(start, end);
            setMessage(`${message.slice(0, start)}${wrap}${selected}${wrap}${message.slice(end)}`);
            return;
        }
        if (!message.trim()) {
            setMessage(`${wrap}${placeholder}${wrap}`);
        } else if (message.endsWith(" ")) {
            setMessage(`${message}${wrap}${placeholder}${wrap}`);
        } else {
            setMessage(`${wrap}${message}${wrap}`);
        }
    }, [message]);

    const quickReplyCandidates = useMemo(() => {
        if (!message.startsWith("/")) return [];
        const prefix = message.slice(1).toLowerCase();
        return quickReplies.filter((q) => q.trigger.toLowerCase().startsWith(prefix));
    }, [message, quickReplies]);

    const handleSelectQuickReply = useCallback((tpl: QuickReplyTemplate) => {
        hapticTap("medium");
        setMessage(tpl.text);
    }, []);

    const handleToggleSelectMsg = useCallback((msgId: string) => {
        hapticTap("medium");
        setSelectedMsgIds((prev) =>
            prev.includes(msgId) ? prev.filter((id) => id !== msgId) : [...prev, msgId]
        );
    }, []);

    const handleEnterSelectionMode = useCallback((msgId: string) => {
        hapticTap("rigid");
        setSelectedMsgIds([msgId]);
    }, []);

    const handleBulkCopy = useCallback(async () => {
        const chosen = messages.filter((m) => selectedMsgIds.includes(m.id)).reverse();
        const combined = chosen
            .map((m) => `${m.sender?.name || "User"}: ${formatRichPreviewText(m.content) || "[Media]"}`)
            .join("\n");
        if (combined) {
            await Clipboard.setStringAsync(combined).catch(() => {});
            hapticTap("success");
            BubblyAlert.alert("Copied", `${chosen.length} message(s) copied to clipboard.`);
        }
        setSelectedMsgIds([]);
    }, [messages, selectedMsgIds]);

    const handleBulkStar = useCallback(() => {
        if (isNotesToSelf) {
            BubblyAlert.alert("Notes to Self", "Notes are already saved locally on your device.");
            setSelectedMsgIds([]);
            return;
        }
        selectedMsgIds.forEach((id) => {
            toggleStarMessage({ messageId: id, conversationId: conversationId as string });
        });
        hapticTap("success");
        setSelectedMsgIds([]);
        BubblyAlert.alert("Updated ⭐", `${selectedMsgIds.length} message(s) toggled in Starred.`);
    }, [selectedMsgIds, conversationId, isNotesToSelf]);

    const handleBulkDelete = useCallback(() => {
        const ownIds = selectedMsgIds.filter((id) => {
            const msg = messages.find((m) => m.id === id);
            return isNotesToSelf || msg?.sender?.id === currentUser?.id;
        });
        if (ownIds.length === 0) {
            hapticTap("error");
            BubblyAlert.alert("Delete", "You can only delete your own messages.");
            return;
        }
        hapticTap("warning");
        BubblyAlert.alert(
            "Delete Selected Messages",
            `Delete ${ownIds.length} message(s)?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => {
                        hapticTap("heavy");
                        if (isNotesToSelf) {
                            setMessages(prev => {
                                const updated = prev.map(m =>
                                    ownIds.includes(m.id) ? { ...m, isDeleted: true, content: "", attachement: null, voiceUrl: null } : m
                                );
                                AsyncStorage.setItem(`@bubbly_notes_${conversationId}`, JSON.stringify(updated)).catch(() => {});
                                return updated;
                            });
                        } else {
                            ownIds.forEach((id) => deleteMessage({ messageId: id, conversationId: conversationId as string }));
                        }
                        setSelectedMsgIds([]);
                    },
                },
            ]
        );
    }, [selectedMsgIds, messages, isNotesToSelf, currentUser?.id, conversationId]);

    // ─────────────────────────────────────────────
    // LOAD MORE
    // ─────────────────────────────────────────────
    const handleLoadMore = useCallback(() => {
        if (messages.length === 0 || !isSocketConnected() || isLoadingMoreRef.current || !hasMore) return;
        isLoadingMoreRef.current = true;
        setIsLoadingMore(true);
        getMessages({ conversationId, page: page + 1, limit: 30 });
    }, [messages.length, page, hasMore, conversationId]);

    // ─────────────────────────────────────────────
    // REACTION
    // ─────────────────────────────────────────────
    const handleReaction = useCallback((messageId: string, emoji: string) => {
        if (!currentUser) return;
        if (isNotesToSelf) {
            setMessages(prev => {
                const updated = prev.map(m => {
                    if (m.id !== messageId) return m;
                    const existing = (m.reactions || []).filter(r => r.userId !== currentUser.id);
                    const hadSame = (m.reactions || []).some(r => r.userId === currentUser.id && r.emoji === emoji);
                    return {
                        ...m,
                        reactions: hadSame ? existing : [...existing, { emoji, userId: currentUser.id!, userName: currentUser.name || "You" }],
                    };
                });
                AsyncStorage.setItem(`@bubbly_notes_${conversationId}`, JSON.stringify(updated)).catch(() => {});
                return updated;
            });
            return;
        }
        reactToMessage({ messageId, conversationId, emoji, userId: currentUser.id, userName: currentUser.name });
    }, [currentUser, conversationId, isNotesToSelf]);

    // ─────────────────────────────────────────────
    // TYPING & DRAFTS (Debounced for 0-lag typing)
    // ─────────────────────────────────────────────
    const handleMessageChange = useCallback((text: string) => {
        setMessage(text);
        if (conversationId) {
            if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
            draftSaveTimerRef.current = setTimeout(() => {
                if (text.trim()) {
                    AsyncStorage.setItem(`@bubbly_draft_${conversationId}`, text).catch(() => {});
                } else {
                    AsyncStorage.removeItem(`@bubbly_draft_${conversationId}`).catch(() => {});
                }
            }, 320);
        }
        if (!currentUser || !conversationId || isNotesToSelf || !isSocketConnected()) return;
        if (!isTypingRef.current) {
            isTypingRef.current = true;
            emitTyping({ conversationId: conversationId as string, senderId: currentUser.id as string, senderName: currentUser.name });
        }
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            isTypingRef.current = false;
            if (isSocketConnected()) {
                emitStopTyping({ conversationId: conversationId as string, senderId: currentUser.id as string });
            }
        }, 2000);
    }, [conversationId, currentUser, isNotesToSelf]);

    // ─────────────────────────────────────────────
    // REPLY
    // ─────────────────────────────────────────────
    const handleReply = useCallback((item: MessageProps) => {
        setReplyTo({ id: item.id, content: item.content, senderName: item.sender?.name || "User", voiceUrl: item.voiceUrl || null });
    }, []);

    const handleCancelReply = () => setReplyTo(null);

    // ─────────────────────────────────────────────
    // VOICE RECORDING & REVIEW (V3.1.2)
    // ─────────────────────────────────────────────
    const startRecording = async () => {
        if (isStartingRecordingRef.current || recordingRef.current) return;
        isStartingRecordingRef.current = true;
        try {
            const { granted } = await AudioModule.requestRecordingPermissionsAsync();
            if (!granted || !isMountedRef.current) {
                if (!granted) BubblyAlert.alert("Permission needed", "Microphone permission is required.");
                return;
            }
            await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
            await audioRecorder.prepareToRecordAsync();
            if (!isMountedRef.current) return;
            audioRecorder.record();
            hapticTap("rigid");
            recordingRef.current = audioRecorder;
            setIsRecording(true);
            recordingDurationRef.current = 0;
            setRecordingDuration(0);
            micScale.value = withSpring(1.3);
            if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = setInterval(() => {
                const next = recordingDurationRef.current + 1;
                recordingDurationRef.current = next;
                setRecordingDuration(next);
                if (next >= 120) {
                    stopRecordingRef.current?.(false);
                }
            }, 1000);
        } catch (error) {
            console.log("startRecording error:", error);
            BubblyAlert.alert("Error", "Could not start recording");
        } finally {
            isStartingRecordingRef.current = false;
        }
    };

    const pauseForReview = async () => {
        hapticTap("medium");
        try {
            if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
            micScale.value = withSpring(1);
            if (!recordingRef.current) { setIsRecording(false); return; }
            const recording = recordingRef.current;
            recordingRef.current = null;
            await recording.stop();
            await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
            setIsRecording(false);
            const finalDuration = recordingDurationRef.current;
            recordingDurationRef.current = 0;
            setRecordingDuration(0);
            if (finalDuration < 1 || !recording.uri) {
                return;
            }
            setVoiceReview({ uri: recording.uri, duration: finalDuration });
        } catch (error) {
            console.log("pauseForReview error:", error);
            setIsRecording(false);
            recordingDurationRef.current = 0;
            setRecordingDuration(0);
        }
    };

    const stopRecording = async (cancel = false) => {
        hapticTap(cancel ? "warning" : "celebration");
        try {
            if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
            micScale.value = withSpring(1);
            if (!recordingRef.current) { setIsRecording(false); return; }
            const recording = recordingRef.current;
            recordingRef.current = null;
            await recording.stop();
            await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
            setIsRecording(false);
            const duration = recordingDurationRef.current;
            recordingDurationRef.current = 0;
            setRecordingDuration(0);
            if (cancel || duration < 1) { return; }
            const uri = recording.uri;
            if (!uri) return;
            await sendVoiceMessage(uri, duration);
        } catch (error) {
            console.log("stopRecording error:", error);
            setIsRecording(false);
            recordingDurationRef.current = 0;
            setRecordingDuration(0);
        }
    };

    const stopRecordingRef = useRef(stopRecording);
    stopRecordingRef.current = stopRecording;

    const cancelRecording = async () => { await stopRecording(true); };

    const sendVoiceMessage = async (uri: string, duration: number) => {
        if (!currentUser) return;
        if (isNotesToSelf) {
            const noteMsg: MessageProps = {
                id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                conversationId: conversationId as string,
                sender: { id: currentUser.id as string, name: currentUser.name || "You", avatar: currentUser.avatar || null },
                content: "",
                attachement: null,
                attachmentMeta: null,
                type: 'voice',
                voiceUrl: uri,
                voiceDuration: duration,
                replyTo: replyTo || null,
                reactions: [],
                isSilent: isSilentSend,
                createdAt: new Date().toISOString(),
            };
            setMessages(prev => {
                const updated = [noteMsg, ...prev];
                AsyncStorage.setItem(`@bubbly_notes_${conversationId}`, JSON.stringify(updated)).catch(() => {});
                return updated;
            });
            recordMessageSentActivity(conversationId as string);
            setReplyTo(null);
            setIsSilentSend(false);
            return;
        }
        if (!isSocketConnected()) {
            BubblyAlert.alert("Offline", "Connect to the internet to send voice messages.");
            return;
        }
        setIsUploadingVoice(true);
        try {
            const uploadResult = await uploadAudioToCloudinary(uri, "voice-messages");
            if (!uploadResult.success || !uploadResult.data) { BubblyAlert.alert("Error", "Could not upload voice message"); return; }
            newMessage({ conversationId, sender: { id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar }, content: "", attachement: null, replyTo: replyTo?.id || null, voiceUrl: uploadResult.data, voiceDuration: duration, isSilent: isSilentSend });
            recordMessageSentActivity(conversationId as string);
            setReplyTo(null);
            setIsSilentSend(false);
        } catch { BubblyAlert.alert("Error", "Failed to send voice message"); }
        finally { setIsUploadingVoice(false); }
    };

    // ─────────────────────────────────────────────
    // IMAGE & GIF PICKER
    // ─────────────────────────────────────────────
    const onPickImage = async () => {
        setShowAttachOptions(false);
        try {
            const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: isHd ? 1.0 : 0.8 });
            if (!result.canceled && result.assets?.length) {
                const asset = result.assets[0];
                const isGifAsset = asset.mimeType === 'image/gif' || asset.uri.split('?')[0].toLowerCase().endsWith('.gif');
                setSelectedFile({
                    uri: asset.uri,
                    name: asset.uri.split('/').pop() || (isGifAsset ? 'animated.gif' : 'image.jpg'),
                    mimeType: isGifAsset ? 'image/gif' : (asset.mimeType || 'image/jpeg'),
                    size: asset.fileSize || 0,
                    isImage: true,
                });
            }
        } catch {
            BubblyAlert.alert("Error", "Could not open image library.");
        }
    };

    const handleSendGif = async (selection: GifSelection) => {
        if (!currentUser || !conversationId) return;
        setShowGifModal(false);
        setShowAttachOptions(false);

        if (isNotesToSelf) {
            const localOrRemoteUrl = selection.url || selection.localUri || "";
            if (!localOrRemoteUrl) return;
            const noteMsg: MessageProps = {
                id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                conversationId: conversationId as string,
                sender: { id: currentUser.id as string, name: currentUser.name || "You", avatar: currentUser.avatar || null },
                content: "",
                attachement: localOrRemoteUrl,
                attachmentMeta: {
                    url: localOrRemoteUrl,
                    name: selection.name || "animated.gif",
                    mimeType: "image/gif",
                    size: selection.size || 0,
                    resourceType: "image",
                },
                type: 'image',
                replyTo: replyTo || null,
                reactions: [],
                isSilent: isSilentSend,
                createdAt: new Date().toISOString(),
            };
            setMessages(prev => {
                const updated = [noteMsg, ...prev];
                AsyncStorage.setItem(`@bubbly_notes_${conversationId}`, JSON.stringify(updated)).catch(() => {});
                return updated;
            });
            recordMessageSentActivity(conversationId as string);
            setReplyTo(null);
            setIsSilentSend(false);
            return;
        }

        if (!isOnlineNetwork || !isSocketConnected()) {
            BubblyAlert.alert("Offline", "Connect to the internet to send GIFs.");
            return;
        }

        try {
            let resolvedUrl = selection.url || "";
            if (selection.localUri && !resolvedUrl) {
                setLoading(true);
                const uploadResult = await uploadFileToCloudinary(
                    { uri: selection.localUri, mimeType: "image/gif", name: selection.name || "animated.gif" },
                    "message-attachements"
                );
                if (!uploadResult.success || !uploadResult.data) {
                    BubblyAlert.alert("GIF Error", "Could not upload the selected GIF.");
                    return;
                }
                resolvedUrl = uploadResult.data;
            }
            if (!resolvedUrl) return;

            const clientId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
            const currentReply = replyTo;
            const currentSilent = isSilentSend;
            const gifMeta = {
                url: resolvedUrl,
                name: selection.name || "animated.gif",
                mimeType: "image/gif",
                size: selection.size || 0,
                resourceType: "image" as const,
            };
            const optimisticGifMsg: MessageProps = {
                id: clientId,
                conversationId: conversationId as string,
                sender: { id: currentUser.id as string, name: currentUser.name || "You", avatar: currentUser.avatar || null },
                content: "",
                attachement: resolvedUrl,
                attachmentMeta: gifMeta,
                type: 'image',
                replyTo: currentReply || null,
                reactions: [],
                isSilent: currentSilent,
                createdAt: new Date().toISOString(),
            };

            setMessages(prev => [optimisticGifMsg, ...prev]);
            setMessageStatuses(prev => ({ ...prev, [clientId]: "sending" }));
            setReplyTo(null);
            setIsSilentSend(false);

            newMessage({
                conversationId,
                sender: { id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar },
                content: "",
                attachement: resolvedUrl,
                attachmentMeta: gifMeta,
                type: 'image',
                replyTo: currentReply?.id || null,
                isSilent: currentSilent,
                clientId,
            });
            recordMessageSentActivity(conversationId as string);
        } catch {
            BubblyAlert.alert("GIF Error", "Failed to send GIF.");
        } finally {
            setLoading(false);
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
                if (asset.size && asset.size > 25 * 1024 * 1024) {
                    BubblyAlert.alert("File too large", "Please select a file smaller than 25MB.");
                    return;
                }
                const fileName = asset.name || 'file';
                const ext = fileName.split('.').pop()?.toLowerCase() || '';
                const extMimeMap: Record<string, string> = {
                    pdf: 'application/pdf',
                    doc: 'application/msword',
                    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    xls: 'application/vnd.ms-excel',
                    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    ppt: 'application/vnd.ms-powerpoint',
                    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                    txt: 'text/plain',
                    zip: 'application/zip',
                    mp4: 'video/mp4',
                    mov: 'video/quicktime',
                    webm: 'video/webm',
                    jpg: 'image/jpeg',
                    jpeg: 'image/jpeg',
                    png: 'image/png',
                    gif: 'image/gif',
                    webp: 'image/webp',
                };
                const mimeType = (asset.mimeType && asset.mimeType !== 'application/octet-stream')
                    ? asset.mimeType
                    : (extMimeMap[ext] || '');
                if (!mimeType) {
                    BubblyAlert.alert("Unsupported File Type", "Supported formats: PDF, Word, Excel, PowerPoint, TXT, ZIP, Images, and Videos.");
                    return;
                }
                setSelectedFile({ uri: asset.uri, name: fileName, mimeType, size: asset.size || 0, isImage: mimeType.startsWith('image/') });
            }
        } catch { BubblyAlert.alert("Error", "Could not pick file"); }
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

        // ── Notes to Self (Local Encrypted/Persistent Notebook) ──
        if (isNotesToSelf) {
            const noteMsg: MessageProps = {
                id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                conversationId: conversationId as string,
                sender: { id: currentUser.id as string, name: currentUser.name || "You", avatar: currentUser.avatar || null },
                content: message.trim(),
                attachement: selectedFile?.uri || null,
                attachmentMeta: selectedFile && !selectedFile.isImage
                    ? {
                        url: selectedFile.uri,
                        name: selectedFile.name,
                        size: selectedFile.size,
                        mimeType: selectedFile.mimeType,
                        resourceType: "raw",
                    }
                    : null,
                type: selectedFile ? (selectedFile.isImage ? 'image' : 'file') : 'text',
                replyTo: replyTo || null,
                reactions: [],
                isSilent: isSilentSend,
                createdAt: new Date().toISOString(),
            };
            setMessages(prev => {
                const updated = [noteMsg, ...prev];
                AsyncStorage.setItem(`@bubbly_notes_${conversationId}`, JSON.stringify(updated)).catch(() => {});
                return updated;
            });
            recordMessageSentActivity(conversationId as string);
            if (draftSaveTimerRef.current) {
                clearTimeout(draftSaveTimerRef.current);
                draftSaveTimerRef.current = null;
            }
            if (conversationId) {
                AsyncStorage.removeItem(`@bubbly_draft_${conversationId}`).catch(() => {});
            }
            setMessage("");
            setSelectedFile(null);
            setReplyTo(null);
            setIsSilentSend(false);
            return;
        }

        if (selectedFile && (!isOnlineNetwork || !isSocketConnected())) {
            BubblyAlert.alert("Offline", "Connect to the internet to send photos or files.");
            return;
        }

        // ── Offline Message Outbox (Feature 1) ──
        if (!selectedFile && (!isOnlineNetwork || !isSocketConnected())) {
            if (draftSaveTimerRef.current) {
                clearTimeout(draftSaveTimerRef.current);
                draftSaveTimerRef.current = null;
            }
            const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
            const offlineMsg: MessageProps = {
                id: tempId,
                conversationId: conversationId as string,
                sender: { id: currentUser.id as string, name: currentUser.name || "You", avatar: currentUser.avatar || null },
                content: message.trim(),
                attachement: null,
                attachmentMeta: null,
                type: 'text',
                replyTo: replyTo || null,
                reactions: [],
                isSilent: isSilentSend,
                createdAt: new Date().toISOString(),
            };

            setMessages(prev => [offlineMsg, ...prev]);
            setMessageStatuses(prev => ({ ...prev, [tempId]: "sending" }));
            if (isSilentSend) {
                markLocalSilentMessage(tempId);
            }

            try {
                const key = `@bubbly_outbox_${conversationId}`;
                const raw = await AsyncStorage.getItem(key);
                const queue = raw ? JSON.parse(raw) : [];
                queue.push({
                    conversationId,
                    sender: { id: currentUser.id as string, name: currentUser.name, avatar: currentUser.avatar },
                    content: message.trim(),
                    attachement: null,
                    attachmentMeta: null,
                    type: 'text',
                    replyTo: replyTo?.id || null,
                    isSilent: isSilentSend,
                    tempId,
                });
                await AsyncStorage.setItem(key, JSON.stringify(queue));
                setOutboxCount(queue.length);
            } catch (e) {
                console.log("Failed to queue offline message:", e);
            }

            if (conversationId) {
                AsyncStorage.removeItem(`@bubbly_draft_${conversationId}`).catch(() => {});
            }
            setMessage("");
            setReplyTo(null);
            setIsSilentSend(false);
            return;
        }

        // ── Instant Optimistic Text Send (0ms UI latency) ──
        if (!selectedFile) {
            if (draftSaveTimerRef.current) {
                clearTimeout(draftSaveTimerRef.current);
                draftSaveTimerRef.current = null;
            }
            const cleanText = message.trim();
            const currentReply = replyTo;
            const currentSilent = isSilentSend;
            const clientId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
            const optimisticMsg: MessageProps = {
                id: clientId,
                conversationId: conversationId as string,
                sender: { id: currentUser.id as string, name: currentUser.name || "You", avatar: currentUser.avatar || null },
                content: cleanText,
                attachement: null,
                attachmentMeta: null,
                type: 'text',
                replyTo: currentReply || null,
                reactions: [],
                isSilent: currentSilent,
                createdAt: new Date().toISOString(),
            };

            setMessages(prev => [optimisticMsg, ...prev]);
            setMessageStatuses(prev => ({ ...prev, [clientId]: "sending" }));
            if (currentSilent) {
                markLocalSilentMessage(clientId);
            }
            if (conversationId) {
                AsyncStorage.removeItem(`@bubbly_draft_${conversationId}`).catch(() => {});
            }
            setMessage("");
            setReplyTo(null);
            setIsSilentSend(false);

            newMessage({
                conversationId,
                sender: { id: currentUser?.id, name: currentUser.name, avatar: currentUser.avatar },
                content: cleanText,
                attachement: null,
                attachmentMeta: null,
                type: 'text',
                replyTo: currentReply?.id || null,
                isSilent: currentSilent,
                clientId,
            });
            recordMessageSentActivity(conversationId as string);
            return;
        }

        setLoading(true);
        try {
            let attachement = null;
            let attachmentMeta = null;
            let messageType = 'text';

            if (selectedFile) {
                if (selectedFile.isImage) {
                    const uploadResult = await uploadFileToCloudinary(
                        { uri: selectedFile.uri, mimeType: selectedFile.mimeType, name: selectedFile.name },
                        "message-attachements"
                    );
                    if (!uploadResult.success) { setLoading(false); BubblyAlert.alert("Error", "Could not send the image!"); return; }
                    attachement = uploadResult.data;
                    attachmentMeta = { url: uploadResult.data, name: selectedFile.name, size: selectedFile.size, mimeType: selectedFile.mimeType, isViewOnce, isHd };
                    messageType = 'image';
                } else {
                    const uploadResult = await uploadDocumentToCloudinary(selectedFile.uri, selectedFile.mimeType, selectedFile.name, "chat-files");
                    if (!uploadResult.success || !uploadResult.data) { setLoading(false); BubblyAlert.alert("Error", "Could not send the file!"); return; }
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
                isSilent: isSilentSend,
                isViewOnce: selectedFile?.isImage ? isViewOnce : false,
            });
            recordMessageSentActivity(conversationId as string);
            if (draftSaveTimerRef.current) {
                clearTimeout(draftSaveTimerRef.current);
                draftSaveTimerRef.current = null;
            }
            if (conversationId) {
                AsyncStorage.removeItem(`@bubbly_draft_${conversationId}`).catch(() => {});
            }
            setMessage(""); setSelectedFile(null); setReplyTo(null); setIsViewOnce(false); setIsHd(false); setIsSilentSend(false);
        } catch { BubblyAlert.alert("Error", "Failed to send message"); }
        finally { setLoading(false); }
    };

    // ─────────────────────────────────────────────
    // DATE SEPARATORS
    // ─────────────────────────────────────────────
    const mediaMessages = useMemo(() => {
        return messages.filter(m => !m.isDeleted && !m.isViewOnce && (!!m.attachement || !!m.attachmentMeta));
    }, [messages]);

    const messagesWithSeparators = useMemo((): MessageListItem[] => {
        if (messages.length === 0) return [];

        const result: MessageListItem[] = [];
        for (let i = messages.length - 1; i >= 0; i--) {
            const msg = messages[i];
            const msgDateStr = getLocalDateKey(msg.createdAt);
            const prevChronological = i < messages.length - 1 ? messages[i + 1] : null;
            const prevDateStr = prevChronological ? getLocalDateKey(prevChronological.createdAt) : '';

            if (msgDateStr !== prevDateStr) {
                result.push({
                    id: `separator-${msgDateStr}`,
                    type: 'separator',
                    date: msg.createdAt,
                });
            }

            result.push({
                id: msg.id,
                type: 'message',
                message: msg,
            });
        }

        return result.reverse();
    }, [messages]);

    const handleJumpToMessage = (messageId: string) => {
        const idx = messagesWithSeparators.findIndex(
            (m) => m.type === 'message' && m.message.id === messageId
        );
        if (idx >= 0 && idx < messagesWithSeparators.length) {
            try {
                flatListRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.5 });
            } catch {
                try {
                    flatListRef.current?.scrollToOffset({ offset: idx * 76, animated: true });
                } catch {}
            }
        } else if (!isNotesToSelf && isSocketConnected()) {
            pendingJumpIdRef.current = messageId;
            getMessages({ conversationId, page: 0, limit: 30, aroundMessageId: messageId });
        }
    };

    const handleLocalDelete = useCallback((messageId: string) => {
        if (!conversationId) return;
        setMessages(prev => {
            const updated = prev.map(m =>
                m.id === messageId ? { ...m, isDeleted: true, content: "", attachement: null, attachmentMeta: null, voiceUrl: null } : m
            );
            AsyncStorage.setItem(`@bubbly_notes_${conversationId}`, JSON.stringify(updated)).catch(() => {});
            return updated;
        });
    }, [conversationId]);

    const handleLocalEdit = useCallback((messageId: string, newContent: string) => {
        if (!conversationId) return;
        setMessages(prev => {
            const updated = prev.map(m =>
                m.id === messageId ? { ...m, content: newContent, isEdited: true } : m
            );
            AsyncStorage.setItem(`@bubbly_notes_${conversationId}`, JSON.stringify(updated)).catch(() => {});
            return updated;
        });
    }, [conversationId]);

    const handlePin = useCallback((messageId: string) => {
        if (isNotesToSelf) return;
        pinMessage({ conversationId: conversationId as string, messageId });
    }, [isNotesToSelf, conversationId]);

    const handleUnpin = useCallback((messageId: string) => {
        if (isNotesToSelf) return;
        unpinMessage({ conversationId: conversationId as string, messageId });
    }, [isNotesToSelf, conversationId]);

    const handleToggleStar = useCallback((messageId: string) => {
        if (isNotesToSelf) return;
        toggleStarMessage({ messageId, conversationId: conversationId as string });
    }, [isNotesToSelf, conversationId]);

    const handleOpenForward = useCallback((msg: MessageProps) => {
        setForwardingMessage(msg);
        if (isSocketConnected()) {
            if (pendingForwardListRef.current) {
                getConversations(pendingForwardListRef.current, true);
            }
            const onForwardList = (res: any) => {
                getConversations(onForwardList, true);
                pendingForwardListRef.current = null;
                if (res?.success && Array.isArray(res.data)) {
                    setRecentConversations(res.data.filter((c: any) => c._id !== conversationId));
                }
            };
            pendingForwardListRef.current = onForwardList;
            getConversations(onForwardList);
            getConversations(null);
        }
        setForwardModalVisible(true);
    }, [conversationId]);

    const handleSendForward = (targetConvIds: string[]) => {
        if (!forwardingMessage || !targetConvIds || targetConvIds.length === 0) return;
        forwardMessage({ messageId: forwardingMessage.id, targetConversationIds: targetConvIds });
        setForwardModalVisible(false);
        setForwardingMessage(null);
        setTimeout(() => {
            BubblyAlert.alert(
                "Forwarded 🚀",
                `Message forwarded to ${targetConvIds.length} ${targetConvIds.length === 1 ? 'chat' : 'chats'} successfully!`
            );
        }, 90);
    };

    // ── Export Chat History (Feature 1) ──
    const handleExportChat = () => {
        if (messages.length === 0) {
            BubblyAlert.alert("Export Chat", "No messages to export yet.");
            return;
        }
        BubblyAlert.alert(
            "Export Chat History",
            "Choose export format:",
            [
                {
                    text: "Text File (.txt) 📄",
                    onPress: async () => {
                        const lines = [...messages].reverse().map(m => {
                            const time = moment(m.createdAt).format('YYYY-MM-DD HH:mm');
                            const sender = m.sender?.name || (m.sender?.id === currentUser?.id ? "You" : "User");
                            const content = formatRichPreviewText(m.content) || (m.type === 'image' ? '[Photo]' : m.type === 'voice' ? '[Voice Note]' : '[Attachment]');
                            return `[${time}] ${sender}: ${content}`;
                        });
                        const chatText = `--- Bubbly Chat Export: ${conversationName} ---\nExported on: ${moment().format('LLL')}\nTotal Messages: ${messages.length}\n\n` + lines.join('\n');
                        try {
                            const res = await Share.share({
                                title: `Chat History - ${conversationName}`,
                                message: chatText,
                            });
                            if (res.action === Share.dismissedAction) {
                                await Clipboard.setStringAsync(chatText).catch(() => {});
                            }
                        } catch (e) {
                            await Clipboard.setStringAsync(chatText).catch(() => {});
                            BubblyAlert.alert("Copied to Clipboard", "Chat export copied to clipboard.");
                        }
                    }
                },
                {
                    text: "JSON (.json) 📦",
                    onPress: async () => {
                        const exportData = {
                            conversationId,
                            chatName: conversationName,
                            exportedAt: new Date().toISOString(),
                            totalMessages: messages.length,
                            messages: [...messages].reverse().map(m => ({
                                id: m.id,
                                sender: m.sender?.name || m.sender?.id,
                                content: formatRichPreviewText(m.content),
                                type: m.type,
                                createdAt: m.createdAt,
                            })),
                        };
                        const jsonStr = JSON.stringify(exportData, null, 2);
                        try {
                            await Share.share({
                                title: `Chat Export JSON - ${conversationName}`,
                                message: jsonStr,
                            });
                        } catch (e) {
                            await Clipboard.setStringAsync(jsonStr).catch(() => {});
                            BubblyAlert.alert("Copied to Clipboard", "JSON chat export copied to clipboard.");
                        }
                    }
                },
                { text: "Cancel", style: "cancel" }
            ]
        );
    };

    const handleMuteOptions = () => {
        if (isNotesToSelf) return;
        BubblyAlert.alert(
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

    const handleLockCurrentChat = async () => {
        const lockedKey = currentUser?.id ? `@bubbly_locked_chats_${currentUser.id}` : '@bubbly_locked_chats';
        try {
            const stored = await AsyncStorage.getItem(lockedKey);
            let list: string[] = [];
            if (stored) {
                try { list = JSON.parse(stored); } catch (_) {}
            }
            if (!list.includes(conversationId as string)) {
                list.push(conversationId as string);
                await AsyncStorage.setItem(lockedKey, JSON.stringify(list));
            }
            BubblyAlert.alert(
                "Chat Locked",
                "This conversation is now hidden from the main chats list. You can view it anytime in your Secret Chat Vault.",
                [
                    { text: "Stay Here", style: "cancel" },
                    { text: "Go to Vault", onPress: () => router.push("/(main)/vault") },
                ]
            );
        } catch (_) {
            BubblyAlert.alert("Error", "Could not lock chat");
        }
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
                text: "Shared Media & Docs",
                onPress: () => {
                    router.push({
                        pathname: "/(main)/sharedMedia",
                        params: {
                            conversationId: conversationId as string,
                            name: (isDirect ? otherParticipant?.name : name) || "Chat",
                        },
                    });
                },
            },
            {
                text: "Lock Chat (Move to Vault)",
                onPress: handleLockCurrentChat,
            },
            {
                text: "Export Chat History 📤",
                onPress: handleExportChat,
            },
            {
                text: "Chat Insights 📊",
                onPress: () => setShowInsightsModal(true),
            },
            {
                text: "Chat Scratchpad 📝",
                onPress: () => setShowScratchpadModal(true),
            },
            {
                text: "Quick Reply Templates ⚡",
                onPress: () => setShowQuickRepliesMgr(true),
            },
            {
                text: "Select Multiple Messages ☑️",
                onPress: () => {
                    if (messages.length > 0) setSelectedMsgIds([messages[0].id]);
                    else BubblyAlert.alert("Select", "No messages to select yet.");
                },
            },
            {
                text: "Chat Wallpaper & Theme",
                onPress: () => setShowThemeModal(true),
            },
        ];
        if (type !== 'group' || isGroupAdmin) {
            options.push({
                text: disappearingSeconds > 0
                    ? `Disappearing Messages (${disappearingSeconds === 86400 ? '24h' : disappearingSeconds === 604800 ? '7d' : '90d'} ⏱️)`
                    : "Disappearing Messages",
                onPress: () => setShowDisappearingModal(true),
            });
        }
        options.push({ text: "Mute Notifications", onPress: handleMuteOptions });
        if (type === 'group') {
            options.push({ text: "Group Members & Info", onPress: () => setGroupInfoVisible(true) });
        }
        options.push({ text: "Cancel", style: "cancel" });

        BubblyAlert.alert("Chat Options", undefined, options);
    };

    const handlePromoteAdmin = (targetUserId: string) => {
        setGroupAdmin({ conversationId: conversationId as string, targetUserId, promote: true });
    };

    const handleDemoteAdmin = (targetUserId: string) => {
        setGroupAdmin({ conversationId: conversationId as string, targetUserId, promote: false });
    };

    const handleRemoveMember = (targetUserId: string) => {
        setGroupInfoVisible(false);
        setTimeout(() => {
            BubblyAlert.alert(
                "Remove Member",
                "Remove this member from the group?",
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Remove",
                        style: "destructive",
                        onPress: () => removeGroupMember({ conversationId: conversationId as string, targetUserId }),
                    },
                ]
            );
        }, 90);
    };

    const handleLeaveGroup = () => {
        setGroupInfoVisible(false);
        setTimeout(() => {
            BubblyAlert.alert(
                "Leave Group",
                "Are you sure you want to leave this group?",
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Leave",
                        style: "destructive",
                        onPress: () => {
                            leaveGroup({ conversationId: conversationId as string });
                            router.replace("/(main)/home");
                        },
                    },
                ]
            );
        }, 90);
    };

    const searchMatches = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        if (!q && searchFilterKind === "all") return [];
        const matches: number[] = [];
        messagesWithSeparators.forEach((item, index) => {
            if (item.type !== 'message') return;
            const msg = item.message;
            if (msg.isDeleted) return;
            if (searchFilterKind === "media") {
                if (!msg.attachement && !msg.attachmentMeta) return;
            } else if (searchFilterKind === "links") {
                if (!msg.content || !/(https?:\/\/[^\s]+|www\.[^\s]+)/i.test(msg.content)) return;
            } else if (searchFilterKind === "voice") {
                if (!msg.voiceUrl && msg.type !== "voice") return;
            } else if (searchFilterKind === "cards") {
                if (msg.type !== "poll" && msg.type !== "checklist" && !parseBubblyCard(msg.content)) return;
            }
            if (q && !(msg.content || "").toLowerCase().includes(q) && !(msg.attachmentMeta?.name || "").toLowerCase().includes(q)) {
                return;
            }
            matches.push(index);
        });
        return matches;
    }, [messagesWithSeparators, searchQuery, searchFilterKind]);

    const scrollSearchMatch = (matchIndex: number) => {
        const listIndex = searchMatches[matchIndex];
        if (typeof listIndex !== 'number' || listIndex < 0 || listIndex >= messagesWithSeparators.length) return;
        try {
            flatListRef.current?.scrollToIndex({ index: listIndex, animated: true, viewPosition: 0.5 });
        } catch {
            try {
                flatListRef.current?.scrollToOffset({ offset: listIndex * 76, animated: true });
            } catch {}
        }
    };

    const handleSearchPrev = () => {
        if (searchMatches.length === 0) return;
        const nextIdx = (activeSearchIndex - 1 + searchMatches.length) % searchMatches.length;
        setActiveSearchIndex(nextIdx);
        scrollSearchMatch(nextIdx);
    };

    const handleSearchNext = () => {
        if (searchMatches.length === 0) return;
        const nextIdx = (activeSearchIndex + 1) % searchMatches.length;
        setActiveSearchIndex(nextIdx);
        scrollSearchMatch(nextIdx);
    };

    const canSend = message.trim().length > 0 || selectedFile !== null;

    // ── Target / Starred Message Auto-Jump (Feature 9) ──
    useEffect(() => {
        if (highlightMessageId && messages.length > 0) {
            const timer = setTimeout(() => {
                handleJumpToMessage(highlightMessageId as string);
            }, 600);
            return () => clearTimeout(timer);
        }
    }, [highlightMessageId, messages.length]);

    const selectedIdSet = useMemo(() => new Set(selectedMsgIds), [selectedMsgIds]);

    // ── Memoized Message Item Renderer (High Performance) ──
    const renderMessageItem = useCallback(({ item }: { item: MessageListItem }) => {
        if (item.type === 'separator') {
            return <DateSeparator date={item.date} />;
        }

        return (
            <MessageItem
                item={item.message}
                isDirect={isDirect as boolean}
                onReply={handleReply}
                onReact={handleReaction}
                onForward={handleOpenForward}
                onToggleStar={handleToggleStar}
                onPin={handlePin}
                onUnpin={handleUnpin}
                deliveryStatus={messageStatuses[item.message.id]}
                searchHighlight={isSearching && searchQuery.trim() ? searchQuery.trim() : undefined}
                isTargetHighlight={highlightMessageId === item.message.id}
                customBubbleMine={selectedTheme.id === 'bubbly' && accentMineBubble ? accentMineBubble : selectedTheme.bubbleMine}
                customBubbleOther={selectedTheme.bubbleOther}
                isNotesToSelf={isNotesToSelf}
                onLocalDelete={handleLocalDelete}
                onLocalEdit={handleLocalEdit}
                isSelectionMode={isSelectionMode}
                isSelected={selectedIdSet.has(item.message.id)}
                onToggleSelect={handleToggleSelectMsg}
                onEnterSelectionMode={handleEnterSelectionMode}
                onToggleChecklistLocal={handleToggleChecklistLocal}
                onReplayGame={handleReplayGame}
                bubbleCornerStyle={appearance.bubbleStyle}
                chatFontScale={appearance.fontScale}
            />
        );
    }, [
        isDirect,
        isNotesToSelf,
        handleReply,
        handleReaction,
        handleOpenForward,
        handleToggleStar,
        handlePin,
        handleUnpin,
        handleLocalDelete,
        handleLocalEdit,
        isSelectionMode,
        selectedIdSet,
        handleToggleSelectMsg,
        handleEnterSelectionMode,
        handleToggleChecklistLocal,
        handleReplayGame,
        appearance.bubbleStyle,
        appearance.fontScale,
        messageStatuses,
        isSearching,
        searchQuery,
        highlightMessageId,
        selectedTheme.id,
        selectedTheme.bubbleMine,
        selectedTheme.bubbleOther,
        accentMineBubble,
    ]);

    // ─────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────
    return (
        <ScreenWrapper showPattern={true} bgOpacity={0.5}>
            <KeyboardAvoidingView behavior="padding" style={styles.container}>

                {/* ── Header ── */}
                <Animated.View entering={FadeInDown.duration(220)} style={styles.header}>
                    <View style={styles.headerLeft}>
                        <BackButton iconSize={22} />
                        <TouchableOpacity
                            style={styles.headerInfo}
                            activeOpacity={0.75}
                            onPress={() => {
                                if (isNotesToSelf) return;
                                hapticTap("medium");
                                router.push({
                                    pathname: '/(main)/contactProfile',
                                    params: {
                                        userId: otherParticipant?._id || '',
                                        name: conversationName || '',
                                        avatar: (conversationAvatar as string) || '',
                                        isDirect: isDirect ? 'true' : 'false',
                                        conversationId: (conversationId as string) || '',
                                    }
                                });
                            }}
                        >
                            <View style={styles.avatarWrap}>
                                <Avatar size={38} uri={conversationAvatar as string} isGroup={type === 'group'} />
                                {!isNotesToSelf && isDirect && contactIsOnline && <View style={styles.onlineDot} />}
                            </View>
                            <View style={styles.headerText}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, minWidth: 0 }}>
                                    <Typo color={colors.white} fontWeight="700" size={16} style={{ flexShrink: 1 }} textProps={{ numberOfLines: 1, ellipsizeMode: 'tail' }}>{conversationName}</Typo>
                                    {disappearingSeconds > 0 && (
                                        <Icons.Timer size={verticalScale(14)} color={colors.primaryLight} weight="fill" />
                                    )}
                                </View>
                                {isNotesToSelf ? (
                                    <Typo color={'rgba(255,255,255,0.7)'} size={11.5} fontWeight="500" textProps={{ numberOfLines: 1 }}>
                                        Private Notebook 🔒
                                    </Typo>
                                ) : typingUser ? (
                                    <Animated.View entering={FadeIn.duration(200)} style={styles.headerTypingRow}>
                                        <View style={styles.headerTypingDots}>
                                            <TypingDot delay={0} /><TypingDot delay={150} /><TypingDot delay={300} />
                                        </View>
                                        <Typo color={'rgba(255,255,255,0.8)'} size={11.5} fontWeight="500" style={{ flexShrink: 1 }} textProps={{ numberOfLines: 1, ellipsizeMode: 'tail' }}>
                                            {isDirect ? 'typing...' : `${typingUser} is typing...`}
                                        </Typo>
                                    </Animated.View>
                                ) : (
                                    <Typo color={'rgba(255,255,255,0.65)'} size={11.5} fontWeight="400" textProps={{ numberOfLines: 1, ellipsizeMode: 'tail' }}>
                                        {isDirect
                                            ? (() => {
                                                const presenceText = contactIsOnline ? 'Online' : formatLastSeen(contactLastSeen);
                                                const hasStatus = !!(contactCustomStatus?.emoji || contactCustomStatus?.text);
                                                if (!hasStatus) return presenceText;
                                                const statusStr = `${contactCustomStatus?.emoji || '💬'} ${contactCustomStatus?.text || ''}`.trim();
                                                return `${presenceText} · ${statusStr}`;
                                            })()
                                            : `${participants.length} members`}
                                    </Typo>
                                )}
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* ── Header Right ── */}
                    <View style={styles.headerRight}>
                        <TouchableOpacity style={styles.callBtn} onPress={() => { hapticTap("medium"); setIsSearching(prev => !prev); }} activeOpacity={0.7}>
                            <Icons.MagnifyingGlass weight="bold" color={colors.white} size={verticalScale(18)} />
                        </TouchableOpacity>
                        {!isNotesToSelf && isDirect && (
                            <>
                                <TouchableOpacity style={styles.callBtn} onPress={() => handleStartCall('voice')} activeOpacity={0.7}>
                                    <Icons.Phone weight="fill" color={colors.white} size={verticalScale(18)} />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.callBtn} onPress={() => handleStartCall('video')} activeOpacity={0.7}>
                                    <Icons.VideoCamera weight="fill" color={colors.white} size={verticalScale(18)} />
                                </TouchableOpacity>
                            </>
                        )}
                        <TouchableOpacity style={styles.moreBtn} activeOpacity={0.7} onPress={() => { hapticTap("medium"); handleOpenMoreMenu(); }}>
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

                {/* ── Outbox Inspector Banner ── */}
                {outboxCount > 0 && (
                    <View style={styles.scheduledBanner}>
                        <View style={styles.scheduledInfo}>
                            <Icons.CloudArrowUp size={16} color="#d97706" weight="bold" />
                            <Typo size={12} fontWeight="700" color={colors.neutral800} textProps={{ numberOfLines: 1 }}>
                                {outboxCount} queued offline message{outboxCount > 1 ? "s" : ""}
                            </Typo>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                            <TouchableOpacity onPress={() => { hapticTap("heavy"); flushOutbox(); }} style={styles.manageSchedBtn}>
                                <Typo size={11} fontWeight="700" color="#d97706">Send Now</Typo>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={async () => {
                                    hapticTap("warning");
                                    if (conversationId) await AsyncStorage.removeItem(`@bubbly_outbox_${conversationId}`).catch(() => {});
                                    setOutboxCount(0);
                                    setMessages(prev => prev.filter(m => !m.id.startsWith('temp_')));
                                    setMessageStatuses(prev => {
                                        const next = { ...prev };
                                        for (const k of Object.keys(next)) {
                                            if (k.startsWith('temp_')) delete next[k];
                                        }
                                        return next;
                                    });
                                }}
                                style={[styles.manageSchedBtn, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}
                            >
                                <Typo size={11} fontWeight="700" color={colors.rose}>Clear</Typo>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* ── Multi-Select Top Toolbar ── */}
                {isSelectionMode && (
                    <View style={[styles.scheduledBanner, { backgroundColor: '#1c1917', borderTopWidth: 0 }]}>
                        <Typo size={13} fontWeight="800" color={colors.white}>
                            {selectedMsgIds.length} Selected
                        </Typo>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity
                                onPress={() => {
                                    hapticTap("medium");
                                    setSelectedMsgIds(messages.filter(m => !m.isDeleted && m.type !== 'system').map(m => m.id));
                                }}
                                style={[styles.manageSchedBtn, { backgroundColor: 'rgba(255,255,255,0.12)', borderColor: 'transparent' }]}
                            >
                                <Typo size={11} fontWeight="700" color={colors.white}>All</Typo>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => {
                                    hapticTap("light");
                                    setSelectedMsgIds([]);
                                }}
                                style={[styles.manageSchedBtn, { backgroundColor: colors.primary, borderColor: 'transparent' }]}
                            >
                                <Typo size={11} fontWeight="800" color={colors.black}>Cancel</Typo>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* ── Content Sheet with Custom Theme Background ── */}
                <View style={[styles.content, { backgroundColor: selectedTheme.bg }]}>
                    {/* ── Custom Photo Wallpaper (Feature 5) ── */}
                    {customWallpaperUri && (
                        <>
                            <Image
                                source={{ uri: customWallpaperUri }}
                                style={StyleSheet.absoluteFill}
                                contentFit="cover"
                            />
                            <View
                                style={[
                                    StyleSheet.absoluteFill,
                                    { backgroundColor: selectedTheme.isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.45)' }
                                ]}
                            />
                        </>
                    )}

                    {/* ── Search Bar ── */}
                    {isSearching && (
                        <ChatSearchBar
                            query={searchQuery}
                            onChangeQuery={(q) => { setSearchQuery(q); setActiveSearchIndex(0); }}
                            filterKind={searchFilterKind}
                            onChangeFilterKind={(kind) => { setSearchFilterKind(kind); setActiveSearchIndex(0); }}
                            matchCount={searchMatches.length}
                            currentIndex={activeSearchIndex}
                            onPrev={handleSearchPrev}
                            onNext={handleSearchNext}
                            onClose={() => { setIsSearching(false); setSearchQuery(''); setSearchFilterKind('all'); }}
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

                    <View style={styles.listStage}>
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
                        initialNumToRender={16}
                        maxToRenderPerBatch={12}
                        updateCellsBatchingPeriod={24}
                        windowSize={9}
                        removeClippedSubviews={false}
                        keyboardShouldPersistTaps="handled"
                        onScroll={handleScroll}
                        scrollEventThrottle={32}
                        onScrollToIndexFailed={(info) => {
                            flatListRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: true });
                        }}
                        ListFooterComponent={isLoadingMore ? <LoadMoreIndicator /> : null}
                        ListHeaderComponent={typingUser ? <TypingIndicator name={typingUser} isDirect={isDirect as boolean} /> : null}
                        ListEmptyComponent={
                            isInitialLoading ? (
                                <View style={styles.emptyState}>
                                    <Loading />
                                    <Typo size={13} color={colors.neutral400} style={{ marginTop: spacingY._8 }}>
                                        Loading messages...
                                    </Typo>
                                </View>
                            ) : (
                                <View style={styles.emptyState}>
                                    <View style={styles.emptyIconWrap}>
                                        <Icons.ChatTeardropDots size={verticalScale(30)} color={colors.neutral300} weight="regular" />
                                    </View>
                                    <Typo size={14} fontWeight="600" color={colors.neutral500}>No messages yet</Typo>
                                    <Typo size={12} color={colors.neutral400} style={{ textAlign: 'center' }}>Say hello to start the conversation!</Typo>
                                    <EmptyChatStarters
                                        isNotesToSelf={isNotesToSelf}
                                        contactName={conversationName}
                                        onPickText={(txt) => setMessage(txt)}
                                        onOpenGame={!isNotesToSelf ? () => setShowGameModal(true) : undefined}
                                        onOpenChecklist={!isNotesToSelf ? () => setShowChecklistModal(true) : undefined}
                                    />
                                </View>
                            )
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
                    </View>

                    {/* ── Group Mention Autocomplete Bar (Feature 7) ── */}
                    <GroupMentionBar candidates={mentionCandidates} onSelect={handleSelectMention} />

                    {/* ── Slash Quick Replies Autocomplete Bar ── */}
                    <QuickReplyBar
                        templates={quickReplyCandidates}
                        onSelect={handleSelectQuickReply}
                        onManage={() => setShowQuickRepliesMgr(true)}
                    />

                    {/* ── Scheduled Messages Floating Banner (Feature 3) ── */}
                    {scheduledMessages.length > 0 && (
                        <View style={styles.scheduledBanner}>
                            <View style={styles.scheduledInfo}>
                                <Icons.ClockCountdown size={16} color="#d97706" weight="fill" />
                                <Typo size={12} fontWeight="600" color={colors.neutral800} textProps={{ numberOfLines: 1 }}>
                                    {scheduledMessages.length} Scheduled: "{scheduledMessages[0].content}"
                                </Typo>
                            </View>
                            <TouchableOpacity
                                onPress={() => {
                                    BubblyAlert.alert(
                                        "Scheduled Messages",
                                        `You have ${scheduledMessages.length} scheduled message(s) queued.`,
                                        [
                                            ...scheduledMessages.map(s => ({
                                                text: `Cancel "${s.content.substring(0, 18)}..."`,
                                                style: "destructive" as const,
                                                onPress: () => handleCancelScheduled(s.id),
                                            })),
                                            { text: "Dismiss", style: "cancel" as const }
                                        ]
                                    );
                                }}
                                style={styles.manageSchedBtn}
                            >
                                <Typo size={11} fontWeight="700" color="#d97706">Manage</Typo>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* ── Bulk Multi-Select Dock or Input Bar ── */}
                    {isSelectionMode ? (
                        <View style={[styles.inputBar, { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: spacingY._12 }]}>
                            <TouchableOpacity onPress={handleBulkCopy} style={{ alignItems: 'center', gap: 3 }}>
                                <Icons.Copy size={20} color={colors.neutral800} weight="bold" />
                                <Typo size={11} fontWeight="700" color={colors.neutral700}>Copy</Typo>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleBulkStar} style={{ alignItems: 'center', gap: 3 }}>
                                <Icons.Star size={20} color="#eab308" weight="fill" />
                                <Typo size={11} fontWeight="700" color={colors.neutral700}>Star</Typo>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleBulkDelete} style={{ alignItems: 'center', gap: 3 }}>
                                <Icons.Trash size={20} color={colors.rose} weight="bold" />
                                <Typo size={11} fontWeight="700" color={colors.rose}>Delete</Typo>
                            </TouchableOpacity>
                        </View>
                    ) : (
                    <View style={styles.inputBar}>
                        {showFormatBar && (
                            <ComposerFormatBar
                                onApplyFormat={handleApplyFormat}
                                isSilent={isSilentSend}
                                onToggleSilent={() => setIsSilentSend(p => !p)}
                                onOpenQuickReplies={() => setShowQuickRepliesMgr(true)}
                                onOpenFancyText={() => setShowFancyTextModal(true)}
                            />
                        )}
                        {message.trim().length >= 60 && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 }}>
                                <Typo size={10.5} fontWeight="600" color={message.length > 3500 ? colors.rose : colors.neutral400}>
                                    {message.length} chars · {message.trim().split(/\s+/).filter(Boolean).length} words
                                </Typo>
                                <TouchableOpacity
                                    onPress={() => {
                                        hapticTap("light");
                                        setMessage("");
                                        if (conversationId) AsyncStorage.removeItem(`@bubbly_draft_${conversationId}`).catch(() => {});
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Typo size={10.5} fontWeight="700" color={colors.neutral500}>Clear draft</Typo>
                                </TouchableOpacity>
                            </View>
                        )}
                        {replyTo && <ReplyPreviewBar replyTo={replyTo} onCancel={handleCancelReply} />}
                        {isSilentSend && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fef3c7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius._10 }}>
                                <Typo size={11} fontWeight="700" color="#b45309">
                                    🔕 Silent Send active — recipient notification will be quiet
                                </Typo>
                                <TouchableOpacity onPress={() => setIsSilentSend(false)}>
                                    <Icons.X size={13} color="#b45309" weight="bold" />
                                </TouchableOpacity>
                            </View>
                        )}
                        {selectedFile && (
                            <FilePreviewBar
                                file={selectedFile}
                                isViewOnce={isViewOnce}
                                onToggleViewOnce={() => setIsViewOnce(prev => !prev)}
                                isHd={isHd}
                                onToggleHd={() => setIsHd(prev => !prev)}
                                onRemove={() => { setSelectedFile(null); setIsViewOnce(false); setIsHd(false); }}
                            />
                        )}
                        {showAttachOptions && (
                            <AttachmentOptions
                                onPickImage={onPickImage}
                                onPickGif={() => { setShowAttachOptions(false); setShowGifModal(true); }}
                                onPickFile={onPickFile}
                                onCreatePoll={() => { setShowAttachOptions(false); setShowPollModal(true); }}
                                onSchedule={() => { setShowAttachOptions(false); setShowScheduleModal(true); }}
                                onCreateChecklist={() => { setShowAttachOptions(false); setShowChecklistModal(true); }}
                                onOpenGames={() => { setShowAttachOptions(false); setShowGameModal(true); }}
                                onCreateCountdown={() => { setShowAttachOptions(false); setShowCountdownModal(true); }}
                                onSplitBill={() => { setShowAttachOptions(false); setShowSplitModal(true); }}
                                onOpenDoodle={() => { setShowAttachOptions(false); setShowDoodleModal(true); }}
                                onCreateEvent={() => { setShowAttachOptions(false); setShowEventModal(true); }}
                                onOpenWyr={() => { setShowAttachOptions(false); setShowWyrModal(true); }}
                                onClose={() => setShowAttachOptions(false)}
                            />
                        )}

                        <View style={styles.inputRow}>
                            {voiceReview ? (
                                <View style={styles.reviewDock}>
                                    <TouchableOpacity
                                        style={styles.trashRecordBtn}
                                        onPress={() => {
                                            hapticTap("warning");
                                            try { reviewPlayer.pause(); } catch {}
                                            setVoiceReview(null);
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <Icons.Trash size={verticalScale(18)} color={colors.white} weight="fill" />
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.playReviewBtn}
                                        onPress={async () => {
                                            hapticTap("medium");
                                            try {
                                                if (reviewPlayerStatus.playing) {
                                                    reviewPlayer.pause();
                                                } else {
                                                    if (reviewPlayerStatus.didJustFinish) {
                                                        try { await (reviewPlayer as any).seekTo?.(0); } catch {}
                                                    }
                                                    reviewPlayer.play();
                                                }
                                            } catch {}
                                        }}
                                        activeOpacity={0.8}
                                    >
                                        {reviewPlayerStatus.playing ? (
                                            <Icons.Pause size={verticalScale(18)} color={colors.neutral900} weight="fill" />
                                        ) : (
                                            <Icons.Play size={verticalScale(18)} color={colors.neutral900} weight="fill" />
                                        )}
                                    </TouchableOpacity>

                                    <View style={styles.reviewInfo}>
                                        <Typo size={13} fontWeight="600" color={colors.neutral800}>
                                            Voice Note Preview
                                        </Typo>
                                        <Typo size={11} color={colors.neutral400}>
                                            {formatDuration(voiceReview.duration)}
                                        </Typo>
                                    </View>

                                    <TouchableOpacity
                                        style={styles.sendBtn}
                                        onPress={async () => {
                                            hapticTap("heavy");
                                            try { reviewPlayer.pause(); } catch {}
                                            const { uri, duration } = voiceReview;
                                            setVoiceReview(null);
                                            await sendVoiceMessage(uri, duration);
                                        }}
                                        activeOpacity={0.8}
                                    >
                                        {isUploadingVoice ? (
                                            <Loading size="small" color={colors.black} />
                                        ) : (
                                            <Icons.PaperPlaneTilt color={colors.black} weight="fill" size={verticalScale(18)} />
                                        )}
                                    </TouchableOpacity>
                                </View>
                            ) : isRecording ? (
                                <View style={styles.recordingRow}>
                                    <TouchableOpacity style={styles.trashRecordBtn} onPress={cancelRecording} activeOpacity={0.7}>
                                        <Icons.Trash size={verticalScale(18)} color={colors.white} weight="fill" />
                                    </TouchableOpacity>
                                    <RecordingIndicator duration={recordingDuration} />
                                    <TouchableOpacity style={styles.pauseRecordBtn} onPress={pauseForReview} activeOpacity={0.7}>
                                        <Icons.Pause size={verticalScale(18)} color={colors.white} weight="bold" />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.sendBtn} onPress={() => stopRecording(false)} activeOpacity={0.8}>
                                        <Icons.PaperPlaneTilt color={colors.black} weight="fill" size={verticalScale(18)} />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <>
                                    <TouchableOpacity
                                        style={[styles.actionBtn, showAttachOptions && { backgroundColor: colors.primaryLight }]}
                                        onPress={() => {
                                            hapticTap("medium");
                                            setShowAttachOptions(prev => !prev);
                                        }}
                                        activeOpacity={0.75}
                                    >
                                        <Icons.Paperclip color={showAttachOptions ? colors.primaryDark : colors.neutral600} weight="bold" size={verticalScale(20)} />
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.actionBtn, { width: verticalScale(38), height: verticalScale(44) }, showFormatBar && { backgroundColor: colors.primaryLight }]}
                                        onPress={() => {
                                            hapticTap("medium");
                                            setShowFormatBar(prev => !prev);
                                        }}
                                        activeOpacity={0.75}
                                    >
                                        <Typo size={13} fontWeight="800" color={showFormatBar ? colors.primaryDark : colors.neutral600}>Aa</Typo>
                                    </TouchableOpacity>

                                    <Input
                                        value={message}
                                        onChangeText={handleMessageChange}
                                        onFocus={() => {
                                            if (showAttachOptions) setShowAttachOptions(false);
                                        }}
                                        onSelectionChange={(e) => {
                                            composerSelectionRef.current = e.nativeEvent.selection;
                                        }}
                                        multiline
                                        maxLength={4000}
                                        containerStyle={styles.textInput}
                                        inputStyle={styles.composerInput}
                                        placeholder={replyTo ? "Reply..." : "Message or /template..."}
                                    />

                                    {canSend ? (
                                        <TouchableOpacity
                                            style={[
                                                styles.sendBtn,
                                                isSilentSend && {
                                                    backgroundColor: '#1c1917',
                                                    borderWidth: 1.5,
                                                    borderColor: colors.primary,
                                                },
                                            ]}
                                            onPress={() => {
                                                hapticTap("heavy");
                                                onSend();
                                            }}
                                            onLongPress={() => {
                                                hapticTap("rigid");
                                                setIsSilentSend(prev => !prev);
                                            }}
                                            delayLongPress={320}
                                            activeOpacity={0.8}
                                        >
                                            {loading || isUploadingVoice ? (
                                                <Loading size="small" color={isSilentSend ? colors.primary : colors.black} />
                                            ) : isSilentSend ? (
                                                <Icons.BellSlash color={colors.primary} weight="fill" size={verticalScale(18)} />
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
                    )}
                </View>
            </KeyboardAvoidingView>

            {/* ── Poll Creator Modal ── */}
            <Modal visible={showPollModal} transparent animationType="slide" onRequestClose={() => setShowPollModal(false)}>
                <TouchableWithoutFeedback onPress={() => setShowPollModal(false)}>
                    <View style={pollModalStyles.overlay}>
                        <TouchableWithoutFeedback>
                            <KeyboardAvoidingView
                                behavior="padding"
                                style={[pollModalStyles.sheet, { paddingBottom: Math.max(insets.bottom, spacingY._20) + spacingY._8 }]}
                            >
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
                                        onChangeText={(val) => {
                                            setPollQuestion(val);
                                            if (pollError) setPollError('');
                                        }}
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
                                                    if (pollError) setPollError('');
                                                }}
                                                maxLength={100}
                                            />
                                            {pollOptions.length > 2 && (
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        hapticTap("warning");
                                                        setPollOptions(pollOptions.filter((_, i) => i !== index));
                                                    }}
                                                    style={pollModalStyles.removeOption}
                                                >
                                                    <Icons.X size={14} color={colors.rose} weight="bold" />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    ))}

                                    {/* ── Add option ── */}
                                    {pollOptions.length < 10 && (
                                        <TouchableOpacity
                                            style={pollModalStyles.addOptionBtn}
                                            onPress={() => {
                                                hapticTap("medium");
                                                setPollOptions([...pollOptions, '']);
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <Icons.Plus size={16} color={colors.primary} weight="bold" />
                                            <Typo size={13} fontWeight="600" color={colors.primaryDark}>Add Option</Typo>
                                        </TouchableOpacity>
                                    )}

                                    {!!pollError && (
                                        <Typo size={12.5} fontWeight="600" color={colors.rose} style={{ marginBottom: spacingY._8 }}>
                                            {pollError}
                                        </Typo>
                                    )}

                                    {/* ── Multiple choice toggle ── */}
                                    <TouchableOpacity
                                        style={pollModalStyles.toggleRow}
                                        onPress={() => {
                                            hapticTap("medium");
                                            setPollAllowMultiple(prev => !prev);
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <View style={pollModalStyles.toggleInfo}>
                                            <Typo size={14} fontWeight="600" color={colors.neutral800}>Multiple Choice</Typo>
                                            <Typo size={12} color={colors.neutral500}>Allow voting for multiple options</Typo>
                                        </View>
                                        <View style={[pollModalStyles.toggle, pollAllowMultiple && pollModalStyles.toggleActive]}>
                                            <View style={[pollModalStyles.toggleDot, pollAllowMultiple && pollModalStyles.toggleDotActive]} />
                                        </View>
                                    </TouchableOpacity>

                                    {/* ── Create button ── */}
                                    <TouchableOpacity
                                        style={pollModalStyles.createBtn}
                                        onPress={() => {
                                            hapticTap("success");
                                            handleCreatePoll();
                                        }}
                                        activeOpacity={0.8}
                                    >
                                        <Icons.ChartBar size={18} color={colors.black} weight="fill" />
                                        <Typo size={15} fontWeight="700" color={colors.black}>Create Poll</Typo>
                                    </TouchableOpacity>
                                </ScrollView>
                            </KeyboardAvoidingView>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {/* ── Schedule Modal (Feature 3) ── */}
            <ScheduleModal
                visible={showScheduleModal}
                onSchedule={handleConfirmSchedule}
                onClose={() => setShowScheduleModal(false)}
            />

            {/* ── Forward Modal ── */}
            <ForwardModal
                visible={forwardModalVisible}
                conversations={recentConversations}
                currentUserId={currentUser?.id || ''}
                onSelectMultiple={handleSendForward}
                onClose={() => { setForwardModalVisible(false); setForwardingMessage(null); }}
            />

            {/* ── Group Info Modal ── */}
            <GroupInfoModal
                visible={groupInfoVisible}
                conversationName={conversationName}
                conversationAvatar={conversationAvatar as string}
                participants={participants}
                admins={groupAdmins}
                createdBy={groupCreatedBy}
                currentUserId={currentUser?.id || ''}
                mediaItems={mediaMessages}
                onPromote={handlePromoteAdmin}
                onDemote={handleDemoteAdmin}
                onRemoveMember={handleRemoveMember}
                onLeaveGroup={handleLeaveGroup}
                onClose={() => setGroupInfoVisible(false)}
            />

            {/* ── Chat Wallpaper & Theme Modal ── */}
            <ChatThemeModal
                visible={showThemeModal}
                currentThemeId={selectedTheme.id}
                onSelectTheme={handleSelectTheme}
                onPickCustomWallpaper={handlePickCustomWallpaper}
                onClose={() => setShowThemeModal(false)}
            />

            {/* ── Disappearing Messages Modal (Feature 8) ── */}
            <DisappearingModal
                visible={showDisappearingModal}
                currentSeconds={disappearingSeconds}
                onSelect={handleSelectDisappearing}
                onClose={() => setShowDisappearingModal(false)}
            />

            {/* ── v4.0.1 Flagship Interactive Modals ── */}
            <ChecklistCreatorModal
                visible={showChecklistModal}
                onCreate={handleCreateChecklist}
                onClose={() => setShowChecklistModal(false)}
            />

            <GamePickerModal
                visible={showGameModal}
                onSelectGame={handleSendGame}
                onClose={() => setShowGameModal(false)}
            />

            <CountdownCreatorModal
                visible={showCountdownModal}
                onCreate={handleSendCountdown}
                onClose={() => setShowCountdownModal(false)}
            />

            <QuickRepliesManagerModal
                visible={showQuickRepliesMgr}
                templates={quickReplies}
                onSave={async (nextList) => {
                    setQuickReplies(nextList);
                    await saveQuickReplies(nextList);
                }}
                onClose={() => setShowQuickRepliesMgr(false)}
            />

            <ChatInsightsModal
                visible={showInsightsModal}
                chatName={conversationName || "Chat"}
                messages={messages}
                currentUserId={currentUser?.id}
                onClose={() => setShowInsightsModal(false)}
            />

            <GifPickerModal
                visible={showGifModal}
                onSelectGif={handleSendGif}
                onClose={() => setShowGifModal(false)}
            />

            <SplitBillModal
                visible={showSplitModal}
                defaultParticipants={participants.map((p: any) => p.name).filter(Boolean)}
                currentUserName={currentUser?.name || "You"}
                onCreate={handleSendSplitBill}
                onClose={() => setShowSplitModal(false)}
            />

            <DoodlePadModal
                visible={showDoodleModal}
                onSend={handleSendDoodle}
                onClose={() => setShowDoodleModal(false)}
            />

            <ChatScratchpadModal
                visible={showScratchpadModal}
                conversationId={String(conversationId || "default")}
                chatName={conversationName || "Chat"}
                onClose={() => setShowScratchpadModal(false)}
            />

            <EventCreatorModal
                visible={showEventModal}
                onCreate={handleSendEvent}
                onClose={() => setShowEventModal(false)}
            />

            <WouldYouRatherModal
                visible={showWyrModal}
                onCreate={handleSendWyr}
                onClose={() => setShowWyrModal(false)}
            />

            <FancyTextModal
                visible={showFancyTextModal}
                initialText={message}
                onApply={(styled) => {
                    setShowFancyTextModal(false);
                    setMessage(styled);
                }}
                onClose={() => setShowFancyTextModal(false)}
            />
        </ScreenWrapper>
    );
};

export default Conversation;

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacingX._15, paddingTop: spacingY._10, paddingBottom: spacingY._12, gap: scale(6) },
    headerLeft: { flexDirection: "row", alignItems: "center", gap: scale(8), flex: 1, minWidth: 0 },
    headerInfo: { flexDirection: "row", alignItems: "center", gap: scale(8), flex: 1, minWidth: 0 },
    avatarWrap: { position: "relative", flexShrink: 0 },
    onlineDot: { position: "absolute", bottom: 0, right: 0, width: scale(11), height: scale(11), borderRadius: radius.full, backgroundColor: colors.emerald, borderWidth: 2, borderColor: colors.neutral900 },
    headerText: { flex: 1, minWidth: 0, gap: 2 },
    headerTypingRow: { flexDirection: 'row', alignItems: 'center', gap: 5, minWidth: 0 },
    headerTypingDots: { flexDirection: 'row', alignItems: 'center', gap: 2, flexShrink: 0 },
    headerRight: { flexDirection: 'row', alignItems: 'center', flexShrink: 0, gap: scale(5) },
    callBtn: { width: verticalScale(34), height: verticalScale(34), borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.glassDarkBg, borderWidth: 1, borderColor: colors.glassBorder },
    moreBtn: { width: verticalScale(34), height: verticalScale(34), borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.glassDarkBg, borderWidth: 1, borderColor: colors.glassBorder },
    content: { flex: 1, backgroundColor: colors.white, borderTopRightRadius: radius._40, borderTopLeftRadius: radius._40, borderCurve: "continuous", overflow: "hidden" },
    listStage: { flex: 1, position: "relative" },
    messagesContent: { paddingHorizontal: spacingX._15, paddingTop: spacingY._20, paddingBottom: spacingY._10, gap: spacingY._12, flexGrow: 1 },
    emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacingY._12, paddingTop: verticalScale(100), paddingHorizontal: spacingX._30 },
    emptyIconWrap: { backgroundColor: colors.neutral100, padding: spacingY._20, borderRadius: radius._30, marginBottom: spacingY._5 },
    inputBar: { paddingHorizontal: spacingX._12, paddingTop: spacingY._10, paddingBottom: spacingY._10, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.cardBorderSubtle, gap: spacingY._8 },
    inputRow: { flexDirection: "row", alignItems: "flex-end", gap: spacingX._8 },
    actionBtn: { width: verticalScale(44), height: verticalScale(44), borderRadius: radius.full, backgroundColor: colors.neutral100, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.neutral200, flexShrink: 0 },
    textInput: { flex: 1, minHeight: verticalScale(44), maxHeight: verticalScale(106), borderRadius: radius._24, paddingHorizontal: spacingX._15, paddingVertical: verticalScale(8), backgroundColor: colors.neutral50, borderWidth: 1, borderColor: colors.neutral200 },
    composerInput: { maxHeight: verticalScale(90), lineHeight: verticalScale(20) },
    sendBtn: { width: verticalScale(44), height: verticalScale(44), borderRadius: radius.full, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", flexShrink: 0, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.45, shadowRadius: 10, elevation: 6 },
    micBtn: { width: verticalScale(44), height: verticalScale(44), borderRadius: radius.full, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", flexShrink: 0, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.45, shadowRadius: 10, elevation: 6 },
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
    scheduledBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fffbeb',
        paddingHorizontal: spacingX._15,
        paddingVertical: spacingY._8,
        borderTopWidth: 1,
        borderTopColor: '#fde68a',
    },
    scheduledInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacingX._7,
        flex: 1,
        minWidth: 0,
        marginRight: spacingX._10,
    },
    manageSchedBtn: {
        paddingHorizontal: spacingX._10,
        paddingVertical: spacingY._5,
        backgroundColor: '#fef3c7',
        borderRadius: radius._8,
        borderWidth: 1,
        borderColor: '#fcd34d',
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
    pauseRecordBtn: {
        width: verticalScale(38),
        height: verticalScale(38),
        borderRadius: radius.full,
        backgroundColor: colors.neutral700,
        alignItems: 'center',
        justifyContent: 'center',
    },
    reviewDock: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.neutral100,
        borderRadius: radius._15,
        paddingHorizontal: spacingX._10,
        paddingVertical: spacingY._7,
        gap: spacingX._10,
    },
    playReviewBtn: {
        width: verticalScale(38),
        height: verticalScale(38),
        borderRadius: radius.full,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.neutral200,
    },
    reviewInfo: {
        flex: 1,
    },
    scrollToBottomWrap: {
        position: 'absolute',
        bottom: spacingY._12,
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
    toggleInfo: { flex: 1, minWidth: 0, marginRight: spacingX._10, gap: 2 },
    toggle: { width: scale(46), height: scale(26), borderRadius: radius.full, backgroundColor: colors.neutral300, padding: 3, justifyContent: 'center' },
    toggleActive: { backgroundColor: colors.primary },
    toggleDot: { width: scale(20), height: scale(20), borderRadius: radius.full, backgroundColor: colors.white },
    toggleDotActive: { alignSelf: 'flex-end' },
    createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacingX._10, backgroundColor: colors.primary, borderRadius: radius.full, paddingVertical: spacingY._15, shadowColor: colors.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 4 },
});