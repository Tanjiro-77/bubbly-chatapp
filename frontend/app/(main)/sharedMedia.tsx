/**
 * frontend/app/(main)/sharedMedia.tsx
 *
 * Dedicated Shared Media, Docs & Links Gallery Screen (V3.1.2 Flagship).
 * Groups all photos, documents, and web links shared in a conversation with WhatsApp-grade tabs.
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
    View,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Modal,
    Linking,
    useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BubblyAlert } from "../../components/BubblyAlert";
import { useLocalSearchParams } from "expo-router";
import * as Icons from "phosphor-react-native";
import { Image } from "expo-image";
import ScreenWrapper from "../../components/ScreenWrapper";
import Typo from "../../components/Typo";
import BackButton from "../../components/BackButton";
import { colors, radius, spacingX, spacingY } from "../../constants/theme";
import { scale, verticalScale } from "../../utils/styling";
import { getMessages, isSocketConnected, onSocketConnectionChange } from "../../socket/socketEvents";
import { MessageProps, ResponseProps } from "../../types";
import { hapticTap } from "../../utils/haptics";
import moment from "moment";

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const SharedMediaScreen = () => {
    const { conversationId, name } = useLocalSearchParams();
    const insets = useSafeAreaInsets();
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();
    const gridItemSize = Math.floor((screenWidth - spacingX._15 * 2 - scale(5) * 2) / 3);
    const [messages, setMessages] = useState<MessageProps[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"media" | "docs" | "links">("media");
    const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);

    useEffect(() => {
        const convIdStr = Array.isArray(conversationId) ? conversationId[0] : conversationId;
        if (!convIdStr) {
            setLoading(false);
            return;
        }

        let fetched = false;
        const timer = setTimeout(() => setLoading(false), 6000);
        const handler = (res: ResponseProps) => {
            if ((res as any).conversationId && (res as any).conversationId !== convIdStr) return;
            fetched = true;
            clearTimeout(timer);
            setLoading(false);
            if (res.success) {
                const list = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.messages) ? res.data.messages : []);
                setMessages(list);
            }
        };

        getMessages(handler);
        const unsubConn = onSocketConnectionChange((connected) => {
            if (connected && !fetched) {
                getMessages({ conversationId: convIdStr, page: 0, limit: 50 });
            }
        });
        if (isSocketConnected()) {
            getMessages({ conversationId: convIdStr, page: 0, limit: 50 });
        }

        return () => {
            clearTimeout(timer);
            unsubConn();
            getMessages(handler, true);
        };
    }, [conversationId]);

    // Media list (Images + Videos) — exclude View-Once & deleted messages
    const mediaList = useMemo(() => {
        return messages.filter(
            m =>
                !m.isDeleted &&
                !m.isViewOnce &&
                (m.type === "image" ||
                    m.type === "video" ||
                    (m.attachement &&
                        (m.attachmentMeta?.mimeType?.startsWith("image/") ||
                            m.attachmentMeta?.mimeType?.startsWith("video/"))))
        );
    }, [messages]);

    // Docs list
    const docsList = useMemo(() => {
        return messages.filter(
            m =>
                !m.isDeleted &&
                !m.isViewOnce &&
                (m.type === "file" ||
                    (m.attachement &&
                        m.type !== "image" &&
                        m.type !== "video" &&
                        !m.attachmentMeta?.mimeType?.startsWith("image/") &&
                        !m.attachmentMeta?.mimeType?.startsWith("video/")))
        );
    }, [messages]);

    // Links list
    const linksList = useMemo(() => {
        const links: Array<{ url: string; context: string; date: string; id: string }> = [];
        messages.forEach(m => {
            if (!m.isDeleted && m.content) {
                const matches = m.content.match(URL_REGEX);
                if (matches) {
                    matches.forEach((u, i) => {
                        links.push({
                            url: u,
                            context: m.content || "",
                            date: m.createdAt,
                            id: `${m.id}-${i}`,
                        });
                    });
                }
            }
        });
        return links;
    }, [messages]);

    const handleOpenLink = async (url: string) => {
        hapticTap("medium");
        try {
            const can = await Linking.canOpenURL(url);
            if (can) await Linking.openURL(url);
            else BubblyAlert.alert("Cannot open link", "No browser available to open this link.");
        } catch (_) {
            BubblyAlert.alert("Error", "Could not open link.");
        }
    };

    const handleOpenDoc = async (url?: string | null) => {
        if (!url) return;
        hapticTap("medium");
        try {
            const can = await Linking.canOpenURL(url);
            if (can) await Linking.openURL(url);
            else BubblyAlert.alert("Cannot open file", "No application available to open this document.");
        } catch (_) {
            BubblyAlert.alert("Error", "Could not open file.");
        }
    };

    const renderMediaItem = useCallback(({ item }: { item: MessageProps }) => {
        const uri = item.attachmentMeta?.url || item.attachement;
        if (!uri) return null;
        const isVideo = item.type === "video" || item.attachmentMeta?.mimeType?.startsWith("video/");
        return (
            <TouchableOpacity
                style={[styles.gridItem, { width: gridItemSize, height: gridItemSize }]}
                activeOpacity={0.8}
                onPress={() => {
                    hapticTap("medium");
                    if (isVideo) {
                        Linking.openURL(uri).catch(() => BubblyAlert.alert("Error", "Could not open video."));
                    } else {
                        setPreviewImageUri(uri);
                    }
                }}
            >
                <Image source={{ uri }} style={styles.gridImage} contentFit="cover" />
                {isVideo && (
                    <View style={{ position: "absolute", top: 6, right: 6, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 12, padding: 4 }}>
                        <Icons.Play size={14} color="#fff" weight="fill" />
                    </View>
                )}
            </TouchableOpacity>
        );
    }, [gridItemSize]);

    const renderDocItem = useCallback(({ item }: { item: MessageProps }) => {
        const uri = item.attachmentMeta?.url || item.attachement;
        const fileName = item.attachmentMeta?.name || "Document";
        const fileSize = formatFileSize(item.attachmentMeta?.size);
        const dateStr = moment(item.createdAt).format("MMM D, YYYY");

        return (
            <TouchableOpacity
                style={styles.docRow}
                activeOpacity={0.7}
                onPress={() => handleOpenDoc(uri)}
            >
                <View style={styles.docIconWrap}>
                    <Icons.FileText size={verticalScale(22)} color={colors.primaryDark} weight="fill" />
                </View>
                <View style={styles.docInfo}>
                    <Typo size={14} fontWeight="600" color={colors.neutral800} textProps={{ numberOfLines: 1 }}>
                        {fileName}
                    </Typo>
                    <Typo size={12} color={colors.neutral400} style={{ marginTop: verticalScale(2) }}>
                        {fileSize} · {dateStr}
                    </Typo>
                </View>
                <Icons.ArrowSquareOut size={verticalScale(18)} color={colors.neutral400} />
            </TouchableOpacity>
        );
    }, []);

    const renderLinkItem = useCallback(({ item }: { item: { url: string; context: string; date: string; id: string } }) => {
        let domain = item.url;
        try {
            const parsed = new URL(item.url);
            domain = parsed.hostname;
        } catch (_) {}

        return (
            <TouchableOpacity
                style={styles.linkCard}
                activeOpacity={0.7}
                onPress={() => handleOpenLink(item.url)}
            >
                <View style={styles.linkIconWrap}>
                    <Icons.Link size={verticalScale(20)} color={colors.primaryDark} weight="bold" />
                </View>
                <View style={styles.linkInfo}>
                    <Typo size={14} fontWeight="600" color={colors.neutral900} textProps={{ numberOfLines: 1 }}>
                        {domain}
                    </Typo>
                    <Typo size={12} color={colors.primaryDark} textProps={{ numberOfLines: 1 }} style={{ marginTop: verticalScale(2) }}>
                        {item.url}
                    </Typo>
                    <Typo size={11.5} color={colors.neutral400} textProps={{ numberOfLines: 1 }} style={{ marginTop: verticalScale(2) }}>
                        {moment(item.date).format("MMM D, YYYY")}
                    </Typo>
                </View>
                <Icons.CaretRight size={verticalScale(16)} color={colors.neutral400} />
            </TouchableOpacity>
        );
    }, []);

    return (
        <ScreenWrapper backgroundColor={colors.white} style={{ backgroundColor: colors.white }}>
            <View style={{ flex: 1, backgroundColor: colors.white }}>
            {/* Header */}
            <View style={styles.header}>
                <BackButton color={colors.neutral900} />
                <View style={styles.headerTitleWrap}>
                    <Typo size={18} fontWeight="700" color={colors.neutral900} textProps={{ numberOfLines: 1 }}>
                        Shared Content
                    </Typo>
                    <Typo size={12} color={colors.neutral400} textProps={{ numberOfLines: 1 }}>
                        {name || "Conversation"}
                    </Typo>
                </View>
            </View>

            {/* Segmented Tabs */}
            <View style={styles.tabsRow}>
                <TouchableOpacity
                    style={[styles.tabBtn, activeTab === "media" && styles.tabBtnActive]}
                    onPress={() => { hapticTap("medium"); setActiveTab("media"); }}
                    activeOpacity={0.8}
                >
                    <Typo
                        size={13}
                        fontWeight="600"
                        color={activeTab === "media" ? colors.black : colors.neutral500}
                    >
                        Media ({mediaList.length})
                    </Typo>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabBtn, activeTab === "docs" && styles.tabBtnActive]}
                    onPress={() => { hapticTap("medium"); setActiveTab("docs"); }}
                    activeOpacity={0.8}
                >
                    <Typo
                        size={13}
                        fontWeight="600"
                        color={activeTab === "docs" ? colors.black : colors.neutral500}
                    >
                        Docs ({docsList.length})
                    </Typo>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabBtn, activeTab === "links" && styles.tabBtnActive]}
                    onPress={() => { hapticTap("medium"); setActiveTab("links"); }}
                    activeOpacity={0.8}
                >
                    <Typo
                        size={13}
                        fontWeight="600"
                        color={activeTab === "links" ? colors.black : colors.neutral500}
                    >
                        Links ({linksList.length})
                    </Typo>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Typo size={13} color={colors.neutral400} style={{ marginTop: spacingY._10 }}>
                        Loading shared media...
                    </Typo>
                </View>
            ) : activeTab === "media" ? (
                mediaList.length === 0 ? (
                    <View style={styles.centerContainer}>
                        <View style={styles.emptyCircle}>
                            <Icons.Images size={verticalScale(38)} color={colors.neutral400} weight="duotone" />
                        </View>
                        <Typo size={16} fontWeight="700" color={colors.neutral800} style={{ marginTop: spacingY._15 }}>
                            No Media Shared
                        </Typo>
                        <Typo size={12.5} color={colors.neutral400} style={styles.emptySubtitle}>
                            Photos and videos sent in this chat will appear here.
                        </Typo>
                    </View>
                ) : (
                    <FlatList
                        data={mediaList}
                        keyExtractor={item => item.id}
                        numColumns={3}
                        renderItem={renderMediaItem}
                        contentContainerStyle={styles.gridContainer}
                        columnWrapperStyle={styles.columnWrapper}
                    />
                )
            ) : activeTab === "docs" ? (
                docsList.length === 0 ? (
                    <View style={styles.centerContainer}>
                        <View style={styles.emptyCircle}>
                            <Icons.FileDoc size={verticalScale(38)} color={colors.neutral400} weight="duotone" />
                        </View>
                        <Typo size={16} fontWeight="700" color={colors.neutral800} style={{ marginTop: spacingY._15 }}>
                            No Documents Shared
                        </Typo>
                        <Typo size={12.5} color={colors.neutral400} style={styles.emptySubtitle}>
                            Documents and files sent in this chat will appear here.
                        </Typo>
                    </View>
                ) : (
                    <FlatList
                        data={docsList}
                        keyExtractor={item => item.id}
                        renderItem={renderDocItem}
                        contentContainerStyle={styles.listContainer}
                    />
                )
            ) : (
                linksList.length === 0 ? (
                    <View style={styles.centerContainer}>
                        <View style={styles.emptyCircle}>
                            <Icons.LinkSimple size={verticalScale(38)} color={colors.neutral400} weight="duotone" />
                        </View>
                        <Typo size={16} fontWeight="700" color={colors.neutral800} style={{ marginTop: spacingY._15 }}>
                            No Links Shared
                        </Typo>
                        <Typo size={12.5} color={colors.neutral400} style={styles.emptySubtitle}>
                            Web links shared in this chat will appear here.
                        </Typo>
                    </View>
                ) : (
                    <FlatList
                        data={linksList}
                        keyExtractor={item => item.id}
                        renderItem={renderLinkItem}
                        contentContainerStyle={styles.listContainer}
                    />
                )
            )}

            {/* Fullscreen Image Preview Modal */}
            <Modal
                visible={!!previewImageUri}
                transparent
                animationType="fade"
                onRequestClose={() => setPreviewImageUri(null)}
            >
                <View style={styles.modalBg}>
                    <TouchableOpacity
                        style={[styles.modalCloseBtn, { top: Math.max(insets.top, spacingY._20) + spacingY._10 }]}
                        onPress={() => setPreviewImageUri(null)}
                        activeOpacity={0.8}
                    >
                        <Icons.X size={verticalScale(24)} color={colors.white} weight="bold" />
                    </TouchableOpacity>
                    {previewImageUri && (
                        <Image
                            source={{ uri: previewImageUri }}
                            style={{ width: screenWidth, height: screenHeight * 0.78 }}
                            contentFit="contain"
                        />
                    )}
                </View>
            </Modal>
            </View>
        </ScreenWrapper>
    );
};

export default SharedMediaScreen;

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
    tabsRow: {
        flexDirection: "row",
        backgroundColor: colors.neutral100,
        marginHorizontal: spacingX._15,
        marginVertical: spacingY._10,
        borderRadius: radius._12,
        padding: scale(3),
    },
    tabBtn: {
        flex: 1,
        alignItems: "center",
        paddingVertical: verticalScale(8),
        borderRadius: radius._10,
    },
    tabBtnActive: {
        backgroundColor: colors.white,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
        elevation: 2,
    },
    centerContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: spacingX._30,
    },
    emptyCircle: {
        width: verticalScale(74),
        height: verticalScale(74),
        borderRadius: radius.full,
        backgroundColor: colors.neutral100,
        alignItems: "center",
        justifyContent: "center",
    },
    emptySubtitle: {
        textAlign: "center",
        marginTop: spacingY._7,
        lineHeight: 18,
    },
    gridContainer: {
        paddingHorizontal: spacingX._15,
        paddingBottom: spacingY._20,
    },
    columnWrapper: {
        gap: scale(5),
        marginBottom: scale(5),
    },
    gridItem: {
        borderRadius: radius._10,
        overflow: "hidden",
        backgroundColor: colors.neutral100,
    },
    gridImage: {
        width: "100%",
        height: "100%",
    },
    listContainer: {
        paddingHorizontal: spacingX._15,
        paddingBottom: spacingY._20,
        gap: spacingY._10,
    },
    docRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.white,
        borderRadius: radius._15,
        padding: spacingX._12,
        borderWidth: 1,
        borderColor: colors.cardBorderSubtle,
        gap: spacingX._10,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 5,
        elevation: 1,
    },
    docIconWrap: {
        width: verticalScale(40),
        height: verticalScale(40),
        borderRadius: radius._12,
        backgroundColor: colors.primaryLight,
        alignItems: "center",
        justifyContent: "center",
    },
    docInfo: {
        flex: 1,
        minWidth: 0,
    },
    linkCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.white,
        borderRadius: radius._15,
        padding: spacingX._12,
        borderWidth: 1,
        borderColor: colors.cardBorderSubtle,
        gap: spacingX._10,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 5,
        elevation: 1,
    },
    linkIconWrap: {
        width: verticalScale(40),
        height: verticalScale(40),
        borderRadius: radius._12,
        backgroundColor: colors.primaryLight,
        alignItems: "center",
        justifyContent: "center",
    },
    linkInfo: {
        flex: 1,
        minWidth: 0,
    },
    modalBg: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.92)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalCloseBtn: {
        position: "absolute",
        right: spacingX._20,
        zIndex: 10,
        padding: spacingX._7,
        backgroundColor: "rgba(255,255,255,0.12)",
        borderRadius: radius.full,
    },
});
