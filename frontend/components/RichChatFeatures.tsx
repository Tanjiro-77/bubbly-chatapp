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
import Svg, { Path } from "react-native-svg";
import { colors, radius, spacingX, spacingY } from "../constants/theme";
import { scale, verticalScale } from "../utils/styling";
import Typo from "./Typo";
import { ChecklistProps } from "../types";
import {
    BubblyCountdownPayload,
    BubblyDoodlePayload,
    BubblyEventPayload,
    BubblyGamePayload,
    BubblySplitPayload,
    BubblyWyrPayload,
    EventRsvpChoice,
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
                            hapticTap(willFinishAll ? "celebration" : "medium");
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
                        hapticTap("rigid");
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

// ── 4. Split Bill Interactive Card ───────────────────────────────────────────
export const SplitBillCardBubble = ({
    split,
    overrides = {},
    onTogglePaid,
}: {
    split: BubblySplitPayload;
    overrides?: Record<string, boolean>;
    onTogglePaid?: (participantId: string) => void;
}) => {
    const members = Array.isArray(split.participants) ? split.participants : [];
    const resolved = members.map((m) => ({
        ...m,
        paid: overrides[m.id] !== undefined ? overrides[m.id] : m.paid,
    }));
    const perPerson = resolved.length > 0 ? split.totalAmount / resolved.length : split.totalAmount;
    const paidCount = resolved.filter((m) => m.paid).length;
    const pct = resolved.length > 0 ? Math.round((paidCount / resolved.length) * 100) : 0;
    const allSettled = resolved.length > 0 && paidCount === resolved.length;
    const remainingAmt = Math.max(0, (resolved.length - paidCount) * perPerson);

    return (
        <Animated.View entering={FadeIn.duration(220)} layout={LinearTransition.springify()} style={richStyles.cardWrap}>
            <View style={richStyles.cardTopRow}>
                <View style={[richStyles.cardBadge, allSettled && { backgroundColor: "#dcfce7" }]}>
                    <Icons.Receipt size={verticalScale(13)} color={allSettled ? "#15803d" : colors.primaryDark} weight="fill" />
                    <Typo size={10.5} fontWeight="800" color={allSettled ? "#15803d" : colors.primaryDark}>
                        {allSettled ? "ALL SETTLED" : "SPLIT BILL"}
                    </Typo>
                </View>
                <Typo size={12} fontWeight="800" color={colors.neutral900}>
                    {split.currency}{split.totalAmount.toFixed(2)}
                </Typo>
            </View>

            <Typo size={15} fontWeight="800" color={colors.neutral900} style={{ marginTop: verticalScale(4) }}>
                {split.title}
            </Typo>
            <Typo size={11.5} color={colors.neutral500}>
                {split.currency}{perPerson.toFixed(2)} each · {allSettled ? "Everyone paid!" : `${split.currency}${remainingAmt.toFixed(2)} pending`}
            </Typo>

            <View style={richStyles.progressTrack}>
                <View style={[richStyles.progressFill, { width: `${pct}%`, backgroundColor: allSettled ? "#16a34a" : colors.primary }]} />
            </View>

            <View style={richStyles.checklistList}>
                {resolved.map((p) => (
                    <TouchableOpacity
                        key={p.id}
                        style={[richStyles.splitRow, p.paid && richStyles.checkRowDone]}
                        onPress={() => {
                            const willSettleAll = !p.paid && paidCount + 1 === resolved.length;
                            hapticTap(willSettleAll ? "celebration" : "medium");
                            onTogglePaid?.(p.id);
                        }}
                        activeOpacity={0.75}
                    >
                        <View style={[richStyles.checkbox, p.paid && { backgroundColor: "#16a34a", borderColor: "#15803d" }]}>
                            {p.paid && <Icons.Check size={11} color={colors.white} weight="bold" />}
                        </View>
                        <Typo size={13} fontWeight="600" color={colors.neutral800} style={{ flex: 1 }} textProps={{ numberOfLines: 1 }}>
                            {p.name}
                        </Typo>
                        <View style={[richStyles.splitStatusPill, p.paid ? richStyles.splitPaidPill : richStyles.splitPendingPill]}>
                            <Typo size={10.5} fontWeight="700" color={p.paid ? "#15803d" : colors.primaryDark}>
                                {p.paid ? "Paid" : `${split.currency}${perPerson.toFixed(2)}`}
                            </Typo>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>
        </Animated.View>
    );
};

// ── 5. Hand-Drawn Sketch / Doodle Bubble Card ─────────────────────────────────
export const DoodleCardBubble = ({ doodle }: { doodle: BubblyDoodlePayload }) => {
    const strokes = Array.isArray(doodle?.strokes) ? doodle.strokes : [];
    const bg = doodle.darkBg ? "#1c1917" : "#fffdf7";

    return (
        <Animated.View entering={FadeIn.springify()} style={richStyles.doodleCard}>
            <View style={richStyles.cardTopRow}>
                <View style={richStyles.cardBadge}>
                    <Icons.PaintBrush size={verticalScale(12)} color={colors.primaryDark} weight="fill" />
                    <Typo size={10} fontWeight="800" color={colors.primaryDark}>BUBBLY SKETCH</Typo>
                </View>
                <Typo size={10} color={colors.neutral400} fontWeight="600">
                    {strokes.length} stroke{strokes.length === 1 ? "" : "s"}
                </Typo>
            </View>
            <View style={[richStyles.doodleCanvas, { backgroundColor: bg }]}>
                <Svg width="100%" height="100%" viewBox="0 0 260 170">
                    {strokes.map((s, idx) => (
                        <Path
                            key={idx}
                            d={s.d}
                            stroke={s.color || "#f59e0b"}
                            strokeWidth={s.width || 3.5}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill="none"
                        />
                    ))}
                </Svg>
            </View>
            {!!doodle.caption?.trim() && (
                <Typo size={12.5} fontWeight="600" color={colors.neutral800} style={{ marginTop: 2 }}>
                    {doodle.caption}
                </Typo>
            )}
        </Animated.View>
    );
};

// ── 6. Smart Event / Meetup Card ─────────────────────────────────────────────
export const EventCardBubble = ({
    event,
    rsvp,
    onSelectRsvp,
    onRemindMe,
}: {
    event: BubblyEventPayload;
    rsvp?: EventRsvpChoice | null;
    onSelectRsvp?: (choice: EventRsvpChoice) => void;
    onRemindMe?: () => void;
}) => (
    <Animated.View entering={FadeIn.duration(220)} style={richStyles.cardWrap}>
        <View style={richStyles.cardTopRow}>
            <View style={richStyles.cardBadge}>
                <Icons.CalendarCheck size={verticalScale(13)} color={colors.primaryDark} weight="fill" />
                <Typo size={10.5} fontWeight="800" color={colors.primaryDark}>EVENT INVITE</Typo>
            </View>
            <Typo size={14}>{event.emoji || "📅"}</Typo>
        </View>
        <Typo size={15} fontWeight="800" color={colors.neutral900} style={{ marginTop: verticalScale(4) }}>
            {event.title}
        </Typo>
        <Typo size={12} fontWeight="600" color={colors.primaryDark} style={{ marginTop: 2 }}>
            🕒 {event.whenLabel}
        </Typo>
        {!!event.location?.trim() && (
            <Typo size={11.5} color={colors.neutral600} style={{ marginTop: 2 }}>
                📍 {event.location}
            </Typo>
        )}
        {!!event.note?.trim() && (
            <Typo size={11.5} color={colors.neutral500} style={{ marginTop: 2 }}>
                {event.note}
            </Typo>
        )}

        <View style={{ flexDirection: "row", gap: 6, marginTop: verticalScale(8) }}>
            {([
                { key: "going" as const, label: "✓ Going" },
                { key: "maybe" as const, label: "? Maybe" },
                { key: "declined" as const, label: "✕ Can't" },
            ]).map((opt) => {
                const active = rsvp === opt.key;
                return (
                    <TouchableOpacity
                        key={opt.key}
                        onPress={() => {
                            hapticTap(opt.key === "going" ? "success" : "medium");
                            onSelectRsvp?.(opt.key);
                        }}
                        activeOpacity={0.75}
                        style={{
                            flex: 1,
                            paddingVertical: verticalScale(6),
                            borderRadius: radius.full,
                            alignItems: "center",
                            backgroundColor: active
                                ? (opt.key === "going" ? "#dcfce7" : opt.key === "maybe" ? colors.primaryLight : "#fee2e2")
                                : colors.neutral100,
                            borderWidth: 1,
                            borderColor: active
                                ? (opt.key === "going" ? "#16a34a" : opt.key === "maybe" ? colors.primaryDark : colors.rose)
                                : colors.neutral200,
                        }}
                    >
                        <Typo
                            size={11}
                            fontWeight={active ? "800" : "600"}
                            color={active ? colors.neutral900 : colors.neutral600}
                        >
                            {opt.label}
                        </Typo>
                    </TouchableOpacity>
                );
            })}
        </View>
        {onRemindMe && (
            <TouchableOpacity
                onPress={() => {
                    hapticTap("medium");
                    onRemindMe();
                }}
                activeOpacity={0.75}
                style={[richStyles.playAgainBtn, { marginTop: verticalScale(6) }]}
            >
                <Icons.BellRinging size={13} color={colors.primaryDark} weight="bold" />
                <Typo size={11} fontWeight="800" color={colors.primaryDark}>Remind Me</Typo>
            </TouchableOpacity>
        )}
    </Animated.View>
);

// ── 7. Would You Rather Interactive Card ──────────────────────────────────────
export const WyrCardBubble = ({
    wyr,
    picked,
    onPick,
}: {
    wyr: BubblyWyrPayload;
    picked?: "A" | "B" | null;
    onPick?: (choice: "A" | "B") => void;
}) => (
    <Animated.View entering={FadeIn.springify()} style={richStyles.cardWrap}>
        <View style={richStyles.cardTopRow}>
            <View style={richStyles.cardBadge}>
                <Icons.Scales size={verticalScale(13)} color={colors.primaryDark} weight="fill" />
                <Typo size={10.5} fontWeight="800" color={colors.primaryDark}>THIS OR THAT</Typo>
            </View>
            {picked && (
                <Typo size={10.5} fontWeight="700" color="#16a34a">Picked {picked}</Typo>
            )}
        </View>

        <View style={{ gap: verticalScale(6), marginTop: verticalScale(8) }}>
            <TouchableOpacity
                onPress={() => { hapticTap("medium"); onPick?.("A"); }}
                activeOpacity={0.75}
                style={[
                    richStyles.wyrOption,
                    picked === "A" && richStyles.wyrOptionActive,
                ]}
            >
                <Typo size={11} fontWeight="800" color={colors.primaryDark}>A</Typo>
                <Typo size={13} fontWeight={picked === "A" ? "800" : "600"} color={colors.neutral900} style={{ flex: 1 }}>
                    {wyr.optionA}
                </Typo>
                {picked === "A" && <Icons.CheckCircle size={15} color={colors.primaryDark} weight="fill" />}
            </TouchableOpacity>

            <TouchableOpacity
                onPress={() => { hapticTap("medium"); onPick?.("B"); }}
                activeOpacity={0.75}
                style={[
                    richStyles.wyrOption,
                    picked === "B" && richStyles.wyrOptionActive,
                ]}
            >
                <Typo size={11} fontWeight="800" color={colors.primaryDark}>B</Typo>
                <Typo size={13} fontWeight={picked === "B" ? "800" : "600"} color={colors.neutral900} style={{ flex: 1 }}>
                    {wyr.optionB}
                </Typo>
                {picked === "B" && <Icons.CheckCircle size={15} color={colors.primaryDark} weight="fill" />}
            </TouchableOpacity>
        </View>
    </Animated.View>
);

// ── 8. Empty Chat Smart Icebreakers ───────────────────────────────────────────
export const EmptyChatStarters = ({
    isNotesToSelf,
    contactName,
    onPickText,
    onOpenGame,
    onOpenChecklist,
}: {
    isNotesToSelf: boolean;
    contactName?: string;
    onPickText: (text: string) => void;
    onOpenGame?: () => void;
    onOpenChecklist?: () => void;
}) => {
    const prompts = isNotesToSelf
        ? [
              "📝 Today's Top 3 Priorities:\n• \n• \n• ",
              "💡 Quick idea: ",
              "🛒 Groceries & errands to pick up",
              "🔗 Link to check later: ",
          ]
        : [
              `👋 Hey${contactName ? ` ${contactName.split(" ")[0]}` : ""}! How's your week going?`,
              "☕ Free to catch up for a bit today?",
              "🎉 Got any fun plans for the weekend?",
              "||Guess what just happened!|| 👀",
          ];

    return (
        <View style={richStyles.starterCard}>
            <Typo size={11} fontWeight="800" color={colors.primaryDark} style={{ letterSpacing: 0.4 }}>
                {isNotesToSelf ? "QUICK NOTE TEMPLATES" : "TAP TO START THE CONVERSATION"}
            </Typo>
            <View style={richStyles.starterGrid}>
                {prompts.map((p) => (
                    <TouchableOpacity
                        key={p}
                        style={richStyles.starterChip}
                        activeOpacity={0.75}
                        onPress={() => {
                            hapticTap("medium");
                            onPickText(p);
                        }}
                    >
                        <Typo size={12} fontWeight="600" color={colors.neutral800} textProps={{ numberOfLines: 1 }}>
                            {p.replace(/\n/g, " ")}
                        </Typo>
                    </TouchableOpacity>
                ))}
            </View>
            {!isNotesToSelf && (onOpenGame || onOpenChecklist) && (
                <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                    {onOpenGame && (
                        <TouchableOpacity
                            style={richStyles.starterActionBtn}
                            onPress={() => { hapticTap("medium"); onOpenGame(); }}
                            activeOpacity={0.75}
                        >
                            <Typo size={12} fontWeight="700" color={colors.primaryDark}>🎮 Play Icebreaker</Typo>
                        </TouchableOpacity>
                    )}
                    {onOpenChecklist && (
                        <TouchableOpacity
                            style={richStyles.starterActionBtn}
                            onPress={() => { hapticTap("medium"); onOpenChecklist(); }}
                            activeOpacity={0.75}
                        >
                            <Typo size={12} fontWeight="700" color={colors.primaryDark}>✅ Share Checklist</Typo>
                        </TouchableOpacity>
                    )}
                </View>
            )}
        </View>
    );
};

// ── 7. Composer Formatting Bar (Bold, Italic, Strike, Code, Spoiler, Quote, List, Stamp, Fancy, Silent) ──
export const ComposerFormatBar = ({
    onApplyFormat,
    isSilent,
    onToggleSilent,
    onOpenQuickReplies,
    onOpenFancyText,
}: {
    onApplyFormat: (format: "bold" | "italic" | "strike" | "code" | "spoiler" | "quote" | "bullet" | "stamp") => void;
    isSilent: boolean;
    onToggleSilent: () => void;
    onOpenQuickReplies: () => void;
    onOpenFancyText?: () => void;
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
            { id: "spoiler" as const, label: "🙈 Spoiler" },
            { id: "quote" as const, label: "❝ Quote" },
            { id: "bullet" as const, label: "• List" },
            { id: "stamp" as const, label: "📅 Now" },
        ].map((btn) => (
            <TouchableOpacity
                key={btn.id}
                onPress={() => {
                    hapticTap("medium");
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
                hapticTap("heavy");
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
                hapticTap("medium");
                onOpenQuickReplies();
            }}
            activeOpacity={0.7}
            style={richStyles.formatPill}
        >
            <Icons.Lightning size={13} color={colors.primaryDark} weight="fill" />
            <Typo size={11.5} fontWeight="700" color={colors.neutral800}>Templates</Typo>
        </TouchableOpacity>

        {onOpenFancyText && (
            <TouchableOpacity
                onPress={() => {
                    hapticTap("medium");
                    onOpenFancyText();
                }}
                activeOpacity={0.7}
                style={richStyles.formatPill}
            >
                <Icons.Sparkle size={13} color={colors.primaryDark} weight="fill" />
                <Typo size={11.5} fontWeight="700" color={colors.neutral800}>Fancy Fonts</Typo>
            </TouchableOpacity>
        )}
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
                        onPress={() => {
                            hapticTap("medium");
                            onSelect(tpl);
                        }}
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
                <TouchableOpacity
                    style={richStyles.quickReplyManage}
                    onPress={() => {
                        hapticTap("medium");
                        onManage();
                    }}
                    activeOpacity={0.75}
                >
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
    splitRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: scale(8),
        paddingVertical: verticalScale(5),
    },
    splitStatusPill: {
        paddingHorizontal: scale(8),
        paddingVertical: verticalScale(2),
        borderRadius: radius.full,
    },
    splitPaidPill: {
        backgroundColor: "#dcfce7",
    },
    splitPendingPill: {
        backgroundColor: colors.primaryLight,
    },
    doodleCard: {
        minWidth: scale(220),
        backgroundColor: "rgba(255,255,255,0.85)",
        borderRadius: radius._15,
        padding: spacingX._10,
        borderWidth: 1,
        borderColor: colors.primaryLight,
        gap: verticalScale(6),
    },
    doodleCanvas: {
        width: scale(220),
        height: verticalScale(145),
        borderRadius: radius._12,
        borderWidth: 1,
        borderColor: colors.neutral200,
        overflow: "hidden",
    },
    starterCard: {
        marginTop: verticalScale(12),
        width: "100%",
        maxWidth: scale(300),
        backgroundColor: colors.neutral50,
        borderRadius: radius._20,
        padding: spacingX._15,
        borderWidth: 1,
        borderColor: colors.neutral200,
        gap: verticalScale(8),
        alignItems: "center",
    },
    starterGrid: {
        width: "100%",
        gap: verticalScale(6),
    },
    starterChip: {
        backgroundColor: colors.white,
        borderRadius: radius._12,
        paddingHorizontal: spacingX._12,
        paddingVertical: verticalScale(8),
        borderWidth: 1,
        borderColor: colors.neutral200,
    },
    starterActionBtn: {
        flex: 1,
        backgroundColor: colors.primaryLight,
        borderRadius: radius.full,
        paddingVertical: verticalScale(7),
        paddingHorizontal: spacingX._10,
        alignItems: "center",
        borderWidth: 1,
        borderColor: colors.primary,
    },
    wyrOption: {
        flexDirection: "row",
        alignItems: "center",
        gap: scale(8),
        paddingHorizontal: spacingX._10,
        paddingVertical: verticalScale(8),
        borderRadius: radius._12,
        backgroundColor: colors.neutral50,
        borderWidth: 1,
        borderColor: colors.neutral200,
    },
    wyrOptionActive: {
        backgroundColor: colors.primaryLight,
        borderColor: colors.primary,
    },
});
