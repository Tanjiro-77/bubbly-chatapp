import React, { useState, useMemo, useEffect, useRef } from "react";
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Share,
    TextInput,
    Dimensions,
    Platform,
    ScrollView,
    KeyboardAvoidingView,
} from "react-native";
import { BubblyAlert } from "../../components/BubblyAlert";
import { useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import Svg, { Rect, Path, G } from "react-native-svg";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    FadeInDown,
    FadeInUp,
} from "react-native-reanimated";
import * as Icons from "phosphor-react-native";
import ScreenWrapper from "../../components/ScreenWrapper";
import Typo from "../../components/Typo";
import BackButton from "../../components/BackButton";
import Avatar from "../../components/Avatar";
import { colors, radius, spacingX, spacingY } from "../../constants/theme";
import { scale, verticalScale } from "../../utils/styling";
import { useAuth } from "../../contexts/authContext";
import { newConversation, isSocketConnected } from "../../socket/socketEvents";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const QR_SIZE = Math.min(SCREEN_WIDTH - scale(90), scale(240));
const MATRIX_SIZE = 25;
const MODULE_SIZE = QR_SIZE / MATRIX_SIZE;

// Deterministic matrix generator with standard QR anchor points
function generateQRMatrix(seed: string): boolean[][] {
    const matrix: boolean[][] = Array(MATRIX_SIZE)
        .fill(false)
        .map(() => Array(MATRIX_SIZE).fill(false));

    // Place 7x7 Finder Pattern with 1px quiet zone
    const drawFinderPattern = (r0: number, c0: number) => {
        for (let r = 0; r < 7; r++) {
            for (let c = 0; c < 7; c++) {
                const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
                const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
                matrix[r0 + r][c0 + c] = isBorder || isCenter;
            }
        }
    };

    drawFinderPattern(0, 0); // Top-left
    drawFinderPattern(0, MATRIX_SIZE - 7); // Top-right
    drawFinderPattern(MATRIX_SIZE - 7, 0); // Bottom-left

    // Timing strips
    for (let i = 8; i < MATRIX_SIZE - 8; i++) {
        matrix[6][i] = i % 2 === 0;
        matrix[i][6] = i % 2 === 0;
    }

    // Alignment pattern near bottom-right
    const ar = MATRIX_SIZE - 7;
    const ac = MATRIX_SIZE - 7;
    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
            const isBorder = r === 0 || r === 4 || c === 0 || c === 4;
            const isCenter = r === 2 && c === 2;
            matrix[ar + r][ac + c] = isBorder || isCenter;
        }
    }

    // Fill data modules deterministically using seed hash
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = (hash << 5) - hash + seed.charCodeAt(i);
        hash |= 0;
    }

    for (let r = 0; r < MATRIX_SIZE; r++) {
        for (let c = 0; c < MATRIX_SIZE; c++) {
            // Skip finder zones
            const inTL = r < 8 && c < 8;
            const inTR = r < 8 && c >= MATRIX_SIZE - 8;
            const inBL = r >= MATRIX_SIZE - 8 && c < 8;
            const inTiming = r === 6 || c === 6;
            const inAlignment = r >= ar && r < ar + 5 && c >= ac && c < ac + 5;
            const inCenterBadge = r >= 10 && r <= 14 && c >= 10 && c <= 14;

            if (inTL || inTR || inBL || inTiming || inAlignment || inCenterBadge) {
                continue;
            }

            const pseudo = Math.sin((r * MATRIX_SIZE + c + 1) * hash) * 10000;
            matrix[r][c] = pseudo - Math.floor(pseudo) > 0.48;
        }
    }

    return matrix;
}

export default function QRCodeScreen() {
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState<0 | 1>(0); // 0 = My Code, 1 = Scan
    const [copiedToast, setCopiedToast] = useState(false);
    const [manualIdInput, setManualIdInput] = useState("");

    const userId = currentUser?.id || "bubbly_user";
    const inviteLink = `https://bubbly.app/u/${userId}`;

    // Animated scanner laser
    const laserY = useSharedValue(0);
    useEffect(() => {
        laserY.value = withRepeat(
            withTiming(QR_SIZE - 10, { duration: 2200 }),
            -1,
            true
        );
    }, []);

    const laserAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: laserY.value }],
    }));

    const qrMatrix = useMemo(() => generateQRMatrix(userId + inviteLink), [userId, inviteLink]);

    const toastTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        return () => {
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        };
    }, []);

    const handleCopyLink = async () => {
        try {
            await Clipboard.setStringAsync(inviteLink);
            setCopiedToast(true);
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
            toastTimerRef.current = setTimeout(() => setCopiedToast(false), 2000);
        } catch (_) {}
    };

    const handleShare = async () => {
        try {
            await Share.share({
                title: "Connect with me on Bubbly!",
                message: `Hey! Let's chat on Bubbly. Add me or scan my QR code: ${inviteLink}`,
                url: inviteLink,
            });
        } catch (_) {}
    };

    const handlePasteId = async () => {
        try {
            const text = await Clipboard.getStringAsync();
            if (text) setManualIdInput(text.trim());
        } catch (_) {}
    };

    const pendingNewConvRef = useRef<((res: any) => void) | null>(null);

    useEffect(() => {
        return () => {
            if (pendingNewConvRef.current) {
                newConversation(pendingNewConvRef.current, true);
                pendingNewConvRef.current = null;
            }
        };
    }, []);

    const handleConnectManual = () => {
        const raw = manualIdInput.trim();
        if (!raw) {
            BubblyAlert.alert("Input Required", "Please enter a valid Bubbly user ID or paste an invite link.");
            return;
        }
        // Extract target userId if pasted an invite URL like https://bubbly.app/u/<userId>
        const urlMatch = raw.match(/\/u\/([a-fA-F0-9]{24})/);
        const targetId = urlMatch ? urlMatch[1] : raw;

        if (/^[a-fA-F0-9]{24}$/.test(targetId) && currentUser?.id) {
            if (!isSocketConnected()) {
                BubblyAlert.alert("Offline", "Connect to the internet to start a chat via QR ID.");
                return;
            }
            if (targetId === currentUser.id) {
                BubblyAlert.alert("That's You", "You cannot start a chat with your own QR ID.");
                return;
            }
            const onRes = (res: any) => {
                newConversation(onRes, true);
                pendingNewConvRef.current = null;
                if (res?.success && res.data?._id) {
                    router.replace({
                        pathname: "/(main)/conversation",
                        params: {
                            id: res.data._id,
                            name: res.data.name,
                            avatar: res.data.avatar,
                            type: res.data.type,
                            participants: JSON.stringify(res.data.participants),
                        },
                    });
                } else {
                    BubblyAlert.alert("User Not Found", res?.msg || "Could not connect with that ID.");
                }
            };
            if (pendingNewConvRef.current) {
                newConversation(pendingNewConvRef.current, true);
            }
            pendingNewConvRef.current = onRes;
            newConversation(onRes);
            newConversation({ type: "direct", participants: [currentUser.id, targetId] });
            return;
        }

        router.push({
            pathname: "/(main)/newConversationModal",
            params: { isGroup: 0 },
        });
    };

    return (
        <ScreenWrapper showPattern bgOpacity={0.4}>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                {/* Header */}
                <View style={styles.header}>
                    <BackButton />
                    <Typo size={17} fontWeight="700" color={colors.white} style={{ flex: 1, textAlign: "center" }} textProps={{ numberOfLines: 1 }}>
                        Bubbly QR Code
                    </Typo>
                    <TouchableOpacity
                        onPress={handleShare}
                        style={styles.headerShareBtn}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Icons.ShareNetwork size={20} color={colors.white} weight="bold" />
                    </TouchableOpacity>
                </View>

                {/* Segmented Switch */}
                <View style={styles.segmentedRow}>
                    <TouchableOpacity
                        style={[styles.segmentBtn, activeTab === 0 && styles.segmentBtnActive]}
                        onPress={() => setActiveTab(0)}
                        activeOpacity={0.8}
                    >
                        <Icons.QrCode
                            size={16}
                            color={activeTab === 0 ? colors.neutral900 : colors.white}
                            weight={activeTab === 0 ? "fill" : "regular"}
                        />
                        <Typo
                            size={13}
                            fontWeight={activeTab === 0 ? "700" : "500"}
                            color={activeTab === 0 ? colors.neutral900 : colors.white}
                        >
                            My QR Code
                        </Typo>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.segmentBtn, activeTab === 1 && styles.segmentBtnActive]}
                        onPress={() => setActiveTab(1)}
                        activeOpacity={0.8}
                    >
                        <Icons.Scan
                            size={16}
                            color={activeTab === 1 ? colors.neutral900 : colors.white}
                            weight={activeTab === 1 ? "fill" : "regular"}
                        />
                        <Typo
                            size={13}
                            fontWeight={activeTab === 1 ? "700" : "500"}
                            color={activeTab === 1 ? colors.neutral900 : colors.white}
                        >
                            Scan Code
                        </Typo>
                    </TouchableOpacity>
                </View>

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {activeTab === 0 ? (
                        /* ── TAB 1: MY QR CODE ── */
                        <Animated.View
                            entering={FadeInDown.duration(450).springify()}
                            style={styles.card}
                        >
                            {/* Profile Info */}
                            <View style={styles.cardHeader}>
                                <View style={styles.avatarGlow}>
                                    <Avatar uri={currentUser?.avatar || null} size={64} />
                                    <View style={styles.bubblyBadge}>
                                        <Icons.Sparkle size={10} color={colors.black} weight="fill" />
                                    </View>
                                </View>
                                <Typo size={18} fontWeight="800" color={colors.neutral900} style={{ marginTop: verticalScale(8) }}>
                                    {currentUser?.name || "Bubbly User"}
                                </Typo>
                                <Typo size={12.5} color={colors.neutral500} style={{ marginTop: verticalScale(2) }}>
                                    {currentUser?.email || "Scan to connect instantly"}
                                </Typo>
                            </View>

                            {/* QR Matrix SVG Card */}
                            <View style={styles.qrWrapper}>
                                <Svg width={QR_SIZE} height={QR_SIZE}>
                                    {qrMatrix.map((row, r) =>
                                        row.map((val, c) => {
                                            if (!val) return null;
                                            return (
                                                <Rect
                                                    key={`${r}-${c}`}
                                                    x={c * MODULE_SIZE}
                                                    y={r * MODULE_SIZE}
                                                    width={MODULE_SIZE - 0.4}
                                                    height={MODULE_SIZE - 0.4}
                                                    rx={MODULE_SIZE * 0.22}
                                                    ry={MODULE_SIZE * 0.22}
                                                    fill={colors.neutral900}
                                                />
                                            );
                                        })
                                    )}
                                </Svg>

                                {/* Center Bubbly Mini Logo */}
                                <View style={styles.centerLogo}>
                                    <Icons.ChatCircleDots size={22} color={colors.black} weight="fill" />
                                </View>
                            </View>

                            <Typo size={12} color={colors.neutral400} style={styles.hintText}>
                                Your QR code is private. When scanned, people can start a high-speed encrypted chat with you.
                            </Typo>

                            {/* Action Buttons */}
                            <View style={styles.buttonStack}>
                                <TouchableOpacity
                                    style={styles.primaryBtn}
                                    onPress={handleShare}
                                    activeOpacity={0.8}
                                >
                                    <Icons.ShareNetwork size={18} color={colors.black} weight="bold" />
                                    <Typo size={14} fontWeight="700" color={colors.black}>
                                        Share QR Code
                                    </Typo>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.secondaryBtn}
                                    onPress={handleCopyLink}
                                    activeOpacity={0.7}
                                >
                                    <Icons.Copy size={18} color={colors.neutral700} weight="bold" />
                                    <Typo size={14} fontWeight="600" color={colors.neutral800}>
                                        {copiedToast ? "Link Copied! ✓" : "Copy Profile Link"}
                                    </Typo>
                                </TouchableOpacity>
                            </View>
                        </Animated.View>
                    ) : (
                        /* ── TAB 2: SCAN QR CODE ── */
                        <Animated.View
                            entering={FadeInUp.duration(450).springify()}
                            style={styles.card}
                        >
                            <Typo size={16} fontWeight="700" color={colors.neutral900} style={{ textAlign: "center" }}>
                                Scan Contact's QR
                            </Typo>
                            <Typo size={12.5} color={colors.neutral500} style={{ textAlign: "center", marginTop: 4, marginBottom: verticalScale(16) }}>
                                Align the QR code inside the frame to connect
                            </Typo>

                            {/* Viewfinder Frame */}
                            <View style={styles.viewfinder}>
                                {/* Corner brackets */}
                                <View style={[styles.corner, styles.cornerTL]} />
                                <View style={[styles.corner, styles.cornerTR]} />
                                <View style={[styles.corner, styles.cornerBL]} />
                                <View style={[styles.corner, styles.cornerBR]} />

                                {/* Animated Laser line */}
                                <Animated.View style={[styles.laserBeam, laserAnimatedStyle]} />

                                <View style={styles.viewfinderCenter}>
                                    <Icons.QrCode size={40} color="rgba(0,0,0,0.15)" weight="regular" />
                                </View>
                            </View>

                            <Typo size={12} color={colors.neutral400} style={styles.hintText}>
                                Or enter a friend's Bubbly User ID manually:
                            </Typo>

                            {/* Manual ID Input */}
                            <View style={styles.manualInputRow}>
                                <TextInput
                                    style={styles.manualInput}
                                    placeholder="Paste or type Bubbly ID..."
                                    placeholderTextColor={colors.neutral400}
                                    value={manualIdInput}
                                    onChangeText={setManualIdInput}
                                    autoCapitalize="none"
                                />
                                <TouchableOpacity
                                    style={styles.pasteBtn}
                                    onPress={handlePasteId}
                                    activeOpacity={0.7}
                                >
                                    <Typo size={11} fontWeight="700" color={colors.primaryDark}>
                                        PASTE
                                    </Typo>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                style={styles.primaryBtn}
                                onPress={handleConnectManual}
                                activeOpacity={0.8}
                            >
                                <Icons.ChatCircleDots size={18} color={colors.black} weight="bold" />
                                <Typo size={14} fontWeight="700" color={colors.black}>
                                    Start Chatting
                                </Typo>
                            </TouchableOpacity>
                        </Animated.View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
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
    headerShareBtn: {
        width: verticalScale(38),
        height: verticalScale(38),
        borderRadius: radius.full,
        backgroundColor: "rgba(255, 255, 255, 0.18)",
        alignItems: "center",
        justifyContent: "center",
    },
    segmentedRow: {
        flexDirection: "row",
        marginHorizontal: spacingX._20,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        borderRadius: radius.full,
        padding: 4,
        marginBottom: verticalScale(14),
    },
    segmentBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: scale(6),
        paddingVertical: verticalScale(8),
        borderRadius: radius.full,
    },
    segmentBtnActive: {
        backgroundColor: colors.white,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    scrollContent: {
        paddingHorizontal: spacingX._20,
        paddingBottom: verticalScale(40),
    },
    card: {
        backgroundColor: colors.white,
        borderRadius: radius._24,
        padding: spacingX._20,
        alignItems: "center",
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 5,
    },
    cardHeader: {
        alignItems: "center",
        marginBottom: verticalScale(16),
    },
    avatarGlow: {
        position: "relative",
        padding: 3,
        borderRadius: radius.full,
        borderWidth: 2.5,
        borderColor: colors.primary,
    },
    bubblyBadge: {
        position: "absolute",
        bottom: 2,
        right: 2,
        width: scale(18),
        height: scale(18),
        borderRadius: radius.full,
        backgroundColor: colors.primary,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 2,
        borderColor: colors.white,
    },
    qrWrapper: {
        padding: scale(14),
        backgroundColor: colors.neutral50,
        borderRadius: radius._20,
        borderWidth: 1,
        borderColor: colors.neutral200,
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
    },
    centerLogo: {
        position: "absolute",
        width: scale(42),
        height: scale(42),
        borderRadius: radius.full,
        backgroundColor: colors.primary,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 3,
        borderColor: colors.white,
        shadowColor: colors.primaryDark,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 4,
    },
    hintText: {
        textAlign: "center",
        marginTop: verticalScale(14),
        marginBottom: verticalScale(16),
        paddingHorizontal: scale(10),
        lineHeight: scale(18),
    },
    buttonStack: {
        width: "100%",
        gap: verticalScale(10),
    },
    primaryBtn: {
        backgroundColor: colors.primary,
        borderRadius: radius.full,
        height: verticalScale(48),
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: scale(8),
        width: "100%",
        shadowColor: colors.primaryDark,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 3,
    },
    secondaryBtn: {
        backgroundColor: colors.neutral100,
        borderRadius: radius.full,
        height: verticalScale(48),
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: scale(8),
        width: "100%",
        borderWidth: 1,
        borderColor: colors.neutral200,
    },

    // Viewfinder
    viewfinder: {
        width: QR_SIZE,
        height: QR_SIZE,
        borderRadius: radius._20,
        backgroundColor: colors.neutral100,
        position: "relative",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
    },
    viewfinderCenter: {
        opacity: 0.7,
    },
    corner: {
        position: "absolute",
        width: scale(24),
        height: scale(24),
        borderColor: colors.primaryDark,
    },
    cornerTL: { top: 10, left: 10, borderTopWidth: 3.5, borderLeftWidth: 3.5, borderTopLeftRadius: 6 },
    cornerTR: { top: 10, right: 10, borderTopWidth: 3.5, borderRightWidth: 3.5, borderTopRightRadius: 6 },
    cornerBL: { bottom: 10, left: 10, borderBottomWidth: 3.5, borderLeftWidth: 3.5, borderBottomLeftRadius: 6 },
    cornerBR: { bottom: 10, right: 10, borderBottomWidth: 3.5, borderRightWidth: 3.5, borderBottomRightRadius: 6 },
    laserBeam: {
        position: "absolute",
        left: 10,
        right: 10,
        top: 0,
        height: 2.5,
        backgroundColor: colors.primary,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 5,
        elevation: 3,
    },
    manualInputRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.neutral100,
        borderRadius: radius.full,
        paddingHorizontal: spacingX._15,
        height: verticalScale(46),
        width: "100%",
        marginBottom: verticalScale(14),
        borderWidth: 1,
        borderColor: colors.neutral200,
    },
    manualInput: {
        flex: 1,
        fontSize: scale(13.5),
        color: colors.neutral900,
    },
    pasteBtn: {
        backgroundColor: colors.primaryLight,
        paddingHorizontal: scale(10),
        paddingVertical: verticalScale(4),
        borderRadius: radius.full,
    },
});