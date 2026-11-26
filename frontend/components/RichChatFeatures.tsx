/**
 * frontend/components/RichChatFeatures.tsx
 *
 * Modular UI components for rich message bubbles (Checklist, Countdown, Mini-Games)
 * and smart composer toolbars (Formatting Bar, Slash Quick Replies).
 */

import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, { FadeIn, LinearTransition } from "react-native-reanimated";
import * as Icons from "phosphor-react-native";
import { colors, radius, spacingX, spacingY } from "../constants/theme";
import { scale, verticalScale } from "../utils/styling";
import Typo from "./Typo";
import { ChecklistProps } from "../types";
import {
    BubblyCountdownPayload,
    BubblyGamePayload,
    QuickReplyTemplate,
} from "../utils/featureStorage";
import { hapticTap } from "../utils/haptics";

// ── 1. Shared Checklist Bubble Card ───────────────────────────────────────────
export const ChecklistCardBubble = ({
    checklist,
    isMe,
    onToggleItem,
}: {
    checklist: ChecklistProps;
    isMe: boolean;
    onToggleItem?: (itemId: string) => void;
}) => {
    const items = Array.isArray(checklist?.items) ? checklist.items : [];
    const doneCount = items.filter((i) => i.completed).length;
    const pct = items.length > 0 ? Math.round((doneCount / items.length) * 100) : 0;
    const isAllDone = items.length > 0 && doneCount === items.length;

    return (
        <Animated.View entering={FadeIn.duration(220)} layout={LinearTransition.springify()} style={richStyles.cardWrap}>
            <View style={richStyles.cardTopRow}>
                <View style={[richStyles.cardBadge, isAllDone && { backgroundColor: "#dcfce7" }]}>
                    <Icons.CheckSquare size={verticalScale(13)} color={isAllDone ? "#15803d" : colors.primaryDark} weight="fill" />
                    <Typo size={10.5} fontWeight="800" color={isAllDone ? "#15803d" : colors.primaryDark}>
                        {isAllDone ? "ALL DONE" : "CHECKLIST"}
                    </Typo>
                </View>
                <Typo size={11} fontWeight="700" color={isAllDone ? "#15803d" : isMe ? colors.neutral700 : colors.neutral500}>
                    {doneCount}/{items.length} ({pct}%)
                </Typo>
            </View>

            <Typo size={15} fontWeight="800" color={colors.neutral900} style={{ marginTop: verticalScale(4) }}>
                {checklist.title || "Shared Tasks"}
            </Typo>

            <View style={richStyles.progressTrack}>
                <View style={[richStyles.progressFill, { width: `${pct}%`, backgroundColor: isAllDone ? "#16a34a" : colors.primary }]} />
            </View>

            <View style={richStyles.checklistList}>
                {items.map((item) => (
                    <TouchableOpacity
                        key={item.id}
                        style={[richStyles.checkRow, item.completed && richStyles.checkRowDone]}
                        onPress={() => {
                            const willFinishAll = !item.completed && doneCount + 1 === items.length;
                            hapticTap(willFinishAll ? "success" : "light");
                            onToggleItem?.(item.id);
                        }}
                        activeOpacity={0.7}
                    >
                        <View style={[richStyles.checkbox, item.completed && richStyles.checkboxChecked]}>
                            {item.completed && <Icons.Check size={11} color={colors.black} weight="bold" />}
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                            <Typo
                                size={13.5}
                                fontWeight={item.completed ? "500" : "600"}
                                color={item.completed ? colors.neutral400 : colors.neutral900}
                                style={item.completed ? { textDecorationLine: "line-through" } : undefined}
                            >
                                {item.text}
                            </Typo>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>
        </Animated.View>
    );
};

// ── 2. Live Countdown Sticker Card ────────────────────────────────────────────
export const CountdownCardBubble = ({ countdown }: { countdown: BubblyCountdownPayload }) => {
    const [now, setNow] = useState(Date.now());

    const targetMs = new Date(countdown.targetIso).getTime();
    const isValidTarget = !Number.isNaN(targetMs);

    useEffect(() => {
        if (!isValidTarget || targetMs <= Date.now()) return;
        const timer = setInterval(() => {
            const current = Date.now();
            setNow(current);
            if (current >= targetMs) {
                clearInterval(timer);
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [targetMs, isValidTarget]);

    const diff = isValidTarget ? Math.max(0, targetMs - now) : 0;
    const isFinished = diff <= 0;

    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);

    return (
        <Animated.View entering={FadeIn.duration(220)} style={richStyles.countdownCard}>
            <View style={richStyles.countdownHeader}>
                <View style={richStyles.countdownEmojiWrap}>
                    <Typo size={18}>{countdown.emoji || "⏳"}</Typo>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                    <Typo size={10} fontWeight="800" color={colors.primaryDark} textProps={{ numberOfLines: 1 }}>
                        LIVE COUNTDOWN
                    </Typo>
                    <Typo size={14.5} fontWeight="800" color={colors.neutral900} textProps={{ numberOfLines: 2 }}>
                        {countdown.title}
                    </Typo>
                </View>
            </View>

            {isFinished ? (
                <View style={richStyles.countdownDonePill}>
                    <Typo size={12.5} fontWeight="800" color="#15803d">
                        🎉 Time's up! Event is happening now!
                    </Typo>
                </View>
            ) : (
                <View style={richStyles.countdownGrid}>
                    {[
                        { val: days, label: "DAYS", highlight: false },
                        { val: hours, label: "HRS", highlight: false },
                        { val: mins, label: "MIN", highlight: false },
                        { val: secs, label: "SEC", highlight: true },
                    ].map((unit) => (
                        <View
                            key={unit.label}
                            style={[
                                richStyles.timeBox,
                                unit.highlight && { borderColor: colors.primary, backgroundColor: "#fffbeb" },
                            ]}
                        >
                            <Typo
                                size={15}
                                fontWeight="800"
                                color={unit.highlight ? colors.primaryDark : colors.neutral900}
                                style={{ fontVariant: ["tabular-nums"] }}
                            >
                                {String(unit.val).padStart(2, "0")}
                            </Typo>
                            <Typo size={8.5} fontWeight="700" color={colors.neutral500}>
                                {unit.label}
                            </Typo>
                        </View>
                    ))}
                </View>
            )}
        </Animated.View>
    );
};

// ── 3. Interactive Game / Icebreaker Bubble Card ──────────────────────────────
export const GameCardBubble = ({
    game,
    onPlayAgain,
}: {
    game: BubblyGamePayload;
    onPlayAgain?: (kind: BubblyGamePayload["kind"]) => void;
}) => {
    const icon =
        game.kind === "dice"
            ? "🎲"
            : game.kind === "coin"
            ? "🪙"
            : game.kind === "8ball"
            ? "🎱"
            : "✊";

    return (
        <Animated.View entering={FadeIn.springify()} style={richStyles.gameCard}>
            <View style={richStyles.gameTop}>
                <View style={richStyles.gameEmojiWrap}>
                    <Typo size={22}>{icon}</Typo>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                    <Typo size={10} fontWeight="800" color={colors.primaryDark}>
                        BUBBLY MINI-GAME
                    </Typo>
                    <Typo size={13.5} fontWeight="700" color={colors.neutral900} textProps={{ numberOfLines: 1 }}>
                        {game.title}
                    </Typo>
                </View>
            </View>

            <View style={richStyles.gameResultBox}>
                <Typo size={17} fontWeight="800" color={colors.neutral900} style={{ textAlign: "center" }}>
                    {game.result}
                </Typo>
                {!!game.detail && (
                    <Typo size={11.5} color={colors.neutral500} style={{ textAlign: "center", marginTop: 2 }}>
                        {game.detail}
                    </Typo>
                )}
            </View>

            {onPlayAgain && (
                <TouchableOpacity
                    style={richStyles.playAgainBtn}
                    onPress={() => {
                        hapticTap("medium");
                        onPlayAgain(game.kind);
                    }}
                    activeOpacity={0.75}
                >
                    <Icons.ArrowsClockwise size={13} color={colors.primaryDark} weight="bold" />
                    <Typo size={11.5} fontWeight="800" color={colors.primaryDark}>
                        Play Again
                    </Typo>
                </TouchableOpacity>
            )}
        </Animated.View>
    );
};

// ── 4. Composer Formatting Bar (Bold, Italic, Strike, Code, Quote, Silent) ───
export const ComposerFormatBar = ({
    onApplyFormat,
    isSilent,
    onToggleSilent,
    onOpenQuickReplies,
}: {
    onApplyFormat: (format: "bold" | "italic" | "strike" | "code" | "quote") => void;
    isSilent: boolean;
    onToggleSilent: () => void;
    onOpenQuickReplies: () => void;
}) => (
    <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={richStyles.formatScroll}
        keyboardShouldPersistTaps="always"
    >
        {[
            { id: "bold" as const, label: "B", bold: true },
            { id: "italic" as const, label: "I", italic: true },
            { id: "strike" as const, label: "S", strike: true },
            { id: "code" as const, label: "</>" },
            { id: "quote" as const, label: "❝ Quote" },
        ].map((btn) => (
            <TouchableOpacity
                key={btn.id}
                onPress={() => {
                    hapticTap("light");
                    onApplyFormat(btn.id);
                }}
                activeOpacity={0.7}
                style={richStyles.formatPill}
            >
                <Typo
                    size={12}
                    fontWeight={btn.bold ? "900" : "700"}
                    color={colors.neutral800}
                    style={{
                        fontStyle: btn.italic ? "italic" : "normal",
                        textDecorationLine: btn.strike ? "line-through" : "none",
                    }}
                >
                    {btn.label}
                </Typo>
            </TouchableOpacity>
        ))}

        <TouchableOpacity
            onPress={() => {
                hapticTap("medium");
                onToggleSilent();
            }}
            activeOpacity={0.7}
            style={[richStyles.formatPill, isSilent && richStyles.formatPillActive]}
        >
            <Icons.BellSlash
                size={13}
                color={isSilent ? colors.primaryDark : colors.neutral600}
                weight={isSilent ? "fill" : "bold"}
            />
            <Typo size={11.5} fontWeight="700" color={isSilent ? colors.primaryDark : colors.neutral700}>
                {isSilent ? "Silent On" : "Silent"}
            </Typo>
        </TouchableOpacity>

        <TouchableOpacity
            onPress={() => {
                hapticTap("light");
                onOpenQuickReplies();
            }}
            activeOpacity={0.7}
            style={richStyles.formatPill}
        >
            <Icons.Lightning size={13} color={colors.primaryDark} weight="fill" />
            <Typo size={11.5} fontWeight="700" color={colors.neutral800}>Templates</Typo>
        </TouchableOpacity>
    </ScrollView>
);

// ── 5. Slash Quick Replies Bar ────────────────────────────────────────────────
export const QuickReplyBar = ({
    templates,
    onSelect,
    onManage,
}: {
    templates: QuickReplyTemplate[];
    onSelect: (tpl: QuickReplyTemplate) => void;
    onManage: () => void;
}) => {
    if (!templates || templates.length === 0) return null;
    return (
        <View style={richStyles.quickReplyWrap}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="always"
                contentContainerStyle={richStyles.quickReplyScroll}
            >
                {templates.map((tpl) => (
                    <TouchableOpacity
                        key={tpl.id}
                        style={richStyles.quickReplyChip}
                        onPress={() => onSelect(tpl)}
                        activeOpacity={0.75}
                    >
                        <Typo size={11.5} fontWeight="800" color={colors.primaryDark}>
                            /{tpl.trigger}
                        </Typo>
                        <Typo
                            size={11}
                            color={colors.neutral600}
                            style={{ maxWidth: scale(130) }}
                            textProps={{ numberOfLines: 1 }}
                        >
                            {tpl.text}
                        </Typo>
                    </TouchableOpacity>
                ))}
                <TouchableOpacity style={richStyles.quickReplyManage} onPress={onManage} activeOpacity={0.75}>
                    <Icons.Sliders size={13} color={colors.neutral700} weight="bold" />
                    <Typo size={11} fontWeight="700" color={colors.neutral700}>Edit</Typo>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
};

const richStyles = StyleSheet.create({
    cardWrap: {
        minWidth: scale(220),
        backgroundColor: "rgba(255,255,255,0.65)",
        borderRadius: radius._15,
        padding: spacingX._12,
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.06)",
    },
    cardTopRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: scale(8),
    },
    cardBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: colors.primaryLight,
        paddingHorizontal: scale(7),
        paddingVertical: 2,
        borderRadius: radius.full,
    },
    progressTrack: {
        height: verticalScale(5),
        backgroundColor: colors.neutral200,
        borderRadius: radius.full,
        overflow: "hidden",
        marginTop: verticalScale(8),
        marginBottom: verticalScale(8),
    },
    progressFill: {
        height: "100%",
        backgroundColor: colors.primary,
        borderRadius: radius.full,
    },
    checklistList: {
        gap: verticalScale(6),
    },
    checkRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: scale(8),
        paddingVertical: verticalScale(4),
    },
    checkRowDone: {
        opacity: 0.78,
    },
    checkbox: {
        width: scale(18),
        height: scale(18),
        borderRadius: radius._5,
        borderWidth: 1.5,
        borderColor: colors.neutral400,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.white,
    },
    checkboxChecked: {
        backgroundColor: colors.primary,
        borderColor: colors.primaryDark,
    },
    countdownCard: {
        minWidth: scale(220),
        backgroundColor: "rgba(255,255,255,0.75)",
        borderRadius: radius._15,
        padding: spacingX._12,
        borderWidth: 1,
        borderColor: colors.primaryLight,
        gap: verticalScale(8),
    },
    countdownHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: scale(8),
    },
    countdownEmojiWrap: {
        width: scale(34),
        height: scale(34),
        borderRadius: radius._10,
        backgroundColor: colors.primaryLight,
        alignItems: "center",
        justifyContent: "center",
    },
    countdownGrid: {
        flexDirection: "row",
        gap: scale(6),
    },
    timeBox: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.white,
        borderRadius: radius._10,
        paddingVertical: verticalScale(6),
        borderWidth: 1,
        borderColor: colors.neutral200,
    },
    countdownDonePill: {
        backgroundColor: "#dcfce7",
        borderRadius: radius._10,
        paddingVertical: verticalScale(7),
        paddingHorizontal: spacingX._10,
        alignItems: "center",
    },
    gameCard: {
        minWidth: scale(215),
        backgroundColor: "rgba(255,255,255,0.8)",
        borderRadius: radius._15,
        padding: spacingX._12,
        borderWidth: 1,
        borderColor: colors.primaryLight,
        gap: verticalScale(8),
    },
    gameTop: {
        flexDirection: "row",
        alignItems: "center",
        gap: scale(8),
    },
    gameEmojiWrap: {
        width: scale(36),
        height: scale(36),
        borderRadius: radius._12,
        backgroundColor: colors.primaryLight,
        alignItems: "center",
        justifyContent: "center",
    },
    gameResultBox: {
        backgroundColor: colors.neutral50,
        borderRadius: radius._12,
        paddingVertical: verticalScale(8),
        paddingHorizontal: spacingX._10,
        borderWidth: 1,
        borderColor: colors.neutral200,
    },
    playAgainBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: scale(5),
        paddingVertical: verticalScale(6),
        borderRadius: radius.full,
        backgroundColor: colors.primaryLight,
    },
    formatScroll: {
        paddingBottom: verticalScale(6),
        gap: scale(6),
        alignItems: "center",
    },
    formatPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: scale(4),
        paddingHorizontal: scale(10),
        paddingVertical: verticalScale(5),
        borderRadius: radius.full,
        backgroundColor: colors.neutral100,
        borderWidth: 1,
        borderColor: colors.neutral200,
    },
    formatPillActive: {
        backgroundColor: colors.primaryLight,
        borderColor: colors.primary,
    },
    quickReplyWrap: {
        borderTopWidth: 1,
        borderTopColor: colors.neutral200,
        backgroundColor: colors.neutral50,
        paddingVertical: verticalScale(6),
    },
    quickReplyScroll: {
        paddingHorizontal: spacingX._12,
        gap: scale(8),
        alignItems: "center",
    },
    quickReplyChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: scale(6),
        backgroundColor: colors.white,
        borderRadius: radius.full,
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(6),
        borderWidth: 1,
        borderColor: colors.primaryLight,
    },
    quickReplyManage: {
        flexDirection: "row",
        alignItems: "center",
        gap: scale(4),
        backgroundColor: colors.neutral200,
        borderRadius: radius.full,
        paddingHorizontal: scale(10),
        paddingVertical: verticalScale(6),
    },
});
