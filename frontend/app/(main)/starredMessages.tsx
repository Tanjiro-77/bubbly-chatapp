/**
 * frontend/app/(main)/starredMessages.tsx
 *
 * Centralized Starred Messages Screen (V3.1.2 Flagship).
 * Allows users to view, search, unstar, and jump directly to any saved message across all chats.
 */

import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
    View,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    Platform,
} from "react-native";
import { useRouter } from "expo-router";
import * as Icons from "phosphor-react-native";
import { Image } from "expo-image";
import ScreenWrapper from "../../components/ScreenWrapper";
import Typo from "../../components/Typo";
import BackButton from "../../components/BackButton";
import Avatar from "../../components/Avatar";
import { colors, radius, spacingX, spacingY } from "../../constants/theme";
import { scale, verticalScale } from "../../utils/styling";
import { getStarredMessages, toggleStarMessage } from "../../socket/socketEvents";
import moment from "moment";

interface StarredItem {
    _id?: string;
    savedId?: string;
    conversationId: string;
    savedAt?: string;
    createdAt?: string;
    message?: {
        id?: string;
        _id?: string;
        content?: string;
        type?: string;
        attachement?: string;
        attachmentMeta?: {
            name?: string;
            size?: number;
            mimeType?: string;
            url?: string;
        };
        voiceUrl?: string;
        voiceDuration?: number;
        createdAt?: string;
        sender?: {
            id?: string;
            _id?: string;
            name: string;
            avatar?: string;
        };
        senderId?: {
            id?: string;
            _id?: string;
            name: string;
            avatar?: string;
        };
    };
    messageId?: {
        id?: string;
        _id?: string;
        content?: string;
        type?: string;
        attachement?: string;
        attachmentMeta?: {
            name?: string;
            size?: number;
            mimeType?: string;
            url?: string;
        };
        voiceUrl?: string;
        voiceDuration?: number;
        createdAt?: string;
        sender?: {
            id?: string;
            _id?: string;
            name: string;
            avatar?: string;
        };
        senderId?: {
            id?: string;
            _id?: string;
            name: string;
            avatar?: string;
        };
    };
}

const StarredMessagesScreen = () => {
    const router = useRouter();
    const [starredList, setStarredList] = useState<StarredItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        const handler = (res: any) => {
            setLoading(false);
            if (res?.success && Array.isArray(res.data)) {
                setStarredList(res.data);
            }
        };

        getStarredMessages(handler);
        getStarredMessages({ page: 1, limit: 50 });

        return () => {
            getStarredMessages(handler, true);
        };
    }, []);

    const handleUnstar = useCallback((item: StarredItem) => {
        const msg = item.message || item.messageId;
        const msgId = msg?.id || msg?._id || item._id || item.savedId;
        if (!msgId) return;

        Alert.alert(
            "Remove Star",
            "Are you sure you want to remove this message from your starred messages?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: () => {
                        toggleStarMessage({
                            messageId: msgId,
                            conversationId: item.conversationId,
                        });
                        const idToRemove = item.savedId || item._id;
                        setStarredList(prev => prev.filter(s => (s.savedId || s._id) !== idToRemove));
                    },
                },
            ]
        );
    }, []);

    const handleJumpToChat = useCallback((item: StarredItem) => {
        if (!item.conversationId) return;
        const msg = item.message || item.messageId;
        const sender = msg?.sender || msg?.senderId;
        const senderName = sender?.name || "Chat";
        const msgId = msg?.id || msg?._id || "";
        router.push({
            pathname: "/(main)/conversation",
            params: {
                id: item.conversationId,
                name: senderName,
                highlightMessageId: msgId,
            },
        });
    }, [router]);

    const filteredList = useMemo(() => {
        if (!searchQuery.trim()) return starredList;
        const q = searchQuery.toLowerCase().trim();
        return starredList.filter(item => {
            const msg = item.message || item.messageId;
            const sender = msg?.sender || msg?.senderId;
            const contentMatch = msg?.content?.toLowerCase().includes(q);
            const senderMatch = sender?.name?.toLowerCase().includes(q);
            const fileNameMatch = msg?.attachmentMeta?.name?.toLowerCase().includes(q);
            return contentMatch || senderMatch || fileNameMatch;
        });
    }, [starredList, searchQuery]);

    const renderItem = useCallback(({ item }: { item: StarredItem }) => {
        const msg = item.message || item.messageId;
        if (!msg) return null;

        const sender = msg.sender || msg.senderId;
        const timeAgo = moment(msg.createdAt || item.savedAt || item.createdAt).fromNow();
        const isVoice = !!msg.voiceUrl;
        const isImage = msg.type === "image" || (msg.attachement && msg.attachmentMeta?.mimeType?.startsWith("image/"));
        const isFile = msg.type === "file" || (msg.attachement && !isImage);

        return (
            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => handleJumpToChat(item)}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.senderRow}>
                        <Avatar
                            uri={sender?.avatar}
                            size={verticalScale(32)}
                        />
                        <View style={{ marginLeft: spacingX._7, flex: 1 }}>
                            <Typo size={13} fontWeight="600" color={colors.neutral800} textProps={{ numberOfLines: 1 }}>
                                {sender?.name || "Unknown"}
                            </Typo>
                            <Typo size={11} color={colors.neutral400}>
                                {timeAgo}
                            </Typo>
                        </View>
                    </View>
                    <View style={styles.headerActions}>
                        <TouchableOpacity
                            onPress={() => handleUnstar(item)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            style={styles.starBtn}
                        >
                            <Icons.Star size={verticalScale(16)} color={'#f59e0b'} weight="fill" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Content body */}
                {isImage && (
                    <View style={styles.attachmentPreview}>
                        <Image
                            source={{ uri: msg.attachmentMeta?.url || msg.attachement }}
                            style={styles.thumbImage}
                            contentFit="cover"
                        />
                    </View>
                )}

                {isFile && (
                    <View style={styles.fileRow}>
                        <View style={styles.fileIconWrap}>
                            <Icons.FileText size={verticalScale(18)} color={colors.primaryDark} weight="fill" />
                        </View>
                        <Typo size={12} fontWeight="500" color={colors.neutral700} textProps={{ numberOfLines: 1 }} style={{ flex: 1 }}>
                            {msg.attachmentMeta?.name || "Shared Document"}
                        </Typo>
                    </View>
                )}

                {isVoice && (
                    <View style={styles.voiceRow}>
                        <Icons.Microphone size={verticalScale(16)} color={colors.primary} weight="fill" />
                        <Typo size={12} fontWeight="500" color={colors.neutral600}>
                            Voice Note ({msg.voiceDuration ? `${Math.round(msg.voiceDuration)}s` : "Audio"})
                        </Typo>
                    </View>
                )}

                {!!msg.content && (
                    <Typo size={13.5} color={colors.neutral700} style={styles.messageText} textProps={{ numberOfLines: 3 }}>
                        {msg.content}
                    </Typo>
                )}

                <View style={styles.jumpRow}>
                    <Typo size={11.5} fontWeight="600" color={colors.primaryDark}>
                        Jump to conversation
                    </Typo>
                    <Icons.CaretRight size={verticalScale(12)} color={colors.primaryDark} weight="bold" />
                </View>
            </TouchableOpacity>
        );
    }, [handleJumpToChat, handleUnstar]);

    return (
        <ScreenWrapper>
            {/* Header */}
            <View style={styles.header}>
                <BackButton />
                {isSearching ? (
                    <View style={styles.searchBox}>
                        <Icons.MagnifyingGlass size={verticalScale(16)} color={colors.neutral400} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search starred messages..."
                            placeholderTextColor={colors.neutral400}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoFocus
                        />
                        <TouchableOpacity onPress={() => { setSearchQuery(""); setIsSearching(false); }}>
                            <Icons.X size={verticalScale(16)} color={colors.neutral500} />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        <View style={styles.headerTitleWrap}>
                            <Typo size={18} fontWeight="700" color={colors.neutral900}>
                                Starred Messages
                            </Typo>
                            <Typo size={11} color={colors.neutral400}>
                                {starredList.length} saved
                            </Typo>
                        </View>
                        <TouchableOpacity
                            style={styles.iconBtn}
                            onPress={() => setIsSearching(true)}
                            activeOpacity={0.7}
                        >
                            <Icons.MagnifyingGlass size={verticalScale(20)} color={colors.neutral700} />
                        </TouchableOpacity>
                    </>
                )}
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Typo size={13} color={colors.neutral400} style={{ marginTop: spacingY._10 }}>
                        Loading starred messages...
                    </Typo>
                </View>
            ) : filteredList.length === 0 ? (
                <View style={styles.centerContainer}>
                    <View style={styles.emptyIconCircle}>
                        <Icons.Star size={verticalScale(40)} color={'#f59e0b'} weight="duotone" />
                    </View>
                    <Typo size={16} fontWeight="700" color={colors.neutral800} style={{ marginTop: spacingY._15 }}>
                        {searchQuery ? "No matching messages" : "No Starred Messages"}
                    </Typo>
                    <Typo size={12.5} color={colors.neutral400} style={styles.emptySubtitle}>
                        {searchQuery
                            ? "Try searching with different keywords."
                            : "Star important messages in any conversation to easily find them here anytime."}
                    </Typo>
                </View>
            ) : (
                <FlatList
                    data={filteredList}
                    keyExtractor={item => item.savedId || item._id || (item.message?.id || item.messageId?.id || Math.random().toString())}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </ScreenWrapper>
    );
};

export default StarredMessagesScreen;

const styles = StyleSheet.create({
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: spacingX._15,
        paddingVertical: spacingY._10,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral100,
        gap: spacingX._10,
    },
    headerTitleWrap: {
        flex: 1,
        marginLeft: spacingX._5,
    },
    searchBox: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.neutral100,
        borderRadius: radius._12,
        paddingHorizontal: spacingX._10,
        paddingVertical: Platform.OS === "ios" ? spacingY._7 : spacingY._5,
        gap: spacingX._7,
    },
    searchInput: {
        flex: 1,
        fontSize: scale(13.5),
        color: colors.neutral900,
        padding: 0,
    },
    iconBtn: {
        padding: spacingX._7,
        borderRadius: radius.full,
        backgroundColor: colors.neutral100,
    },
    centerContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: spacingX._30,
    },
    emptyIconCircle: {
        width: verticalScale(76),
        height: verticalScale(76),
        borderRadius: radius.full,
        backgroundColor: "#fef9c3",
        alignItems: "center",
        justifyContent: "center",
    },
    emptySubtitle: {
        textAlign: "center",
        marginTop: spacingY._7,
        lineHeight: 18,
    },
    listContent: {
        padding: spacingX._15,
        paddingBottom: spacingY._30,
        gap: spacingY._12,
    },
    card: {
        backgroundColor: colors.white,
        borderRadius: radius._15,
        padding: spacingX._12,
        borderWidth: 1,
        borderColor: colors.neutral200,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: spacingY._7,
    },
    senderRow: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    headerActions: {
        flexDirection: "row",
        alignItems: "center",
    },
    starBtn: {
        padding: spacingX._5,
    },
    attachmentPreview: {
        width: "100%",
        height: verticalScale(140),
        borderRadius: radius._10,
        overflow: "hidden",
        marginVertical: spacingY._7,
        backgroundColor: colors.neutral100,
    },
    thumbImage: {
        width: "100%",
        height: "100%",
    },
    fileRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.neutral100,
        borderRadius: radius._10,
        padding: spacingX._7,
        gap: spacingX._7,
        marginVertical: spacingY._5,
    },
    fileIconWrap: {
        width: verticalScale(30),
        height: verticalScale(30),
        borderRadius: radius._8,
        backgroundColor: colors.primaryLight,
        alignItems: "center",
        justifyContent: "center",
    },
    voiceRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacingX._7,
        backgroundColor: colors.primaryLight,
        paddingHorizontal: spacingX._10,
        paddingVertical: spacingY._7,
        borderRadius: radius._10,
        marginVertical: spacingY._5,
    },
    messageText: {
        marginVertical: spacingY._5,
        lineHeight: 19,
    },
    jumpRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: scale(3),
        marginTop: spacingY._7,
        paddingTop: spacingY._7,
        borderTopWidth: 1,
        borderTopColor: colors.neutral100,
    },
});
