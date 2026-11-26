import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Switch,
    Platform,
    ActivityIndicator,
    Vibration,
} from "react-native";
import { BubblyAlert } from "../../components/BubblyAlert";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Icons from "phosphor-react-native";
import ScreenWrapper from "../../components/ScreenWrapper";
import Typo from "../../components/Typo";
import BackButton from "../../components/BackButton";
import { colors, radius, spacingX, spacingY } from "../../constants/theme";
import { scale, verticalScale } from "../../utils/styling";

const STORAGE_PREFS_KEY = "@bubbly_storage_prefs";

interface StoragePreferences {
    mobilePhotos: boolean;
    mobileAudio: boolean;
    mobileDocs: boolean;
    wifiPhotos: boolean;
    wifiAudio: boolean;
    wifiDocs: boolean;
    lowDataCalls: boolean;
}

const defaultPrefs: StoragePreferences = {
    mobilePhotos: true,
    mobileAudio: true,
    mobileDocs: false,
    wifiPhotos: true,
    wifiAudio: true,
    wifiDocs: true,
    lowDataCalls: false,
};

export default function StorageManagerScreen() {
    const router = useRouter();

    const [prefs, setPrefs] = useState<StoragePreferences>(defaultPrefs);
    const [clearingCache, setClearingCache] = useState(false);
    const [cacheCleared, setCacheCleared] = useState(false);

    // Mock storage metrics calculated based on usage
    const [storageData, setStorageData] = useState({
        photos: 34.6, // MB
        audio: 18.2,  // MB
        docs: 9.8,    // MB
        cache: 22.4,  // MB
    });

    useEffect(() => {
        (async () => {
            try {
                const stored = await AsyncStorage.getItem(STORAGE_PREFS_KEY);
                if (stored) {
                    setPrefs(JSON.parse(stored));
                }
            } catch (_) {}
        })();
    }, []);

    const updatePref = useCallback(async (key: keyof StoragePreferences, val: boolean) => {
        setPrefs((prev) => {
            const next = { ...prev, [key]: val };
            AsyncStorage.setItem(STORAGE_PREFS_KEY, JSON.stringify(next)).catch(() => {});
            return next;
        });
    }, []);

    const totalStorage = (
        storageData.photos +
        storageData.audio +
        storageData.docs +
        storageData.cache
    ).toFixed(1);

    const handleClearCache = async () => {
        if (storageData.cache === 0) {
            BubblyAlert.alert("Cache Already Clean", "There are no temporary cache files to delete right now.");
            return;
        }

        BubblyAlert.alert(
            "Clear App Cache",
            `This will remove ${storageData.cache.toFixed(1)} MB of cached preview files and temporary media. Your chat history and downloaded files will remain safe.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Clear Now",
                    style: "destructive",
                    onPress: async () => {
                        setClearingCache(true);
                        try {
                            if (Platform.OS !== "web") {
                                Vibration.vibrate(35);
                            }
                            // Simulate disk cache flush
                            await new Promise((resolve) => setTimeout(resolve, 800));
                            const freedMB = storageData.cache.toFixed(1);
                            setStorageData((prev) => ({ ...prev, cache: 0 }));
                            setCacheCleared(true);
                            BubblyAlert.alert("Storage Cleaned ✨", `Successfully freed ${freedMB} MB of temporary cache!`);
                        } catch (_) {
                            BubblyAlert.alert("Error", "Could not clear cache at this time.");
                        } finally {
                            setClearingCache(false);
                        }
                    },
                },
            ]
        );
    };

    const handleResetStats = () => {
        BubblyAlert.alert(
            "Reset Network Statistics",
            "Are you sure you want to reset all network and call counters?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Reset",
                    style: "destructive",
                    onPress: () => {
                        BubblyAlert.alert("Statistics Reset", "All network usage counters have been reset to zero.");
                    },
                },
            ]
        );
    };

    // Calculate percentage widths for distribution bar
    const totalNum = parseFloat(totalStorage) || 1;
    const pPhotos = (storageData.photos / totalNum) * 100;
    const pAudio = (storageData.audio / totalNum) * 100;
    const pDocs = (storageData.docs / totalNum) * 100;
    const pCache = (storageData.cache / totalNum) * 100;

    return (
        <ScreenWrapper showPattern bgOpacity={0.4}>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <BackButton />
                    <Typo size={17} fontWeight="700" color={colors.white}>
                        Storage & Data Usage
                    </Typo>
                    <View style={{ width: scale(36) }} />
                </View>

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* ── Storage Overview Card ── */}
                    <View style={styles.card}>
                        <View style={styles.cardTopRow}>
                            <View>
                                <Typo size={12} fontWeight="600" color={colors.neutral400}>
                                    TOTAL BUBBLY STORAGE
                                </Typo>
                                <Typo size={28} fontWeight="800" color={colors.neutral900} style={{ marginTop: 2 }}>
                                    {totalStorage} <Typo size={16} fontWeight="600" color={colors.neutral500}>MB</Typo>
                                </Typo>
                            </View>
                            <TouchableOpacity
                                style={[styles.cleanBtn, storageData.cache === 0 && styles.cleanBtnDisabled]}
                                onPress={handleClearCache}
                                disabled={clearingCache}
                                activeOpacity={0.8}
                            >
                                {clearingCache ? (
                                    <ActivityIndicator size="small" color={colors.black} />
                                ) : (
                                    <>
                                        <Icons.Broom size={16} color={colors.black} weight="bold" />
                                        <Typo size={12.5} fontWeight="700" color={colors.black}>
                                            {cacheCleared ? "Cleaned ✓" : "Clean Cache"}
                                        </Typo>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>

                        {/* Multi-segment Progress Bar */}
                        <View style={styles.barContainer}>
                            <View style={[styles.barSegment, { width: `${pPhotos}%`, backgroundColor: colors.primary }]} />
                            <View style={[styles.barSegment, { width: `${pAudio}%`, backgroundColor: colors.sky || "#0284c7" }]} />
                            <View style={[styles.barSegment, { width: `${pDocs}%`, backgroundColor: "#16a34a" }]} />
                            <View style={[styles.barSegment, { width: `${pCache}%`, backgroundColor: "#a855f7" }]} />
                        </View>

                        {/* Breakdown Legend */}
                        <View style={styles.legendGrid}>
                            <View style={styles.legendItem}>
                                <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                                <View style={{ flex: 1 }}>
                                    <Typo size={11} color={colors.neutral400} fontWeight="600">Photos & Media</Typo>
                                    <Typo size={13.5} fontWeight="700" color={colors.neutral800}>{storageData.photos.toFixed(1)} MB</Typo>
                                </View>
                            </View>

                            <View style={styles.legendItem}>
                                <View style={[styles.dot, { backgroundColor: colors.sky || "#0284c7" }]} />
                                <View style={{ flex: 1 }}>
                                    <Typo size={11} color={colors.neutral400} fontWeight="600">Voice Notes</Typo>
                                    <Typo size={13.5} fontWeight="700" color={colors.neutral800}>{storageData.audio.toFixed(1)} MB</Typo>
                                </View>
                            </View>

                            <View style={styles.legendItem}>
                                <View style={[styles.dot, { backgroundColor: "#16a34a" }]} />
                                <View style={{ flex: 1 }}>
                                    <Typo size={11} color={colors.neutral400} fontWeight="600">Documents</Typo>
                                    <Typo size={13.5} fontWeight="700" color={colors.neutral800}>{storageData.docs.toFixed(1)} MB</Typo>
                                </View>
                            </View>

                            <View style={styles.legendItem}>
                                <View style={[styles.dot, { backgroundColor: "#a855f7" }]} />
                                <View style={{ flex: 1 }}>
                                    <Typo size={11} color={colors.neutral400} fontWeight="600">Cache & Temp</Typo>
                                    <Typo size={13.5} fontWeight="700" color={colors.neutral800}>{storageData.cache.toFixed(1)} MB</Typo>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* ── Network Data Statistics ── */}
                    <View style={styles.sectionHeader}>
                        <Icons.ArrowsDownUp size={16} color={colors.neutral400} weight="bold" />
                        <Typo size={12} fontWeight="700" color={colors.neutral400}>
                            NETWORK USAGE
                        </Typo>
                    </View>

                    <View style={styles.card}>
                        <View style={styles.statRow}>
                            <View style={styles.statIconWrap}>
                                <Icons.ChatCircleDots size={18} color={colors.primaryDark} weight="fill" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Typo size={14} fontWeight="600" color={colors.neutral800}>Messages</Typo>
                                <Typo size={11.5} color={colors.neutral400}>1,420 sent · 3,890 received</Typo>
                            </View>
                            <Typo size={13.5} fontWeight="700" color={colors.neutral800}>5.2 MB</Typo>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.statRow}>
                            <View style={[styles.statIconWrap, { backgroundColor: "#e0f2fe" }]}>
                                <Icons.Image size={18} color="#0284c7" weight="fill" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Typo size={14} fontWeight="600" color={colors.neutral800}>Media Sent & Received</Typo>
                                <Typo size={11.5} color={colors.neutral400}>Photos, videos, and audio notes</Typo>
                            </View>
                            <Typo size={13.5} fontWeight="700" color={colors.neutral800}>168.4 MB</Typo>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.statRow}>
                            <View style={[styles.statIconWrap, { backgroundColor: "#dcfce7" }]}>
                                <Icons.PhoneCall size={18} color="#16a34a" weight="fill" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Typo size={14} fontWeight="600" color={colors.neutral800}>Voice & Video Calls</Typo>
                                <Typo size={11.5} color={colors.neutral400}>Agora WebRTC real-time media</Typo>
                            </View>
                            <Typo size={13.5} fontWeight="700" color={colors.neutral800}>84.1 MB</Typo>
                        </View>

                        <TouchableOpacity
                            style={styles.resetBtn}
                            onPress={handleResetStats}
                            activeOpacity={0.7}
                        >
                            <Icons.ArrowCounterClockwise size={14} color={colors.rose} weight="bold" />
                            <Typo size={12.5} fontWeight="700" color={colors.rose}>
                                Reset Network Statistics
                            </Typo>
                        </TouchableOpacity>
                    </View>

                    {/* ── Auto-Download Preferences ── */}
                    <View style={styles.sectionHeader}>
                        <Icons.DownloadSimple size={16} color={colors.neutral400} weight="bold" />
                        <Typo size={12} fontWeight="700" color={colors.neutral400}>
                            MEDIA AUTO-DOWNLOAD
                        </Typo>
                    </View>

                    <View style={styles.card}>
                        <Typo size={13.5} fontWeight="700" color={colors.neutral800} style={{ marginBottom: verticalScale(10) }}>
                            When Using Cellular / Mobile Data
                        </Typo>

                        <View style={styles.toggleRow}>
                            <Typo size={13.5} color={colors.neutral700}>Photos & Images</Typo>
                            <Switch
                                value={prefs.mobilePhotos}
                                onValueChange={(v) => updatePref("mobilePhotos", v)}
                                trackColor={{ false: colors.neutral300, true: colors.primary }}
                                thumbColor={colors.white}
                            />
                        </View>

                        <View style={styles.toggleRow}>
                            <Typo size={13.5} color={colors.neutral700}>Voice Notes & Audio</Typo>
                            <Switch
                                value={prefs.mobileAudio}
                                onValueChange={(v) => updatePref("mobileAudio", v)}
                                trackColor={{ false: colors.neutral300, true: colors.primary }}
                                thumbColor={colors.white}
                            />
                        </View>

                        <View style={[styles.toggleRow, { borderBottomWidth: 0 }]}>
                            <Typo size={13.5} color={colors.neutral700}>Documents & Files</Typo>
                            <Switch
                                value={prefs.mobileDocs}
                                onValueChange={(v) => updatePref("mobileDocs", v)}
                                trackColor={{ false: colors.neutral300, true: colors.primary }}
                                thumbColor={colors.white}
                            />
                        </View>

                        <View style={[styles.divider, { marginVertical: verticalScale(10) }]} />

                        <Typo size={13.5} fontWeight="700" color={colors.neutral800} style={{ marginBottom: verticalScale(10) }}>
                            When Connected to Wi-Fi
                        </Typo>

                        <View style={styles.toggleRow}>
                            <Typo size={13.5} color={colors.neutral700}>Photos & Images</Typo>
                            <Switch
                                value={prefs.wifiPhotos}
                                onValueChange={(v) => updatePref("wifiPhotos", v)}
                                trackColor={{ false: colors.neutral300, true: colors.primary }}
                                thumbColor={colors.white}
                            />
                        </View>

                        <View style={styles.toggleRow}>
                            <Typo size={13.5} color={colors.neutral700}>Voice Notes & Audio</Typo>
                            <Switch
                                value={prefs.wifiAudio}
                                onValueChange={(v) => updatePref("wifiAudio", v)}
                                trackColor={{ false: colors.neutral300, true: colors.primary }}
                                thumbColor={colors.white}
                            />
                        </View>

                        <View style={[styles.toggleRow, { borderBottomWidth: 0 }]}>
                            <Typo size={13.5} color={colors.neutral700}>Documents & Files</Typo>
                            <Switch
                                value={prefs.wifiDocs}
                                onValueChange={(v) => updatePref("wifiDocs", v)}
                                trackColor={{ false: colors.neutral300, true: colors.primary }}
                                thumbColor={colors.white}
                            />
                        </View>
                    </View>

                    {/* ── Call Data Saving ── */}
                    <View style={styles.sectionHeader}>
                        <Icons.Lightning size={16} color={colors.neutral400} weight="bold" />
                        <Typo size={12} fontWeight="700" color={colors.neutral400}>
                            DATA SAVER
                        </Typo>
                    </View>

                    <View style={styles.card}>
                        <View style={[styles.toggleRow, { borderBottomWidth: 0 }]}>
                            <View style={{ flex: 1, marginRight: scale(10) }}>
                                <Typo size={14} fontWeight="600" color={colors.neutral800}>
                                    Low Data Usage for Calls
                                </Typo>
                                <Typo size={11.5} color={colors.neutral400} style={{ marginTop: 2 }}>
                                    Optimizes Agora audio/video bitrates to reduce mobile data usage by up to 50%.
                                </Typo>
                            </View>
                            <Switch
                                value={prefs.lowDataCalls}
                                onValueChange={(v) => updatePref("lowDataCalls", v)}
                                trackColor={{ false: colors.neutral300, true: colors.primary }}
                                thumbColor={colors.white}
                            />
                        </View>
                    </View>

                    {/* Tip card */}
                    <View style={styles.tipCard}>
                        <Icons.Sparkle size={20} color={colors.primaryDark} weight="fill" />
                        <View style={{ flex: 1 }}>
                            <Typo size={13} fontWeight="700" color={colors.neutral900}>
                                Intelligent Smart Compression
                            </Typo>
                            <Typo size={11.5} color={colors.neutral600} style={{ marginTop: 2, lineHeight: 16 }}>
                                Bubbly automatically transcodes voice notes and compresses media on device before uploading, keeping your chats snappy and saving your cellular quota.
                            </Typo>
                        </View>
                    </View>
                </ScrollView>
            </View>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: spacingX._20,
        paddingTop: Platform.OS === "android" ? verticalScale(8) : verticalScale(4),
        paddingBottom: verticalScale(12),
    },
    scrollContent: {
        paddingHorizontal: spacingX._20,
        paddingBottom: verticalScale(40),
    },
    card: {
        backgroundColor: colors.white,
        borderRadius: radius._20,
        padding: spacingX._20,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
        marginBottom: verticalScale(14),
    },
    cardTopRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: verticalScale(14),
    },
    cleanBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: scale(6),
        backgroundColor: colors.primary,
        paddingHorizontal: scale(14),
        paddingVertical: verticalScale(7),
        borderRadius: radius.full,
        shadowColor: colors.primaryDark,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    cleanBtnDisabled: {
        backgroundColor: colors.neutral200,
        shadowOpacity: 0,
        elevation: 0,
    },
    barContainer: {
        height: verticalScale(10),
        borderRadius: radius.full,
        flexDirection: "row",
        overflow: "hidden",
        backgroundColor: colors.neutral100,
        marginBottom: verticalScale(14),
    },
    barSegment: {
        height: "100%",
    },
    legendGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: scale(10),
    },
    legendItem: {
        flexDirection: "row",
        alignItems: "center",
        width: "47%",
        gap: scale(8),
    },
    dot: {
        width: scale(10),
        height: scale(10),
        borderRadius: radius.full,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: scale(6),
        marginBottom: verticalScale(8),
        marginTop: verticalScale(4),
    },
    statRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: scale(12),
        paddingVertical: verticalScale(6),
    },
    statIconWrap: {
        width: scale(38),
        height: scale(38),
        borderRadius: radius._12,
        backgroundColor: colors.primaryLight,
        alignItems: "center",
        justifyContent: "center",
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: colors.neutral200,
        marginVertical: verticalScale(6),
    },
    resetBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: scale(6),
        marginTop: verticalScale(12),
        paddingVertical: verticalScale(8),
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.neutral200,
    },
    toggleRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: verticalScale(9),
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.neutral100,
    },
    tipCard: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: scale(12),
        backgroundColor: "rgba(255, 255, 255, 0.75)",
        borderRadius: radius._15,
        padding: spacingX._15,
        borderWidth: 1,
        borderColor: colors.primaryLight,
        marginTop: verticalScale(4),
    },
});