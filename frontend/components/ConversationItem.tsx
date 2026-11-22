import { StyleSheet, TouchableOpacity, View } from 'react-native'
import React from 'react'
import { colors, radius, spacingX, spacingY } from "../constants/theme"
import Avatar from "./Avatar"
import Typo from "./Typo"
import moment from "moment"
import { ConversationListItemProps } from "../types"
import { useAuth } from "../contexts/authContext"
import { scale, verticalScale } from "../utils/styling"
import { TextStyle } from 'react-native'

// ── Highlight matched text ──
const HighlightText = ({
    text,
    query,
    size = 15,
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
                        style={{ backgroundColor: colors.primaryLight }}
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

    // ── NEW: unread count ──
    const unreadCount = item.unreadCount || 0;
    const hasUnread = unreadCount > 0;

    const getLastMessageContent = () => {
        if (!lastMessage) return "Say hi 👋";
        return lastMessage?.attachement ? "📷 Image" : lastMessage.content;
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

    const lastMessageDate = getLastMessageDate();
    const lastMessageContent = getLastMessageContent();

    return (
        <View>
            <TouchableOpacity
                style={styles.conversationItem}
                onPress={openConversation}
                activeOpacity={0.7}
            >
                {/* Avatar */}
                <Avatar uri={avatar} size={50} isGroup={item.type === 'group'} />

                {/* Content */}
                <View style={styles.textContent}>
                    {/* Top row: name + time */}
                    <View style={styles.topRow}>
                        <View style={{ flex: 1, marginRight: spacingX._10 }}>
                            <HighlightText
                                text={displayName}
                                query={searchQuery}
                                size={15}
                                // ── bold name if unread ──
                                fontWeight={hasUnread ? "700" : "600"}
                                color={colors.neutral900}
                                numberOfLines={1}
                            />
                        </View>

                        {lastMessageDate && (
                            <Typo
                                size={12}
                                // ── highlight time if unread ──
                                color={hasUnread ? colors.primary : colors.neutral400}
                                fontWeight={hasUnread ? "700" : "400"}
                            >
                                {lastMessageDate}
                            </Typo>
                        )}
                    </View>

                    {/* Bottom row: last message + badge */}
                    <View style={styles.bottomRow}>
                        <View style={{ flex: 1 }}>
                            <HighlightText
                                text={lastMessageContent}
                                query={searchQuery}
                                size={13}
                                // ── bold preview if unread ──
                                color={hasUnread ? colors.neutral700 : colors.neutral500}
                                fontWeight={hasUnread ? "600" : "400"}
                                numberOfLines={1}
                            />
                        </View>

                        {/* ── NEW: Unread count badge ── */}
                        {hasUnread && (
                            <View style={styles.unreadBadge}>
                                <Typo size={10} fontWeight="800" color={colors.white}>
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

export default ConversationItem;

const styles = StyleSheet.create({
    conversationItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacingX._12,
        paddingVertical: spacingY._10,
        borderRadius: radius._12,
    },
    textContent: {
        flex: 1,
        gap: spacingY._5,
    },
    topRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    bottomRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: spacingX._10,
    },
    divider: {
        height: 1,
        backgroundColor: colors.neutral100,
        marginLeft: verticalScale(62),
    },

    // ── NEW: unread badge ──
    unreadBadge: {
        backgroundColor: colors.primary,
        borderRadius: radius.full,
        minWidth: scale(20),
        height: scale(20),
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: scale(5),
        flexShrink: 0,
    },
});