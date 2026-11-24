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
    Dimensions,
    Linking,
    Alert,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import * as Icons from "phosphor-react-native";
import { Image } from "expo-image";
import ScreenWrapper from "../../components/ScreenWrapper";
import Typo from "../../components/Typo";
import BackButton from "../../components/BackButton";
import { colors, radius, spacingX, spacingY } from "../../constants/theme";
import { scale, verticalScale } from "../../utils/styling";
import { getMessages } from "../../socket/socketEvents";
import { MessageProps, ResponseProps } from "../../types";
import moment from "moment";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const GRID_ITEM_SIZE = (SCREEN_WIDTH - scale(40)) / 3;

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const SharedMediaScreen = () => {
    const { conversationId, name } = useLocalSearchParams();
    const [messages, setMessages] = useState<MessageProps[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"media" | "docs" | "links">("media");
    const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);

    useEffect(() => {
        if (!conversationId) return;

        const handler = (res: ResponseProps) => {
            setLoading(false);
            if (res.success) {
                const list = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.messages) ? res.data.messages : []);
                setMessages(list);
            }
        };

        getMessages(handler);
        getMessages({ conversationId: conversationId as string, page: 0, limit: 100 });

        return () => {
            getMessages(handler, true);
        };
    }, [conversationId]);

    // Media list (Images)
    const mediaList = useMemo(() => {
        return messages.filter(
            m => m.type === "image" || (m.attachement && m.attachmentMeta?.mimeType?.startsWith("image/"))
        );
    }, [messages]);

    // Docs list
    const docsList = useMemo(() => {
        return messages.filter(
            m => m.type === "file" || (m.attachement && !m.attachmentMeta?.mimeType?.startsWith("image/"))
        );
    }, [messages]);

    // Links list
    const linksList = useMemo(() => {
        const links: Array<{ url: string; context: string; date: string; id: string }> = [];
        messages.forEach(m => {
            if (m.content) {
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
        try {
            const can = await Linking.canOpenURL(url);
            if (can) await Linking.openURL(url);
            else Alert.alert("Cannot open link", "No browser available to open this link.");
        } catch (_) {
            Alert.alert("Error", "Could not open link.");
        }
    };

    const handleOpenDoc = async (url?: string | null) => {
        if (!url) return;
        try {
            const can = await Linking.canOpenURL(url);
            if (can) await Linking.openURL(url);
            else Alert.alert("Cannot open file", "No application available to open this document.");
        } catch (_) {
            Alert.alert("Error", "Could not open file.");
        }
    };

    const renderMediaItem = useCallback(({ item }: { item: MessageProps }) => {
        const uri = item.attachmentMeta?.url || item.attachement;
        if (!uri) return null;
        return (
            <TouchableOpacity
                style={styles.gridItem}
                activeOpacity={0.8}
                onPress={() => setPreviewImageUri(uri)}
            >
                <Image source={{ uri }} style={styles.gridImage} contentFit="cover" />
            </TouchableOpacity>
        );
    }, []);

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
        <ScreenWrapper>
            {/* Header */}
            <View style={styles.header}>
                <BackButton />
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
                    onPress={() => setActiveTab("media")}
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
                    onPress={() => setActiveTab("docs")}
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
                    onPress={() => setActiveTab("links")}
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
                        style={styles.modalCloseBtn}
                        onPress={() => setPreviewImageUri(null)}
                        activeOpacity={0.8}
                    >
                        <Icons.X size={verticalScale(24)} color={colors.white} weight="bold" />
                    </TouchableOpacity>
                    {previewImageUri && (
                        <Image
                            source={{ uri: previewImageUri }}
                            style={styles.modalImage}
                            contentFit="contain"
                        />
                    )}
                </View>
            </Modal>
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
        width: GRID_ITEM_SIZE,
        height: GRID_ITEM_SIZE,
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
        borderRadius: radius._12,
        padding: spacingX._12,
        borderWidth: 1,
        borderColor: colors.neutral200,
        gap: spacingX._10,
    },
    docIconWrap: {
        width: verticalScale(40),
        height: verticalScale(40),
        borderRadius: radius._10,
        backgroundColor: colors.primaryLight,
        alignItems: "center",
        justifyContent: "center",
    },
    docInfo: {
        flex: 1,
    },
    linkCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.white,
        borderRadius: radius._12,
        padding: spacingX._12,
        borderWidth: 1,
        borderColor: colors.neutral200,
        gap: spacingX._10,
    },
    linkIconWrap: {
        width: verticalScale(40),
        height: verticalScale(40),
        borderRadius: radius._10,
        backgroundColor: colors.primaryLight,
        alignItems: "center",
        justifyContent: "center",
    },
    linkInfo: {
        flex: 1,
    },
    modalBg: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.92)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalCloseBtn: {
        position: "absolute",
        top: verticalScale(40),
        right: spacingX._20,
        zIndex: 10,
        padding: spacingX._7,
    },
    modalImage: {
        width: SCREEN_WIDTH,
        height: SCREEN_WIDTH * 1.3,
    },
});
