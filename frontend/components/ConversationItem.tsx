import { StyleSheet, TouchableOpacity, View, Platform, Vibration } from 'react-native';
import React from 'react';
import { colors, radius, spacingX, spacingY } from "../constants/theme";
import Avatar from "./Avatar";
import Typo from "./Typo";
import moment from "moment";
import { ConversationListItemProps } from "../types";
import { useAuth } from "../contexts/authContext";
import { scale, verticalScale } from "../utils/styling";
import { TextStyle } from 'react-native';
import * as Icons from "phosphor-react-native";

// ── Highlight matched text ──
const HighlightText = ({
    text,
    query,
    size = 14,
    color = colors.neutral800,
    fontWeight = "400",
    numberOfLines,
}: {
    text: string;
    query: string;
    size?: number;
    color?: string;
    fontWeight?: TextStyle['fontWeight'];
    numberOfLines?: number;
}) => {
    if (!query.trim()) {
        return (
            <Typo size={size} color={color} fontWeight={fontWeight} textProps={{ numberOfLines }}>
                {text}
            </Typo>
        );
    }

    const parts = text.split(new RegExp(`(${query})`, 'gi'));

    return (
        <Typo size={size} color={color} fontWeight={fontWeight} textProps={{ numberOfLines }}>
            {parts.map((part, i) =>
                part.toLowerCase() === query.toLowerCase() ? (
                    <Typo
                        key={i}
                        size={size}
                        fontWeight="700"
                        color={colors.neutral900}
                        style={{ backgroundColor: colors.primaryLight, borderRadius: 2 }}
                    >
                        {part}
                    </Typo>
                ) : (
                    part
                )
            )}
        </Typo>
    );
};

const ConversationItem = ({
    item,
    showDivider,
    router,
    searchQuery = "",
    isOnline,
    typingUser,
    draftText,
    onLongPress,
}: ConversationListItemProps & { searchQuery?: string }) => {

    const { user: currentUser } = useAuth();

    const lastMessage: any = item.lastMessage;
    const isDirect = item.type === 'direct';
    let avatar = item.avatar;
    const otherParticipant = isDirect
        ? item.participants.find(p => p._id !== currentUser?.id)
        : null;
    if (isDirect && otherParticipant) avatar = otherParticipant?.avatar;

    const displayName = isDirect ? otherParticipant?.name ?? "" : item?.name ?? "";

    const unreadCount = item.unreadCount || 0;
    const hasUnread = unreadCount > 0;
    const isMyLastMessage = lastMessage?.sender?._id === currentUser?.id || lastMessage?.sender?.id === currentUser?.id;

    const isVoice = !!lastMessage?.voiceUrl;
    const isImage = !!lastMessage?.attachement && !lastMessage?.isViewOnce;

    const getLastMessageContent = () => {
        if (!lastMessage) return "Tap to start chatting 👋";
        if (isVoice) return "Voice note";
        if (isImage) return "Photo";
        return lastMessage.content || "Attachment";
    };

    const getLastMessageDate = () => {
        if (!lastMessage?.createdAt) return null;
        const messageDate = moment(lastMessage.createdAt);
        const today = moment();
        if (messageDate.isSame(today, "day")) return messageDate.format("h:mm A");
        if (messageDate.isSame(today, "year")) return messageDate.format("MMM D");
        return messageDate.format("MMM D, YYYY");
    };

    const openConversation = () => {
        router.push({
            pathname: "/(main)/conversation",
            params: {
                id: item._id,
                name: item.name,
                avatar: item.avatar,
                type: item.type,
                participants: JSON.stringify(item.participants)
            }
        });
    };

    const handleLongPress = () => {
        if (Platform.OS !== 'web') {
            try { Vibration.vibrate(35); } catch (_) {}
        }
        onLongPress?.(item);
    };

    const lastMessageDate = getLastMessageDate();
    const lastMessageContent = getLastMessageContent();

    return (
        <View>
            <TouchableOpacity
                style={[
                    styles.conversationItem,
                    hasUnread && styles.conversationItemUnread,
                ]}
                onPress={openConversation}
                onLongPress={handleLongPress}
                delayLongPress={300}
                activeOpacity={0.7}
            >
                {/* ── Avatar with Live Online Indicator ── */}
                <View style={styles.avatarWrap}>
                    <Avatar uri={avatar} size={52} isGroup={item.type === 'group'} />
                    {isDirect && isOnline && (
                        <View style={styles.onlineDot} />
                    )}
                </View>

                {/* ── Content Body ── */}
                <View style={styles.textContent}>
                    {/* Top row: Name + Pinned + Time */}
                    <View style={styles.topRow}>
                        <View style={styles.nameContainer}>
                            <HighlightText
                                text={displayName}
                                query={searchQuery}
                                size={15.5}
                                fontWeight={hasUnread ? "700" : "600"}
                                color={colors.neutral900}
                                numberOfLines={1}
                            />
                        </View>

                        <View style={styles.timeBadgeRow}>
                            {item.isMuted && (
                                <Icons.BellSlash
                                    size={verticalScale(13)}
                                    color={colors.neutral400}
                                    weight="fill"
                                />
                            )}
                            {item.pinnedMessages && item.pinnedMessages.length > 0 && (
                                <View style={styles.pinnedPill}>
                                    <Icons.PushPin
                                        size={verticalScale(11)}
                                        color={colors.primaryDark}
                                        weight="fill"
                                    />
                                </View>
                            )}
                            {lastMessageDate && (
                                <Typo
                                    size={11.5}
                                    color={hasUnread ? colors.primaryDark : colors.neutral400}
                                    fontWeight={hasUnread ? "700" : "500"}
                                >
                                    {lastMessageDate}
                                </Typo>
                            )}
                        </View>
                    </View>

                    {/* Bottom row: Delivery tick + media icon + preview + unread pill */}
                    <View style={styles.bottomRow}>
                        <View style={styles.previewWrap}>
                            {/* Delivery checkmarks if sent by me */}
                            {isMyLastMessage && (
                                <View style={styles.deliveryTickWrap}>
                                    <Icons.Checks
                                        size={verticalScale(13)}
                                        color={hasUnread ? colors.neutral400 : colors.sky}
                                        weight="bold"
                                    />
                                </View>
                            )}

                            {/* Live Typing or Draft or Last Message Preview */}
                            {typingUser ? (
                                <View style={styles.liveTypingRow}>
                                    <View style={styles.liveTypingDot} />
                                    <Typo
                                        size={13.5}
                                        color={colors.green}
                                        fontWeight="700"
                                        textProps={{ numberOfLines: 1 }}
                                    >
                                        {isDirect ? "typing..." : `${typingUser} is typing...`}
                                    </Typo>
                                </View>
                            ) : draftText && !hasUnread ? (
                                <View style={styles.draftRow}>
                                    <Typo size={13.5} color={colors.rose} fontWeight="700">Draft: </Typo>
                                    <Typo
                                        size={13.5}
                                        color={colors.neutral600}
                                        fontWeight="500"
                                        textProps={{ numberOfLines: 1 }}
                                    >
                                        {draftText}
                                    </Typo>
                                </View>
                            ) : (
                                <>
                                    {/* Media Type Icon */}
                                    {isVoice && (
                                        <Icons.Microphone
                                            size={verticalScale(13)}
                                            color={colors.primaryDark}
                                            weight="fill"
                                            style={{ marginRight: 3 }}
                                        />
                                    )}
                                    {isImage && (
                                        <Icons.Image
                                            size={verticalScale(13)}
                                            color={colors.primaryDark}
                                            weight="fill"
                                            style={{ marginRight: 3 }}
                                        />
                                    )}

                                    <HighlightText
                                        text={lastMessageContent}
                                        query={searchQuery}
                                        size={13.5}
                                        color={hasUnread ? colors.neutral900 : colors.neutral500}
                                        fontWeight={hasUnread ? "600" : "400"}
                                        numberOfLines={1}
                                    />
                                </>
                            )}
                        </View>

                        {/* Unread count badge */}
                        {hasUnread && (
                            <View style={styles.unreadBadge}>
                                <Typo size={10.5} fontWeight="800" color={colors.white}>
                                    {unreadCount > 99 ? "99+" : unreadCount}
                                </Typo>
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>

            {showDivider && (
                <View style={styles.divider} />
            )}
        </View>
    );
};

export default React.memo(ConversationItem, (prev, next) => {
    return (
        prev.item._id === next.item._id &&
        prev.item.name === next.item.name &&
        prev.item.avatar === next.item.avatar &&
        prev.item.unreadCount === next.item.unreadCount &&
        prev.item.isMuted === next.item.isMuted &&
        prev.item.pinnedMessages?.length === next.item.pinnedMessages?.length &&
        prev.item.lastMessage?.content === next.item.lastMessage?.content &&
        prev.item.lastMessage?.createdAt === next.item.lastMessage?.createdAt &&
        prev.item.lastMessage?.voiceUrl === next.item.lastMessage?.voiceUrl &&
        prev.item.lastMessage?.attachement === next.item.lastMessage?.attachement &&
        prev.item.participants?.length === next.item.participants?.length &&
        prev.showDivider === next.showDivider &&
        prev.searchQuery === next.searchQuery &&
        prev.isOnline === next.isOnline &&
        prev.typingUser === next.typingUser &&
        prev.draftText === next.draftText &&
        prev.onLongPress === next.onLongPress
    );
});

const styles = StyleSheet.create({
    conversationItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacingX._12,
        paddingVertical: verticalScale(13),
        paddingHorizontal: spacingX._10,
        borderRadius: radius._15,
        marginVertical: verticalScale(1),
    },
    conversationItemUnread: {
        backgroundColor: "rgba(254, 243, 199, 0.35)",
    },
    avatarWrap: {
        position: 'relative',
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    onlineDot: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: verticalScale(14),
        height: verticalScale(14),
        borderRadius: radius.full,
        backgroundColor: "#22c55e",
        borderWidth: 2.5,
        borderColor: colors.white,
    },
    textContent: {
        flex: 1,
        gap: spacingY._4,
    },
    topRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    nameContainer: {
        flex: 1,
        marginRight: spacingX._8,
    },
    timeBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(5),
    },
    pinnedPill: {
        backgroundColor: colors.primaryLight,
        borderRadius: radius.full,
        paddingHorizontal: scale(5),
        paddingVertical: verticalScale(2),
        borderWidth: 1,
        borderColor: "rgba(245, 158, 11, 0.2)",
    },
    bottomRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: spacingX._10,
    },
    previewWrap: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    deliveryTickWrap: {
        marginRight: scale(4),
    },
    liveTypingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(6),
    },
    liveTypingDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: colors.green,
    },
    draftRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: colors.neutral200,
        marginLeft: scale(68),
        marginRight: spacingX._10,
    },
    unreadBadge: {
        backgroundColor: colors.primary,
        borderRadius: radius.full,
        minWidth: scale(20),
        height: scale(20),
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: scale(5),
        flexShrink: 0,
        shadowColor: colors.primaryDark,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
        elevation: 3,
    },
});
