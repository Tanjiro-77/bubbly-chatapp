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
    onUnreadCountUpdate,
    onUserStatus,
} from "../../socket/socketEvents";
import { verticalScale, scale } from "../../utils/styling";
import * as Icons from 'phosphor-react-native';
import { useRouter } from "expo-router";
import ConversationItem from "../../components/ConversationItem";
import Loading from "../../components/Loading";
import { ConversationProps, ResponseProps } from "../../types";
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import Avatar from '../../components/Avatar';

type FilterCategory = "all" | "unread" | "pinned";

const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning ☀️";
    if (hour < 17) return "Good afternoon 🌤️";
    return "Good evening 🌙";
};

const Home = () => {
    const { user: currentUser } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [selectedTab, setSelectedTab] = useState(0); // 0 = direct, 1 = group
    const [filterCategory, setFilterCategory] = useState<FilterCategory>("all");
    const [conversations, setConversations] = useState<ConversationProps[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearchActive, setIsSearchActive] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState<Record<string, boolean>>({});

    useEffect(() => {
        getConversations(processConversations);
        newConversation(newConversationHandler);
        newMessage(newMessageHandler);
        onUnreadCountUpdate(unreadCountHandler);
        onUserStatus(userStatusHandler);
        getConversations(null);

        return () => {
            getConversations(processConversations, true);
            newConversation(newConversationHandler, true);
            newMessage(newMessageHandler, true);
            onUnreadCountUpdate(unreadCountHandler, true);
            onUserStatus(userStatusHandler, true);
        };
    }, []);

    const userStatusHandler = (data: { userId: string; isOnline: boolean; lastSeen?: any }) => {
        if (data?.userId) {
            setOnlineUsers(prev => ({ ...prev, [data.userId]: data.isOnline }));
        }
    };

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

    // ── V3 Filter Chips (All, Unread, Pinned) ──
    const categorizedList = useMemo(() => {
        if (filterCategory === "unread") {
            return activeList.filter(c => (c.unreadCount || 0) > 0);
        }
        if (filterCategory === "pinned") {
            return activeList.filter(c => c.pinnedMessages && c.pinnedMessages.length > 0);
        }
        return activeList;
    }, [activeList, filterCategory]);

    // ── Search Filtering ──
    const filteredList = useMemo(() => {
        if (!searchQuery.trim()) return categorizedList;
        const q = searchQuery.toLowerCase().trim();
        return categorizedList.filter((item: ConversationProps) => {
            const nameMatch = item.name?.toLowerCase().includes(q);
            const messageMatch = item.lastMessage?.content?.toLowerCase().includes(q);
            const participantMatch = item.participants?.some(
                (p: any) => p.name?.toLowerCase().includes(q)
            );
            return nameMatch || messageMatch || participantMatch;
        });
    }, [searchQuery, categorizedList]);

    const totalUnreadDirect = directConversations.reduce(
        (sum, c) => sum + (c.unreadCount || 0), 0
    );
    const totalUnreadGroup = groupConversations.reduce(
        (sum, c) => sum + (c.unreadCount || 0), 0
    );
    const totalUnreadCurrent = selectedTab === 0 ? totalUnreadDirect : totalUnreadGroup;
    const totalPinnedCurrent = activeList.filter(c => c.pinnedMessages && c.pinnedMessages.length > 0).length;

    const handleSearchClose = () => {
        setSearchQuery("");
        setIsSearchActive(false);
    };

    const handleTabChange = (tab: number) => {
        setSelectedTab(tab);
        setSearchQuery("");
        setFilterCategory("all");
    };

    return (
        <ScreenWrapper showPattern={true} bgOpacity={0.4}>
            <View style={styles.container}>

                {/* ── V3 Flagship Header ── */}
                <Animated.View
                    entering={FadeInDown.duration(500).springify()}
                    style={styles.header}
                >
                    <View style={styles.headerLeft}>
                        <View style={styles.brandRow}>
                            <View style={styles.brandBadge}>
                                <Typo size={10} fontWeight="800" color={colors.neutral900}>
                                    V3.0
                                </Typo>
                            </View>
                            <Typo size={12.5} color={'rgba(255,255,255,0.6)'} fontWeight="500">
                                {getGreeting()}
                            </Typo>
                        </View>
                        <Typo
                            size={23}
                            color={colors.white}
                            fontWeight="800"
                            textProps={{ numberOfLines: 1 }}
                        >
                            {currentUser?.name || "Bubbly Chat"}
                        </Typo>
                    </View>

                    {/* Header Quick Actions */}
                    <View style={styles.headerActions}>
                        <TouchableOpacity
                            onPress={() => router.push("/(main)/settings")}
                            style={styles.headerIconBtn}
                            activeOpacity={0.75}
                        >
                            <Icons.GearSix size={verticalScale(20)} color={colors.white} weight="regular" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => router.push("/(main)/profileModel")}
                            activeOpacity={0.8}
                            style={styles.avatarBtn}
                        >
                            <Avatar uri={currentUser?.avatar || null} size={42} />
                            <View style={styles.avatarBadge} />
                        </TouchableOpacity>
                    </View>
                </Animated.View>

                {/* ── Main Sheet ── */}
                <Animated.View
                    entering={FadeInUp.duration(600).delay(100).springify()}
                    style={styles.content}
                >
                    {/* ── Story Bar ── */}
                    <StoryBar />

                    {/* ── V3 Segmented Tabs (Messages vs Groups) ── */}
                    <View style={styles.tabsRow}>
                        {/* Messages Tab */}
                        <TouchableOpacity
                            onPress={() => handleTabChange(0)}
                            style={[styles.tab, selectedTab === 0 && styles.tabActive]}
                            activeOpacity={0.75}
                        >
                            <Icons.ChatCircle
                                size={verticalScale(16)}
                                color={selectedTab === 0 ? colors.neutral900 : colors.neutral400}
                                weight={selectedTab === 0 ? "fill" : "regular"}
                            />
                            <Typo
                                size={13.5}
                                fontWeight={selectedTab === 0 ? "700" : "500"}
                                color={selectedTab === 0 ? colors.neutral900 : colors.neutral400}
                            >
                                Direct Messages
                            </Typo>
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
                                size={verticalScale(16)}
                                color={selectedTab === 1 ? colors.neutral900 : colors.neutral400}
                                weight={selectedTab === 1 ? "fill" : "regular"}
                            />
                            <Typo
                                size={13.5}
                                fontWeight={selectedTab === 1 ? "700" : "500"}
                                color={selectedTab === 1 ? colors.neutral900 : colors.neutral400}
                            >
                                Groups
                            </Typo>
                            {totalUnreadGroup > 0 && (
                                <View style={styles.tabBadge}>
                                    <Typo size={9} fontWeight="800" color={colors.white}>
                                        {totalUnreadGroup > 99 ? "99+" : totalUnreadGroup}
                                    </Typo>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* ── V3 Interactive Filter Chips (All, Unread, Pinned) ── */}
                    <View style={styles.filterChipsRow}>
                        <TouchableOpacity
                            style={[
                                styles.filterChip,
                                filterCategory === "all" && styles.filterChipActive,
                            ]}
                            onPress={() => setFilterCategory("all")}
                            activeOpacity={0.7}
                        >
                            <Typo
                                size={12}
                                fontWeight={filterCategory === "all" ? "700" : "500"}
                                color={filterCategory === "all" ? colors.neutral900 : colors.neutral500}
                            >
                                All ({activeList.length})
                            </Typo>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.filterChip,
                                filterCategory === "unread" && styles.filterChipActive,
                            ]}
                            onPress={() => setFilterCategory("unread")}
                            activeOpacity={0.7}
                        >
                            <Typo
                                size={12}
                                fontWeight={filterCategory === "unread" ? "700" : "500"}
                                color={filterCategory === "unread" ? colors.neutral900 : colors.neutral500}
                            >
                                Unread {totalUnreadCurrent > 0 ? `(${totalUnreadCurrent})` : ""}
                            </Typo>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.filterChip,
                                filterCategory === "pinned" && styles.filterChipActive,
                            ]}
                            onPress={() => setFilterCategory("pinned")}
                            activeOpacity={0.7}
                        >
                            <Icons.PushPin
                                size={verticalScale(11)}
                                color={filterCategory === "pinned" ? colors.primaryDark : colors.neutral400}
                                weight="fill"
                            />
                            <Typo
                                size={12}
                                fontWeight={filterCategory === "pinned" ? "700" : "500"}
                                color={filterCategory === "pinned" ? colors.neutral900 : colors.neutral500}
                            >
                                Pinned {totalPinnedCurrent > 0 ? `(${totalPinnedCurrent})` : ""}
                            </Typo>
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
                                        ? "Search messages or friends..."
                                        : "Search groups or topics..."
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

                    {/* ── Results Count ── */}
                    <View style={styles.countRow}>
                        {searchQuery.trim() ? (
                            <Typo size={12} color={colors.neutral400} fontWeight="500">
                                {filteredList.length === 0
                                    ? "No results"
                                    : `${filteredList.length} result${filteredList.length === 1 ? "" : "s"} for "${searchQuery}"`}
                            </Typo>
                        ) : (
                            filteredList.length > 0 && (
                                <Typo size={12} color={colors.neutral400} fontWeight="500">
                                    {filteredList.length}{" "}
                                    {selectedTab === 0
                                        ? filteredList.length === 1 ? "conversation" : "conversations"
                                        : filteredList.length === 1 ? "group" : "groups"}
                                </Typo>
                            )
                        )}
                    </View>

                    {/* ── Conversations List ── */}
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
                                    No {selectedTab === 0 ? "conversations" : "groups"} match "{searchQuery}"
                                </Typo>
                            </View>
                        )}

                        {/* Normal empty state */}
                        {!loading && !searchQuery.trim() && filteredList.length === 0 && (
                            <View style={styles.emptyState}>
                                <View style={styles.emptyIconWrap}>
                                    {selectedTab === 0 ? (
                                        <Icons.ChatCircleDots
                                            size={verticalScale(34)}
                                            color={colors.primaryDark}
                                            weight="regular"
                                        />
                                    ) : (
                                        <Icons.Users
                                            size={verticalScale(34)}
                                            color={colors.primaryDark}
                                            weight="regular"
                                        />
                                    )}
                                </View>
                                <Typo size={16} fontWeight="700" color={colors.neutral800}>
                                    {filterCategory !== "all"
                                        ? `No ${filterCategory} ${selectedTab === 0 ? "chats" : "groups"}`
                                        : selectedTab === 0
                                            ? "Your inbox is clear"
                                            : "No groups yet"}
                                </Typo>
                                <Typo
                                    size={13}
                                    color={colors.neutral400}
                                    style={{ textAlign: 'center', maxWidth: scale(260) }}
                                >
                                    {selectedTab === 0
                                        ? "Connect with your friends by tapping the start chat button below"
                                        : "Create a group conversation to share stories and plans together"}
                                </Typo>
                            </View>
                        )}

                        {/* Results list */}
                        {!loading && filteredList.map((item: ConversationProps, index) => {
                            const other = item.type === 'direct'
                                ? item.participants?.find((p: any) => p._id !== currentUser?.id)
                                : null;
                            const isOnline = other ? !!onlineUsers[other._id] : false;
                            return (
                                <ConversationItem
                                    item={item}
                                    key={item._id || index}
                                    router={router}
                                    showDivider={filteredList.length !== index + 1}
                                    searchQuery={searchQuery}
                                    isOnline={isOnline}
                                />
                            );
                        })}
                    </ScrollView>
                </Animated.View>
            </View>

            {/* ── Floating Action Button (FAB) ── */}
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
        paddingTop: spacingY._12,
        paddingBottom: spacingY._20,
    },
    headerLeft: {
        flex: 1,
        gap: verticalScale(2),
    },
    brandRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: scale(6),
        marginBottom: verticalScale(2),
    },
    brandBadge: {
        backgroundColor: colors.primary,
        paddingHorizontal: scale(5),
        paddingVertical: verticalScale(2),
        borderRadius: radius._6,
    },
    headerActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: scale(10),
    },
    headerIconBtn: {
        width: verticalScale(40),
        height: verticalScale(40),
        borderRadius: radius.full,
        backgroundColor: "rgba(255, 255, 255, 0.15)",
        alignItems: "center",
        justifyContent: "center",
    },
    avatarBtn: {
        position: "relative",
    },
    avatarBadge: {
        position: "absolute",
        bottom: 1,
        right: 1,
        width: verticalScale(12),
        height: verticalScale(12),
        borderRadius: radius.full,
        backgroundColor: colors.green,
        borderWidth: 2,
        borderColor: colors.white,
    },

    // Sheet
    content: {
        flex: 1,
        backgroundColor: colors.white,
        borderTopLeftRadius: radius._40,
        borderTopRightRadius: radius._40,
        borderCurve: "continuous",
        overflow: "hidden",
        paddingTop: spacingY._20,
    },

    // Segmented Tabs
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
        paddingVertical: verticalScale(10),
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
    tabBadge: {
        backgroundColor: colors.rose,
        borderRadius: radius.full,
        minWidth: scale(16),
        height: scale(16),
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: scale(4),
    },

    // Filter Chips
    filterChipsRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: spacingX._20,
        paddingTop: spacingY._12,
        gap: scale(8),
    },
    filterChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: scale(4),
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(6),
        borderRadius: radius.full,
        backgroundColor: colors.neutral100,
        borderWidth: 1,
        borderColor: "transparent",
    },
    filterChipActive: {
        backgroundColor: colors.primaryLight,
        borderColor: colors.primary,
    },

    // Search
    searchRow: {
        paddingHorizontal: spacingX._20,
        paddingTop: spacingY._12,
    },
    searchBar: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.neutral100,
        borderRadius: radius.full,
        paddingHorizontal: spacingX._15,
        paddingVertical: verticalScale(9),
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
        paddingTop: spacingY._10,
        paddingBottom: verticalScale(2),
        minHeight: verticalScale(24),
    },

    // List
    listContent: {
        paddingHorizontal: spacingX._20,
        paddingTop: spacingY._5,
        paddingBottom: verticalScale(110),
    },

    // Empty state
    emptyState: {
        alignItems: "center",
        gap: spacingY._10,
        paddingTop: verticalScale(50),
        paddingHorizontal: spacingX._30,
    },
    emptyIconWrap: {
        backgroundColor: colors.primaryLight,
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
        bottom: verticalScale(28),
        right: scale(24),
    },
    fab: {
        height: verticalScale(56),
        width: verticalScale(56),
        borderRadius: radius.full,
        backgroundColor: colors.primary,
        shadowColor: colors.primaryDark,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 6,
    },
});
