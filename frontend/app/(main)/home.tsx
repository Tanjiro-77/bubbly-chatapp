import { ScrollView, StyleSheet, TouchableOpacity, View, TextInput } from 'react-native';
import React, { useEffect, useState, useMemo } from 'react';
import ScreenWrapper from "../../components/ScreenWrapper";
import Typo from "../../components/Typo";
import { colors, radius, spacingX, spacingY } from "../../constants/theme";
import { useAuth } from "../../contexts/authContext";
import Button from "../../components/Button";
import StoryBar from '../../components/StoryBar';
import {
    getConversations, newConversation, newMessage,
    onUnreadCountUpdate,                              // ← NEW
} from "../../socket/socketEvents";
import { verticalScale, scale } from "../../utils/styling";
import * as Icons from 'phosphor-react-native';
import { useRouter } from "expo-router";
import ConversationItem from "../../components/ConversationItem";
import Loading from "../../components/Loading";
import { ConversationProps, ResponseProps } from "../../types";
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import Avatar from '../../components/Avatar';

const Home = () => {
    const { user: currentUser } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [selectedTab, setSelectedTab] = useState(0);
    const [conversations, setConversations] = useState<ConversationProps[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearchActive, setIsSearchActive] = useState(false);

    useEffect(() => {
        getConversations(processConversations);
        newConversation(newConversationHandler);
        newMessage(newMessageHandler);
        onUnreadCountUpdate(unreadCountHandler);     // ← NEW
        getConversations(null);

        return () => {
            getConversations(processConversations, true);
            newConversation(newConversationHandler, true);
            newMessage(newMessageHandler, true);
            onUnreadCountUpdate(unreadCountHandler, true); // ← NEW
        };
    }, []);

    const newMessageHandler = (res: ResponseProps) => {
        if (res.success) {
            const conversationId = res.data.conversationId;
            setConversations((prev) =>
                prev.map((item) => {
                    if (item._id == conversationId) {
                        return { ...item, lastMessage: res.data };
                    }
                    return item;
                })
            );
        }
    };

    const processConversations = (res: ResponseProps) => {
        if (res.success) setConversations(res.data);
    };

    const newConversationHandler = (res: ResponseProps) => {
        if (res.success && res.data?.isNew) {
            setConversations((prev) => [res.data, ...prev]);
        }
    };

    // ── NEW: update unread count for a specific conversation ──
    const unreadCountHandler = (data: {
        conversationId: string;
        unreadCount: number;
    }) => {
        setConversations(prev =>
            prev.map(item =>
                item._id === data.conversationId
                    ? { ...item, unreadCount: data.unreadCount }
                    : item
            )
        );
    };

    const sortByDate = (a: ConversationProps, b: ConversationProps) => {
        const aDate = a?.lastMessage?.createdAt || a.createdAt;
        const bDate = b?.lastMessage?.createdAt || b.createdAt;
        return new Date(bDate).getTime() - new Date(aDate).getTime();
    };

    const directConversations = conversations
        .filter((item) => item.type === "direct")
        .sort(sortByDate);

    const groupConversations = conversations
        .filter((item) => item.type === "group")
        .sort(sortByDate);

    const activeList = selectedTab === 0 ? directConversations : groupConversations;

    const filteredList = useMemo(() => {
        if (!searchQuery.trim()) return activeList;
        const q = searchQuery.toLowerCase().trim();
        return activeList.filter((item: ConversationProps) => {
            const nameMatch = item.name?.toLowerCase().includes(q);
            const messageMatch = item.lastMessage?.content?.toLowerCase().includes(q);
            const participantMatch = item.participants?.some(
                (p: any) => p.name?.toLowerCase().includes(q)
            );
            return nameMatch || messageMatch || participantMatch;
        });
    }, [searchQuery, activeList]);

    // ── NEW: total unread across all conversations ──
    const totalUnreadDirect = directConversations.reduce(
        (sum, c) => sum + (c.unreadCount || 0), 0
    );
    const totalUnreadGroup = groupConversations.reduce(
        (sum, c) => sum + (c.unreadCount || 0), 0
    );

    const handleSearchClose = () => {
        setSearchQuery("");
        setIsSearchActive(false);
    };

    const handleTabChange = (tab: number) => {
        setSelectedTab(tab);
        setSearchQuery("");
    };

    return (
        <ScreenWrapper showPattern={true} bgOpacity={0.4}>
            <View style={styles.container}>

                {/* ── Header ── */}
                <Animated.View
                    entering={FadeInDown.duration(500).springify()}
                    style={styles.header}
                >
                    <View style={styles.headerLeft}>
                        <Typo size={13} color={'rgba(255,255,255,0.55)'} fontWeight="500">
                            Welcome back 👋
                        </Typo>
                        <Typo
                            size={22}
                            color={colors.white}
                            fontWeight="800"
                            textProps={{ numberOfLines: 1 }}
                        >
                            {currentUser?.name}
                        </Typo>
                    </View>

                    <TouchableOpacity
                        onPress={() => router.push("/(main)/profileModel")}
                        activeOpacity={0.8}
                        style={styles.avatarBtn}
                    >
                        <Avatar uri={currentUser?.avatar || null} size={40} />
                        <View style={styles.avatarBadge} />
                    </TouchableOpacity>
                </Animated.View>

                {/* ── White Sheet ── */}
                <Animated.View
                    entering={FadeInUp.duration(600).delay(100).springify()}
                    style={styles.content}
                >

                    {/* ── Story Bar ── */}
                    <StoryBar />

                    {/* ── Tabs ── */}
                    <View style={styles.tabsRow}>

                        {/* Messages Tab */}
                        <TouchableOpacity
                            onPress={() => handleTabChange(0)}
                            style={[styles.tab, selectedTab === 0 && styles.tabActive]}
                            activeOpacity={0.75}
                        >
                            <Icons.ChatCircle
                                size={verticalScale(15)}
                                color={selectedTab === 0 ? colors.neutral900 : colors.neutral400}
                                weight={selectedTab === 0 ? "fill" : "regular"}
                            />
                            <Typo
                                size={13}
                                fontWeight={selectedTab === 0 ? "700" : "500"}
                                color={selectedTab === 0 ? colors.neutral900 : colors.neutral400}
                            >
                                Messages
                            </Typo>
                            {/* ── NEW: unread badge on tab ── */}
                            {totalUnreadDirect > 0 && (
                                <View style={styles.tabBadge}>
                                    <Typo size={9} fontWeight="800" color={colors.white}>
                                        {totalUnreadDirect > 99 ? "99+" : totalUnreadDirect}
                                    </Typo>
                                </View>
                            )}
                        </TouchableOpacity>

                        {/* Groups Tab */}
                        <TouchableOpacity
                            onPress={() => handleTabChange(1)}
                            style={[styles.tab, selectedTab === 1 && styles.tabActive]}
                            activeOpacity={0.75}
                        >
                            <Icons.Users
                                size={verticalScale(15)}
                                color={selectedTab === 1 ? colors.neutral900 : colors.neutral400}
                                weight={selectedTab === 1 ? "fill" : "regular"}
                            />
                            <Typo
                                size={13}
                                fontWeight={selectedTab === 1 ? "700" : "500"}
                                color={selectedTab === 1 ? colors.neutral900 : colors.neutral400}
                            >
                                Groups
                            </Typo>
                            {/* ── NEW: unread badge on tab ── */}
                            {totalUnreadGroup > 0 && (
                                <View style={styles.tabBadge}>
                                    <Typo size={9} fontWeight="800" color={colors.white}>
                                        {totalUnreadGroup > 99 ? "99+" : totalUnreadGroup}
                                    </Typo>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* ── Search Bar ── */}
                    <View style={styles.searchRow}>
                        <View style={[
                            styles.searchBar,
                            isSearchActive && styles.searchBarActive
                        ]}>
                            <Icons.MagnifyingGlass
                                size={verticalScale(16)}
                                color={isSearchActive ? colors.neutral700 : colors.neutral400}
                                weight={isSearchActive ? "bold" : "regular"}
                            />
                            <TextInput
                                style={styles.searchInput}
                                placeholder={
                                    selectedTab === 0
                                        ? "Search messages..."
                                        : "Search groups..."
                                }
                                placeholderTextColor={colors.neutral400}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                onFocus={() => setIsSearchActive(true)}
                                onBlur={() => setIsSearchActive(false)}
                                returnKeyType="search"
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity
                                    onPress={handleSearchClose}
                                    activeOpacity={0.7}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                    <View style={styles.clearBtn}>
                                        <Icons.X
                                            size={verticalScale(10)}
                                            color={colors.white}
                                            weight="bold"
                                        />
                                    </View>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {/* ── Count row ── */}
                    <View style={styles.countRow}>
                        {searchQuery.trim() ? (
                            <Typo size={12} color={colors.neutral400} fontWeight="500">
                                {filteredList.length === 0
                                    ? "No results"
                                    : `${filteredList.length} result${filteredList.length === 1 ? "" : "s"} for "${searchQuery}"`}
                            </Typo>
                        ) : (
                            activeList.length > 0 && (
                                <Typo size={12} color={colors.neutral400} fontWeight="500">
                                    {activeList.length}{" "}
                                    {selectedTab === 0
                                        ? activeList.length === 1 ? "conversation" : "conversations"
                                        : activeList.length === 1 ? "group" : "groups"}
                                </Typo>
                            )
                        )}
                    </View>

                    {/* ── List ── */}
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.listContent}
                        keyboardShouldPersistTaps="handled"
                    >
                        {loading && (
                            <View style={styles.centerState}>
                                <Loading />
                            </View>
                        )}

                        {/* Search empty state */}
                        {!loading && searchQuery.trim() && filteredList.length === 0 && (
                            <View style={styles.emptyState}>
                                <View style={styles.emptyIconWrap}>
                                    <Icons.MagnifyingGlass
                                        size={verticalScale(30)}
                                        color={colors.neutral300}
                                        weight="regular"
                                    />
                                </View>
                                <Typo size={15} fontWeight="600" color={colors.neutral600}>
                                    No results found
                                </Typo>
                                <Typo
                                    size={13}
                                    color={colors.neutral400}
                                    style={{ textAlign: 'center' }}
                                >
                                    No {selectedTab === 0 ? "conversations" : "groups"} match{" "}
                                    <Typo size={13} fontWeight="600" color={colors.neutral600}>
                                        "{searchQuery}"
                                    </Typo>
                                </Typo>
                            </View>
                        )}

                        {/* Normal empty state */}
                        {!loading && !searchQuery.trim() && activeList.length === 0 && (
                            <View style={styles.emptyState}>
                                <View style={styles.emptyIconWrap}>
                                    {selectedTab === 0 ? (
                                        <Icons.ChatCircleDots
                                            size={verticalScale(32)}
                                            color={colors.neutral300}
                                            weight="regular"
                                        />
                                    ) : (
                                        <Icons.Users
                                            size={verticalScale(32)}
                                            color={colors.neutral300}
                                            weight="regular"
                                        />
                                    )}
                                </View>
                                <Typo size={15} fontWeight="600" color={colors.neutral600}>
                                    {selectedTab === 0 ? "No messages yet" : "No groups yet"}
                                </Typo>
                                <Typo
                                    size={13}
                                    color={colors.neutral400}
                                    style={{ textAlign: 'center' }}
                                >
                                    {selectedTab === 0
                                        ? "Start a conversation by tapping the button below"
                                        : "Create a group to chat with multiple people"}
                                </Typo>
                            </View>
                        )}

                        {/* ── Results ── */}
                        {!loading && filteredList.map((item: ConversationProps, index) => (
                            <ConversationItem
                                item={item}
                                key={item._id || index}
                                router={router}
                                showDivider={filteredList.length !== index + 1}
                                searchQuery={searchQuery}
                            />
                        ))}
                    </ScrollView>
                </Animated.View>
            </View>

            {/* ── FAB ── */}
            <Animated.View
                entering={FadeInUp.duration(500).delay(300).springify()}
                style={styles.fabWrap}
            >
                <Button
                    style={styles.fab}
                    onPress={() => router.push({
                        pathname: "/(main)/newConversationModal",
                        params: { isGroup: selectedTab }
                    })}
                >
                    <Icons.Plus
                        color={colors.black}
                        weight="bold"
                        size={verticalScale(22)}
                    />
                </Button>
            </Animated.View>

        </ScreenWrapper>
    );
};

export default Home;

const styles = StyleSheet.create({
    container: { flex: 1 },

    // Header
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: spacingX._20,
        paddingTop: spacingY._15,
        paddingBottom: spacingY._25,
    },
    headerLeft: {
        flex: 1,
        gap: spacingY._5,
    },
    avatarBtn: {
        position: "relative",
    },
    avatarBadge: {
        position: "absolute",
        bottom: 1,
        right: 1,
        width: verticalScale(11),
        height: verticalScale(11),
        borderRadius: radius.full,
        backgroundColor: colors.green,
        borderWidth: 2,
        borderColor: colors.white,
    },

    // White sheet
    content: {
        flex: 1,
        backgroundColor: colors.white,
        borderTopLeftRadius: radius._50,
        borderTopRightRadius: radius._50,
        borderCurve: "continuous",
        overflow: "hidden",
        paddingTop: spacingY._25,
    },

    // Tabs
    tabsRow: {
        flexDirection: "row",
        marginHorizontal: spacingX._20,
        backgroundColor: colors.neutral100,
        borderRadius: radius.full,
        padding: 4,
        gap: 4,
    },
    tab: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: spacingY._10,
        borderRadius: radius.full,
    },
    tabActive: {
        backgroundColor: colors.white,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    // ── NEW: badge on tab ──
    tabBadge: {
        backgroundColor: colors.rose,
        borderRadius: radius.full,
        minWidth: scale(16),
        height: scale(16),
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: scale(4),
    },

    // Search
    searchRow: {
        paddingHorizontal: spacingX._20,
        paddingTop: spacingY._15,
    },
    searchBar: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.neutral100,
        borderRadius: radius.full,
        paddingHorizontal: spacingX._15,
        paddingVertical: verticalScale(10),
        gap: spacingX._10,
        borderWidth: 1,
        borderColor: colors.neutral100,
    },
    searchBarActive: {
        borderColor: colors.primary,
        backgroundColor: colors.white,
    },
    searchInput: {
        flex: 1,
        fontSize: verticalScale(14),
        color: colors.neutral900,
        padding: 0,
    },
    clearBtn: {
        backgroundColor: colors.neutral400,
        borderRadius: radius.full,
        width: verticalScale(17),
        height: verticalScale(17),
        alignItems: "center",
        justifyContent: "center",
    },

    // Count
    countRow: {
        paddingHorizontal: spacingX._20,
        paddingTop: spacingY._12,
        paddingBottom: spacingY._5,
        minHeight: verticalScale(28),
    },

    // List
    listContent: {
        paddingHorizontal: spacingX._20,
        paddingTop: spacingY._10,
        paddingBottom: verticalScale(100),
    },

    // Empty
    emptyState: {
        alignItems: "center",
        gap: spacingY._12,
        paddingTop: verticalScale(60),
        paddingHorizontal: spacingX._30,
    },
    emptyIconWrap: {
        backgroundColor: colors.neutral100,
        padding: spacingY._20,
        borderRadius: radius._30,
        marginBottom: spacingY._5,
    },
    centerState: {
        paddingTop: verticalScale(80),
        alignItems: "center",
    },

    // FAB
    fabWrap: {
        position: "absolute",
        bottom: verticalScale(30),
        right: verticalScale(25),
    },
    fab: {
        height: verticalScale(54),
        width: verticalScale(54),
        borderRadius: radius.full,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 6,
    },
});