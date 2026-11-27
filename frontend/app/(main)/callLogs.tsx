/**
 * frontend/app/(main)/callLogs.tsx
 *
 * Dedicated Call Logs & History Screen (V3.1.2 Flagship).
 * Provides WhatsApp-grade call logging with Missed call filters, duration, and 1-tap redial.
 */

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
    View,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
} from "react-native";
import { BubblyAlert } from "../../components/BubblyAlert";
import { useRouter } from "expo-router";
import * as Icons from "phosphor-react-native";
import ScreenWrapper from "../../components/ScreenWrapper";
import Typo from "../../components/Typo";
import BackButton from "../../components/BackButton";
import Avatar from "../../components/Avatar";
import { colors, radius, spacingX, spacingY } from "../../constants/theme";
import { scale, verticalScale } from "../../utils/styling";
import { hapticTap } from "../../utils/haptics";
import { useAuth } from "../../contexts/authContext";
import { getCallHistory } from "../../services/callService";
import { callInvite, onCallRinging, onCallFailed, isSocketConnected } from "../../socket/socketEvents";
import moment from "moment";

interface CallParticipant {
    _id: string;
    name: string;
    avatar?: string;
}

interface CallLogItem {
    _id: string;
    callerId: CallParticipant;
    calleeId: CallParticipant;
    conversationId?: {
        _id: string;
    } | string;
    status: "ongoing" | "ended" | "missed" | "rejected" | "failed" | "cancelled" | "declined" | "ringing";
    duration: number;
    kind: "voice" | "video";
    createdAt: string;
}

const formatCallDuration = (seconds: number): string => {
    if (!seconds || seconds <= 0) return "0s";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
};

const CallLogsScreen = () => {
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const [calls, setCalls] = useState<CallLogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<"all" | "missed">("all");
    const redialTargetRef = useRef<{ name: string; avatar: string } | null>(null);

    const fetchHistory = useCallback(async () => {
        try {
            const res = await getCallHistory(0);
            if (res.success && Array.isArray(res.data)) {
                setCalls(res.data);
            }
        } catch (error) {
            console.error("fetchHistory error:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchHistory();

        const ringingHandler = (data: any) => {
            if (!redialTargetRef.current) return;
            const target = redialTargetRef.current;
            redialTargetRef.current = null;
            router.push({
                pathname: "/(main)/callScreen",
                params: {
                    callId: data.callId,
                    kind: data.kind,
                    conversationId: data.conversationId,
                    remoteUserName: target.name || data.remoteUserName || "Contact",
                    remoteUserAvatar: target.avatar || data.remoteUserAvatar || "",
                    isOutgoing: "true",
                },
            });
        };

        const failedHandler = (data: any) => {
            if (!redialTargetRef.current) return;
            redialTargetRef.current = null;
            BubblyAlert.alert("Call Failed", data?.msg || "User is currently busy.");
        };

        onCallRinging(ringingHandler);
        onCallFailed(failedHandler);

        return () => {
            onCallRinging(ringingHandler, true);
            onCallFailed(failedHandler, true);
        };
    }, [fetchHistory, router]);

    const handleRedial = useCallback((item: CallLogItem) => {
        if (!currentUser) return;
        if (!isSocketConnected()) {
            BubblyAlert.alert("Offline", "Connect to the internet to place a call.");
            return;
        }
        const isCaller = item.callerId?._id === currentUser.id;
        const target = isCaller ? item.calleeId : item.callerId;
        const convId = typeof item.conversationId === "object" ? item.conversationId?._id : item.conversationId;

        if (!target?._id || !convId) {
            BubblyAlert.alert("Unable to redial", "Conversation information is unavailable.");
            return;
        }

        redialTargetRef.current = {
            name: target.name || "Contact",
            avatar: target.avatar || "",
        };

        hapticTap("boom");
        callInvite({
            conversationId: convId,
            calleeId: target._id,
            kind: item.kind || "voice",
        });
    }, [currentUser]);

    const filteredCalls = useMemo(() => {
        if (activeTab === "missed") {
            return calls.filter(c => ["missed", "rejected", "failed", "cancelled", "declined"].includes(c.status));
        }
        return calls;
    }, [calls, activeTab]);

    const renderCallItem = useCallback(({ item }: { item: CallLogItem }) => {
        if (!currentUser) return null;
        const isCaller = item.callerId?._id === currentUser.id;
        const otherUser = isCaller ? item.calleeId : item.callerId;
        const isMissed = ["missed", "rejected", "failed", "cancelled", "declined"].includes(item.status);
        const isVideo = item.kind === "video";
        const dateFormatted = moment(item.createdAt).calendar(null, {
            sameDay: "h:mm A",
            lastDay: "[Yesterday] h:mm A",
            lastWeek: "ddd h:mm A",
            sameElse: "MMM D, h:mm A",
        });

        return (
            <View style={styles.callRow}>
                <Avatar
                    uri={otherUser?.avatar}
                    size={verticalScale(44)}
                />
                <View style={styles.callInfo}>
                    <Typo
                        size={15}
                        fontWeight="600"
                        color={isMissed && !isCaller ? colors.rose : colors.neutral900}
                        textProps={{ numberOfLines: 1 }}
                    >
                        {otherUser?.name || "Unknown"}
                    </Typo>
                    <View style={styles.statusRow}>
                        {isCaller ? (
                            <Icons.ArrowUpRight
                                size={verticalScale(14)}
                                color={colors.primaryDark}
                                weight="bold"
                            />
                        ) : isMissed ? (
                            <Icons.ArrowDownLeft
                                size={verticalScale(14)}
                                color={colors.rose}
                                weight="bold"
                            />
                        ) : (
                            <Icons.ArrowDownLeft
                                size={verticalScale(14)}
                                color={colors.green}
                                weight="bold"
                            />
                        )}
                        <Typo size={12} color={colors.neutral400}>
                            {dateFormatted}
                        </Typo>
                        {item.status === "ended" && item.duration > 0 && (
                            <Typo size={12} color={colors.neutral500} style={{ marginLeft: scale(4) }}>
                                · {formatCallDuration(item.duration)}
                            </Typo>
                        )}
                        {isMissed && (
                            <Typo size={12} fontWeight="600" color={colors.rose} style={{ marginLeft: scale(4) }}>
                                · {item.status === "missed" ? "Missed" : item.status === "cancelled" ? "Cancelled" : item.status === "failed" ? "Failed" : "Declined"}
                            </Typo>
                        )}
                    </View>
                </View>

                {/* Redial Button */}
                <TouchableOpacity
                    style={styles.redialBtn}
                    onPress={() => handleRedial(item)}
                    activeOpacity={0.7}
                >
                    {isVideo ? (
                        <Icons.VideoCamera
                            size={verticalScale(20)}
                            color={colors.primaryDark}
                            weight="fill"
                        />
                    ) : (
                        <Icons.PhoneCall
                            size={verticalScale(20)}
                            color={colors.primaryDark}
                            weight="fill"
                        />
                    )}
                </TouchableOpacity>
            </View>
        );
    }, [currentUser, handleRedial]);

    return (
        <ScreenWrapper backgroundColor={colors.white} style={{ backgroundColor: colors.white }}>
            <View style={{ flex: 1, backgroundColor: colors.white }}>
            {/* Header */}
            <View style={styles.header}>
                <BackButton color={colors.neutral900} />
                <View style={styles.headerTitleWrap}>
                    <Typo size={19} fontWeight="700" color={colors.neutral900} textProps={{ numberOfLines: 1 }}>
                        Calls
                    </Typo>
                    <Typo size={11} color={colors.neutral400} textProps={{ numberOfLines: 1 }}>
                        {calls.length} total calls
                    </Typo>
                </View>

                {/* Segmented Filter */}
                <View style={styles.segmentedContainer}>
                    <TouchableOpacity
                        style={[styles.segmentBtn, activeTab === "all" && styles.segmentBtnActive]}
                        onPress={() => { hapticTap("medium"); setActiveTab("all"); }}
                        activeOpacity={0.8}
                    >
                        <Typo
                            size={12}
                            fontWeight="600"
                            color={activeTab === "all" ? colors.black : colors.neutral500}
                        >
                            All
                        </Typo>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.segmentBtn, activeTab === "missed" && styles.segmentBtnActive]}
                        onPress={() => { hapticTap("medium"); setActiveTab("missed"); }}
                        activeOpacity={0.8}
                    >
                        <Typo
                            size={12}
                            fontWeight="600"
                            color={activeTab === "missed" ? colors.rose : colors.neutral500}
                        >
                            Missed
                        </Typo>
                    </TouchableOpacity>
                </View>
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Typo size={13} color={colors.neutral400} style={{ marginTop: spacingY._10 }}>
                        Loading call logs...
                    </Typo>
                </View>
            ) : filteredCalls.length === 0 ? (
                <View style={styles.centerContainer}>
                    <View style={styles.emptyIconCircle}>
                        <Icons.PhoneSlash size={verticalScale(38)} color={colors.neutral400} weight="duotone" />
                    </View>
                    <Typo size={16} fontWeight="700" color={colors.neutral800} style={{ marginTop: spacingY._15 }}>
                        {activeTab === "missed" ? "No Missed Calls" : "No Call History Yet"}
                    </Typo>
                    <Typo size={12.5} color={colors.neutral400} style={styles.emptySubtitle}>
                        {activeTab === "missed"
                            ? "You don't have any missed or declined calls."
                            : "Connect with anyone on Bubbly using high-definition crystal clear audio and video calls."}
                    </Typo>
                </View>
            ) : (
                <FlatList
                    data={filteredCalls}
                    keyExtractor={(item, idx) => item._id || `call-${idx}`}
                    renderItem={renderCallItem}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => {
                                setRefreshing(true);
                                fetchHistory();
                            }}
                            colors={[colors.primary]}
                        />
                    }
                />
            )}
            </View>
        </ScreenWrapper>
    );
};

export default CallLogsScreen;

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
        minWidth: 0,
        marginLeft: spacingX._5,
    },
    segmentedContainer: {
        flexDirection: "row",
        flexShrink: 0,
        backgroundColor: colors.neutral100,
        borderRadius: radius.full,
        padding: scale(3),
    },
    segmentBtn: {
        paddingHorizontal: spacingX._12,
        paddingVertical: verticalScale(4),
        borderRadius: radius.full,
    },
    segmentBtnActive: {
        backgroundColor: colors.white,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    centerContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: spacingX._30,
    },
    emptyIconCircle: {
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
    listContent: {
        paddingVertical: spacingY._7,
    },
    callRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: spacingX._15,
        paddingVertical: spacingY._12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.neutral200,
    },
    callInfo: {
        flex: 1,
        minWidth: 0,
        marginLeft: spacingX._12,
        marginRight: spacingX._8,
    },
    statusRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        marginTop: verticalScale(3),
        gap: scale(4),
    },
    redialBtn: {
        width: verticalScale(40),
        height: verticalScale(40),
        borderRadius: radius.full,
        backgroundColor: colors.primaryLight,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
});
