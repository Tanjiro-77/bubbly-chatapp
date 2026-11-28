/**
 * frontend/components/ConversationFeatureModals.tsx
 *
 * Interactive modals for Checklist Creation, Icebreaker Mini-Games, Live Countdowns,
 * Quick Replies Manager, Chat Insights Analytics, Quick Jump Command Palette,
 * and Message Reminder Alarms.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    FlatList,
    KeyboardAvoidingView,
    Modal,
    PanResponder,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    useWindowDimensions,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Icons from "phosphor-react-native";
import * as Clipboard from "expo-clipboard";
import Svg, { Path } from "react-native-svg";
import moment from "moment";
import { colors, radius, spacingX, spacingY } from "../constants/theme";
import { scale, verticalScale } from "../utils/styling";
import Typo from "./Typo";
import Avatar from "./Avatar";
import { ChecklistProps, ConversationProps, MessageProps } from "../types";
import {
    BubblyCountdownPayload,
    BubblyDoodlePayload,
    BubblyDoodleStroke,
    BubblyEventPayload,
    BubblyGameKind,
    BubblyGamePayload,
    BubblySplitPayload,
    BubblyWyrPayload,
    ChatInsightsSummary,
    computeChatInsights,
    DailyActivityStats,
    getChatScratchpad,
    QuickReplyTemplate,
    saveChatScratchpad,
} from "../utils/featureStorage";
import { hapticTap } from "../utils/haptics";
import { SavedMessageReminder } from "../services/reminderService";

// ── 1. Checklist Creator Modal ────────────────────────────────────────────────
export const ChecklistCreatorModal = ({
    visible,
    onCreate,
    onClose,
}: {
    visible: boolean;
    onCreate: (checklist: ChecklistProps) => void;
    onClose: () => void;
}) => {
    const insets = useSafeAreaInsets();
    const [title, setTitle] = useState("");
    const [items, setItems] = useState(["", "", ""]);
    const [error, setError] = useState("");

    const handleSubmit = () => {
        const cleanTitle = title.trim() || "Shared Checklist";
        const validItems = items
            .map((t) => t.trim())
            .filter(Boolean)
            .map((text, idx) => ({
                id: `${Date.now()}_${idx}`,
                text,
                completed: false,
                completedBy: "",
            }));
        if (validItems.length === 0) {
            hapticTap("error");
            setError("Add at least 1 checklist item");
            return;
        }
        hapticTap("success");
        onCreate({ title: cleanTitle, items: validItems });
        setTitle("");
        setItems(["", "", ""]);
        setError("");
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={modalStyles.overlay}>
                    <TouchableWithoutFeedback>
                        <KeyboardAvoidingView
                            behavior="padding"
                            style={[modalStyles.sheet, { paddingBottom: Math.max(insets.bottom, spacingY._20) + spacingY._8 }]}
                        >
                            <View style={modalStyles.handle} />
                            <View style={modalStyles.header}>
                                <Typo size={17} fontWeight="800" color={colors.neutral900}>✅ New Checklist</Typo>
                                <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
                                    <Icons.X size={16} color={colors.neutral600} weight="bold" />
                                </TouchableOpacity>
                            </View>
                            <ScrollView contentContainerStyle={modalStyles.body} keyboardShouldPersistTaps="handled">
                                <Typo size={12.5} fontWeight="700" color={colors.neutral600}>Checklist Title</Typo>
                                <TextInput
                                    style={modalStyles.input}
                                    placeholder="e.g. Weekend Trip Packing"
                                    placeholderTextColor={colors.neutral400}
                                    value={title}
                                    onChangeText={(v) => { setTitle(v); setError(""); }}
                                    maxLength={100}
                                />

                                <Typo size={12.5} fontWeight="700" color={colors.neutral600} style={{ marginTop: verticalScale(12) }}>
                                    Items
                                </Typo>
                                {items.map((val, idx) => (
                                    <View key={idx} style={modalStyles.itemRow}>
                                        <TextInput
                                            style={[modalStyles.input, { flex: 1, marginTop: 0 }]}
                                            placeholder={`Task ${idx + 1}`}
                                            placeholderTextColor={colors.neutral400}
                                            value={val}
                                            onChangeText={(txt) => {
                                                const next = [...items];
                                                next[idx] = txt;
                                                setItems(next);
                                                setError("");
                                            }}
                                            maxLength={140}
                                        />
                                        {items.length > 1 && (
                                            <TouchableOpacity
                                                onPress={() => {
                                                    hapticTap("warning");
                                                    setItems(items.filter((_, i) => i !== idx));
                                                }}
                                                style={modalStyles.removeBtn}
                                            >
                                                <Icons.X size={14} color={colors.rose} weight="bold" />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                ))}

                                {items.length < 12 && (
                                    <TouchableOpacity
                                        style={modalStyles.addBtn}
                                        onPress={() => {
                                            hapticTap("medium");
                                            setItems([...items, ""]);
                                        }}
                                    >
                                        <Icons.Plus size={15} color={colors.primaryDark} weight="bold" />
                                        <Typo size={13} fontWeight="700" color={colors.primaryDark}>Add Task</Typo>
                                    </TouchableOpacity>
                                )}

                                {!!error && <Typo size={12} color={colors.rose} fontWeight="600">{error}</Typo>}

                                <TouchableOpacity style={modalStyles.primaryBtn} onPress={handleSubmit} activeOpacity={0.8}>
                                    <Typo size={15} fontWeight="800" color={colors.black}>Send Checklist</Typo>
                                </TouchableOpacity>
                            </ScrollView>
                        </KeyboardAvoidingView>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

// ── 2. Mini-Game Icebreaker Generator & Picker Modal ──────────────────────────
export function rollBubblyGame(kind: BubblyGameKind, customQuestion?: string): BubblyGamePayload {
    if (kind === "dice") {
        const roll = Math.floor(Math.random() * 6) + 1;
        return { kind: "dice", title: "Roll a D6 Dice", result: `Rolled a ${roll}!`, detail: "Fair random 1–6 roll" };
    }
    if (kind === "coin") {
        const heads = Math.random() < 0.5;
        return { kind: "coin", title: "Coin Flip", result: heads ? "Heads ✨" : "Tails 🔥", detail: "50/50 toss" };
    }
    if (kind === "rps") {
        const choices = ["Rock 🪨", "Paper 📄", "Scissors ✂️"];
        const pick = choices[Math.floor(Math.random() * choices.length)];
        return { kind: "rps", title: "Rock · Paper · Scissors", result: pick, detail: "Let's see who wins!" };
    }
    const answers = [
        "It is decidedly so ✨",
        "Without a doubt 💯",
        "Ask again later ⏳",
        "Outlook good 🚀",
        "Better not tell you now 🤫",
        "Signs point to yes 🌟",
        "Don't count on it 🙅",
        "Concentrate and ask again 🔮",
    ];
    const reply = answers[Math.floor(Math.random() * answers.length)];
    return {
        kind: "8ball",
        title: customQuestion?.trim() ? `8-Ball: "${customQuestion.trim().slice(0, 48)}"` : "Magic 8-Ball",
        result: reply,
        detail: "Mystic Honey Oracle",
    };
}

export const GamePickerModal = ({
    visible,
    onSelectGame,
    onClose,
}: {
    visible: boolean;
    onSelectGame: (game: BubblyGamePayload) => void;
    onClose: () => void;
}) => {
    const insets = useSafeAreaInsets();
    const [question, setQuestion] = useState("");

    const play = (kind: BubblyGameKind) => {
        hapticTap("rigid");
        const res = rollBubblyGame(kind, question);
        setQuestion("");
        onSelectGame(res);
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={modalStyles.overlay}>
                    <TouchableWithoutFeedback>
                        <View style={[modalStyles.sheet, { paddingBottom: Math.max(insets.bottom, spacingY._20) + spacingY._8 }]}>
                            <View style={modalStyles.handle} />
                            <View style={modalStyles.header}>
                                <Typo size={17} fontWeight="800" color={colors.neutral900}>🎮 Chat Games & Icebreakers</Typo>
                                <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
                                    <Icons.X size={16} color={colors.neutral600} weight="bold" />
                                </TouchableOpacity>
                            </View>
                            <View style={modalStyles.body}>
                                <TextInput
                                    style={modalStyles.input}
                                    placeholder="Optional question for Magic 8-Ball..."
                                    placeholderTextColor={colors.neutral400}
                                    value={question}
                                    onChangeText={setQuestion}
                                    maxLength={80}
                                />
                                <View style={modalStyles.gameGrid}>
                                    {[
                                        { kind: "dice" as const, emoji: "🎲", label: "Roll Dice", desc: "1 to 6" },
                                        { kind: "coin" as const, emoji: "🪙", label: "Coin Flip", desc: "Heads / Tails" },
                                        { kind: "8ball" as const, emoji: "🎱", label: "Magic 8-Ball", desc: "Ask fortune" },
                                        { kind: "rps" as const, emoji: "✊", label: "R · P · S", desc: "Throw hand" },
                                    ].map((g) => (
                                        <TouchableOpacity
                                            key={g.kind}
                                            style={modalStyles.gameTile}
                                            onPress={() => play(g.kind)}
                                            activeOpacity={0.75}
                                        >
                                            <Typo size={26}>{g.emoji}</Typo>
                                            <Typo size={13.5} fontWeight="800" color={colors.neutral900}>{g.label}</Typo>
                                            <Typo size={11} color={colors.neutral400}>{g.desc}</Typo>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

// ── 3. Live Event Countdown Creator Modal ─────────────────────────────────────
export const CountdownCreatorModal = ({
    visible,
    onCreate,
    onClose,
}: {
    visible: boolean;
    onCreate: (payload: BubblyCountdownPayload) => void;
    onClose: () => void;
}) => {
    const insets = useSafeAreaInsets();
    const [title, setTitle] = useState("");
    const [emoji, setEmoji] = useState("⏳");
    const [customHours, setCustomHours] = useState(2);
    const [customMins, setCustomMins] = useState(0);

    const PRESETS = [
        { label: "15m", ms: 15 * 60 * 1000 },
        { label: "1h", ms: 3600 * 1000 },
        { label: "6h", ms: 6 * 3600 * 1000 },
        {
            label: "Tomorrow 9 AM",
            ms: (() => {
                const n = new Date();
                const t = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1, 9, 0, 0);
                return Math.max(t.getTime() - n.getTime(), 60000);
            })(),
        },
        { label: "7 Days", ms: 7 * 86400 * 1000 },
    ];

    const triggerCreate = (ms: number) => {
        hapticTap("celebration");
        onCreate({
            title: title.trim() || "Upcoming Event",
            emoji,
            targetIso: new Date(Date.now() + Math.max(ms, 60000)).toISOString(),
        });
        setTitle("");
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={modalStyles.overlay}>
                    <TouchableWithoutFeedback>
                        <KeyboardAvoidingView
                            behavior="padding"
                            style={[modalStyles.sheet, { paddingBottom: Math.max(insets.bottom, spacingY._20) + spacingY._8 }]}
                        >
                            <View style={modalStyles.handle} />
                            <View style={modalStyles.header}>
                                <Typo size={17} fontWeight="800" color={colors.neutral900}>⏳ Live Countdown Sticker</Typo>
                                <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
                                    <Icons.X size={16} color={colors.neutral600} weight="bold" />
                                </TouchableOpacity>
                            </View>
                            <ScrollView contentContainerStyle={modalStyles.body} keyboardShouldPersistTaps="handled">
                                <View style={{ flexDirection: "row", gap: 8 }}>
                                    {["⏳", "🎉", "🚀", "🎂", "✈️"].map((e) => (
                                        <TouchableOpacity
                                            key={e}
                                            onPress={() => { hapticTap("light"); setEmoji(e); }}
                                            style={[modalStyles.emojiBtn, emoji === e && modalStyles.emojiBtnActive]}
                                        >
                                            <Typo size={20}>{e}</Typo>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                <TextInput
                                    style={modalStyles.input}
                                    placeholder="Event name (e.g. Launch Party, Meetup)"
                                    placeholderTextColor={colors.neutral400}
                                    value={title}
                                    onChangeText={setTitle}
                                    maxLength={80}
                                />
                                <Typo size={12} fontWeight="700" color={colors.neutral500} style={{ marginTop: 10 }}>
                                    Quick Presets
                                </Typo>
                                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                                    {PRESETS.map((p) => (
                                        <TouchableOpacity
                                            key={p.label}
                                            style={[modalStyles.emojiStatPill, { paddingHorizontal: 12, paddingVertical: 8 }]}
                                            onPress={() => triggerCreate(p.ms)}
                                            activeOpacity={0.75}
                                        >
                                            <Typo size={12.5} fontWeight="700" color={colors.neutral900}>{p.label}</Typo>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <Typo size={12} fontWeight="700" color={colors.neutral500} style={{ marginTop: 10 }}>
                                    Or Set Custom Duration
                                </Typo>
                                <View style={modalStyles.tplCard}>
                                    <View style={{ flex: 1, gap: 4 }}>
                                        <Typo size={11.5} fontWeight="700" color={colors.neutral500}>Hours</Typo>
                                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                                            <TouchableOpacity
                                                onPress={() => { hapticTap("light"); setCustomHours((h) => Math.max(0, h - 1)); }}
                                                style={modalStyles.closeBtn}
                                            >
                                                <Icons.Minus size={14} color={colors.neutral800} weight="bold" />
                                            </TouchableOpacity>
                                            <Typo size={16} fontWeight="800" color={colors.neutral900}>{customHours}h</Typo>
                                            <TouchableOpacity
                                                onPress={() => { hapticTap("light"); setCustomHours((h) => Math.min(168, h + 1)); }}
                                                style={modalStyles.closeBtn}
                                            >
                                                <Icons.Plus size={14} color={colors.neutral800} weight="bold" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                    <View style={{ flex: 1, gap: 4 }}>
                                        <Typo size={11.5} fontWeight="700" color={colors.neutral500}>Minutes</Typo>
                                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                                            <TouchableOpacity
                                                onPress={() => { hapticTap("light"); setCustomMins((m) => Math.max(0, m - 5)); }}
                                                style={modalStyles.closeBtn}
                                            >
                                                <Icons.Minus size={14} color={colors.neutral800} weight="bold" />
                                            </TouchableOpacity>
                                            <Typo size={16} fontWeight="800" color={colors.neutral900}>{customMins}m</Typo>
                                            <TouchableOpacity
                                                onPress={() => { hapticTap("light"); setCustomMins((m) => (m + 5) % 60); }}
                                                style={modalStyles.closeBtn}
                                            >
                                                <Icons.Plus size={14} color={colors.neutral800} weight="bold" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={modalStyles.primaryBtn}
                                    onPress={() => triggerCreate((customHours * 60 + Math.max(customMins, customHours === 0 ? 5 : 0)) * 60 * 1000)}
                                    activeOpacity={0.8}
                                >
                                    <Typo size={14.5} fontWeight="800" color={colors.black}>
                                        Send {customHours > 0 || customMins > 0 ? `(${customHours}h ${customMins}m)` : "(5m)"} Countdown
                                    </Typo>
                                </TouchableOpacity>
                            </ScrollView>
                        </KeyboardAvoidingView>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

// ── 4. Quick Replies Manager Modal ────────────────────────────────────────────
export const QuickRepliesManagerModal = ({
    visible,
    templates,
    onSave,
    onClose,
}: {
    visible: boolean;
    templates: QuickReplyTemplate[];
    onSave: (list: QuickReplyTemplate[]) => void;
    onClose: () => void;
}) => {
    const insets = useSafeAreaInsets();
    const [trigger, setTrigger] = useState("");
    const [text, setText] = useState("");

    const handleAdd = () => {
        const cleanTrig = trigger.trim().replace(/^\/+/, "").replace(/\s+/g, "").toLowerCase().slice(0, 20);
        const cleanText = text.trim().slice(0, 250);
        if (!cleanTrig || !cleanText) {
            hapticTap("error");
            return;
        }
        hapticTap("success");
        const next: QuickReplyTemplate[] = [
            { id: `qr_${Date.now()}`, trigger: cleanTrig, text: cleanText },
            ...templates.filter((t) => t.trigger !== cleanTrig),
        ];
        onSave(next);
        setTrigger("");
        setText("");
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={modalStyles.overlay}>
                    <TouchableWithoutFeedback>
                        <KeyboardAvoidingView
                            behavior="padding"
                            style={[modalStyles.sheet, { paddingBottom: Math.max(insets.bottom, spacingY._20) + spacingY._8, maxHeight: "82%" }]}
                        >
                            <View style={modalStyles.handle} />
                            <View style={modalStyles.header}>
                                <Typo size={17} fontWeight="800" color={colors.neutral900}>⚡ Quick Reply Templates</Typo>
                                <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
                                    <Icons.X size={16} color={colors.neutral600} weight="bold" />
                                </TouchableOpacity>
                            </View>
                            <ScrollView contentContainerStyle={modalStyles.body} keyboardShouldPersistTaps="handled">
                                <Typo size={12} color={colors.neutral500}>
                                    Type "/" in chat to trigger any saved snippet instantly.
                                </Typo>
                                <TextInput
                                    style={modalStyles.input}
                                    placeholder="Shortcut without slash (e.g. addr)"
                                    placeholderTextColor={colors.neutral400}
                                    value={trigger}
                                    onChangeText={setTrigger}
                                    autoCapitalize="none"
                                />
                                <TextInput
                                    style={modalStyles.input}
                                    placeholder="Full message text..."
                                    placeholderTextColor={colors.neutral400}
                                    value={text}
                                    onChangeText={setText}
                                />
                                <TouchableOpacity style={modalStyles.primaryBtn} onPress={handleAdd}>
                                    <Typo size={14} fontWeight="800" color={colors.black}>Add / Update Snippet</Typo>
                                </TouchableOpacity>

                                <View style={{ marginTop: 14, gap: 8 }}>
                                    {templates.map((tpl) => (
                                        <View key={tpl.id} style={modalStyles.tplCard}>
                                            <View style={{ flex: 1, minWidth: 0 }}>
                                                <Typo size={13} fontWeight="800" color={colors.primaryDark}>/{tpl.trigger}</Typo>
                                                <Typo size={12.5} color={colors.neutral700} textProps={{ numberOfLines: 2 }}>{tpl.text}</Typo>
                                            </View>
                                            <TouchableOpacity
                                                onPress={() => {
                                                    hapticTap("warning");
                                                    onSave(templates.filter((t) => t.id !== tpl.id));
                                                }}
                                                style={modalStyles.removeBtn}
                                            >
                                                <Icons.Trash size={14} color={colors.rose} weight="bold" />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </View>
                            </ScrollView>
                        </KeyboardAvoidingView>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

// ── 5. Chat Insights & Analytics Modal ────────────────────────────────────────
export const ChatInsightsModal = ({
    visible,
    chatName,
    messages,
    currentUserId,
    onClose,
}: {
    visible: boolean;
    chatName: string;
    messages: MessageProps[];
    currentUserId?: string;
    onClose: () => void;
}) => {
    const insets = useSafeAreaInsets();
    const stats: ChatInsightsSummary = useMemo(
        () => computeChatInsights(messages, currentUserId),
        [messages, currentUserId]
    );
    const { avgWords, longestLen } = useMemo(() => {
        let wordSum = 0;
        let textCount = 0;
        let maxLen = 0;
        for (const m of messages) {
            if (m.isDeleted || m.type === "system" || !m.content) continue;
            const len = m.content.trim().length;
            if (len > maxLen) maxLen = len;
            wordSum += m.content.trim().split(/\s+/).filter(Boolean).length;
            textCount++;
        }
        return {
            avgWords: textCount > 0 ? (wordSum / textCount).toFixed(1) : "0",
            longestLen: maxLen,
        };
    }, [messages]);
    const myPct = stats.totalMessages > 0 ? Math.round((stats.sentByMe / stats.totalMessages) * 100) : 50;
    const [copiedSummary, setCopiedSummary] = useState(false);

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={modalStyles.overlay}>
                    <TouchableWithoutFeedback>
                        <View style={[modalStyles.sheet, { paddingBottom: Math.max(insets.bottom, spacingY._20) + spacingY._8 }]}>
                            <View style={modalStyles.handle} />
                            <View style={modalStyles.header}>
                                <View style={{ flex: 1, minWidth: 0 }}>
                                    <Typo size={17} fontWeight="800" color={colors.neutral900} textProps={{ numberOfLines: 1 }}>
                                        📊 Chat Insights · {chatName}
                                    </Typo>
                                    <Typo size={11.5} color={colors.neutral500}>Computed from loaded conversation history</Typo>
                                </View>
                                <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
                                    <Icons.X size={16} color={colors.neutral600} weight="bold" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView contentContainerStyle={modalStyles.body}>
                                <View style={modalStyles.statGrid}>
                                    {[
                                        { label: "Messages", val: String(stats.totalMessages), icon: "💬" },
                                        { label: "Voice Clips", val: `${stats.voiceCount} (${Math.round(stats.voiceSeconds)}s)`, icon: "🎤" },
                                        { label: "Media & Docs", val: String(stats.mediaCount), icon: "🖼️" },
                                        { label: "Peak Hour", val: stats.peakHourLabel, icon: "⏰" },
                                        { label: "Active Days", val: String(stats.activeDays), icon: "📅" },
                                        { label: "Polls & Lists", val: String(stats.pollCount + stats.checklistCount), icon: "✅" },
                                        { label: "Avg Words", val: avgWords, icon: "✍️" },
                                        { label: "Longest Msg", val: `${longestLen} ch`, icon: "📏" },
                                        { label: "Your Share", val: `${myPct}%`, icon: "⚖️" },
                                    ].map((box) => (
                                        <View key={box.label} style={modalStyles.statTile}>
                                            <Typo size={18}>{box.icon}</Typo>
                                            <Typo size={14} fontWeight="800" color={colors.neutral900}>{box.val}</Typo>
                                            <Typo size={10.5} color={colors.neutral500}>{box.label}</Typo>
                                        </View>
                                    ))}
                                </View>

                                <View style={modalStyles.ratioCard}>
                                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                                        <Typo size={12} fontWeight="700" color={colors.neutral800}>You ({stats.sentByMe})</Typo>
                                        <Typo size={12} fontWeight="700" color={colors.neutral500}>Them ({stats.received})</Typo>
                                    </View>
                                    <View style={modalStyles.ratioBar}>
                                        <View style={[modalStyles.ratioMine, { width: `${myPct}%` }]} />
                                    </View>
                                </View>

                                {stats.topEmojis.length > 0 && (
                                    <View style={modalStyles.ratioCard}>
                                        <Typo size={12} fontWeight="700" color={colors.neutral700} style={{ marginBottom: 6 }}>
                                            Top Emoji Reactions
                                        </Typo>
                                        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                                            {stats.topEmojis.map((e) => (
                                                <View key={e.emoji} style={modalStyles.emojiStatPill}>
                                                    <Typo size={15}>{e.emoji}</Typo>
                                                    <Typo size={12} fontWeight="700" color={colors.neutral800}>{e.count}</Typo>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                )}

                                <TouchableOpacity
                                    style={modalStyles.primaryBtn}
                                    activeOpacity={0.8}
                                    onPress={async () => {
                                        const summary = `📊 Bubbly Chat Insights (${chatName})\n• Messages: ${stats.totalMessages} (You: ${stats.sentByMe}, Them: ${stats.received})\n• Voice Notes: ${stats.voiceCount} (${Math.round(stats.voiceSeconds)}s)\n• Media/Docs: ${stats.mediaCount}\n• Peak Hour: ${stats.peakHourLabel} · Active Days: ${stats.activeDays}`;
                                        await Clipboard.setStringAsync(summary).catch(() => {});
                                        hapticTap("success");
                                        setCopiedSummary(true);
                                        setTimeout(() => setCopiedSummary(false), 2000);
                                    }}
                                >
                                    <Typo size={14} fontWeight="800" color={colors.black}>
                                        {copiedSummary ? "✓ Summary Copied!" : "Copy Stats Summary"}
                                    </Typo>
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

// ── 12. Smart Event / Meetup Creator Modal ────────────────────────────────────
export const EventCreatorModal = ({
    visible,
    onCreate,
    onClose,
}: {
    visible: boolean;
    onCreate: (event: BubblyEventPayload) => void;
    onClose: () => void;
}) => {
    const insets = useSafeAreaInsets();
    const [title, setTitle] = useState("");
    const [emoji, setEmoji] = useState("📅");
    const [location, setLocation] = useState("");
    const [note, setNote] = useState("");
    const [slotIdx, setSlotIdx] = useState(0);

    const TIME_SLOTS = useMemo(() => {
        const now = new Date();
        const in1h = new Date(now.getTime() + 60 * 60 * 1000);
        const tonight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 19, 0, 0);
        const tmrMorning = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 10, 0, 0);
        const weekend = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 18, 0, 0);
        return [
            { label: "In 1 Hour", date: in1h },
            { label: tonight > now ? "Tonight 7:00 PM" : "Tomorrow 7:00 PM", date: tonight > now ? tonight : new Date(tonight.getTime() + 86400000) },
            { label: "Tomorrow 10:00 AM", date: tmrMorning },
            { label: moment(weekend).format("ddd, MMM D · 6 PM"), date: weekend },
        ];
    }, [visible]);

    const handleSubmit = () => {
        const chosen = TIME_SLOTS[slotIdx] || TIME_SLOTS[0];
        hapticTap("celebration");
        onCreate({
            id: `evt_${Date.now()}`,
            title: title.trim() || "Bubbly Hangout",
            emoji,
            whenIso: chosen.date.toISOString(),
            whenLabel: chosen.label,
            location: location.trim() || undefined,
            note: note.trim() || undefined,
        });
        setTitle("");
        setLocation("");
        setNote("");
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={modalStyles.overlay}>
                    <TouchableWithoutFeedback>
                        <KeyboardAvoidingView
                            behavior="padding"
                            style={[modalStyles.sheet, { paddingBottom: Math.max(insets.bottom, spacingY._20) + spacingY._8 }]}
                        >
                            <View style={modalStyles.handle} />
                            <View style={modalStyles.header}>
                                <Typo size={17} fontWeight="800" color={colors.neutral900}>📅 Share Event Invite</Typo>
                                <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
                                    <Icons.X size={16} color={colors.neutral600} weight="bold" />
                                </TouchableOpacity>
                            </View>
                            <ScrollView contentContainerStyle={modalStyles.body} keyboardShouldPersistTaps="handled">
                                <View style={{ flexDirection: "row", gap: 8 }}>
                                    {["📅", "☕", "🍕", "🎬", "📞", "🎉"].map((e) => (
                                        <TouchableOpacity
                                            key={e}
                                            onPress={() => { hapticTap("light"); setEmoji(e); }}
                                            style={[modalStyles.emojiBtn, emoji === e && modalStyles.emojiBtnActive]}
                                        >
                                            <Typo size={19}>{e}</Typo>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                <TextInput
                                    style={modalStyles.input}
                                    placeholder="Event title (e.g. Coffee Catch-up, Sync Call)"
                                    placeholderTextColor={colors.neutral400}
                                    value={title}
                                    onChangeText={setTitle}
                                    maxLength={70}
                                />
                                <Typo size={12} fontWeight="700" color={colors.neutral600} style={{ marginTop: 6 }}>When</Typo>
                                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                                    {TIME_SLOTS.map((s, idx) => {
                                        const active = slotIdx === idx;
                                        return (
                                            <TouchableOpacity
                                                key={s.label}
                                                onPress={() => { hapticTap("light"); setSlotIdx(idx); }}
                                                style={[
                                                    modalStyles.emojiStatPill,
                                                    active && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
                                                ]}
                                            >
                                                <Typo size={12} fontWeight={active ? "800" : "600"} color={active ? colors.primaryDark : colors.neutral700}>
                                                    {s.label}
                                                </Typo>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                                <TextInput
                                    style={modalStyles.input}
                                    placeholder="Location or meeting link (optional)"
                                    placeholderTextColor={colors.neutral400}
                                    value={location}
                                    onChangeText={setLocation}
                                    maxLength={80}
                                />
                                <TextInput
                                    style={modalStyles.input}
                                    placeholder="Short note (optional)"
                                    placeholderTextColor={colors.neutral400}
                                    value={note}
                                    onChangeText={setNote}
                                    maxLength={120}
                                />
                                <TouchableOpacity style={modalStyles.primaryBtn} onPress={handleSubmit} activeOpacity={0.8}>
                                    <Typo size={15} fontWeight="800" color={colors.black}>Send Event Card</Typo>
                                </TouchableOpacity>
                            </ScrollView>
                        </KeyboardAvoidingView>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

// ── 13. Would You Rather / This or That Modal ─────────────────────────────────
const WYR_PRESETS = [
    { optionA: "Coffee forever ☕", optionB: "Tea forever 🍵" },
    { optionA: "Night owl 🌙", optionB: "Early bird ☀️" },
    { optionA: "Beach vacation 🏖️", optionB: "Mountain cabin 🏔️" },
    { optionA: "Pizza tonight 🍕", optionB: "Tacos tonight 🌮" },
];

export const WouldYouRatherModal = ({
    visible,
    onCreate,
    onClose,
}: {
    visible: boolean;
    onCreate: (wyr: BubblyWyrPayload) => void;
    onClose: () => void;
}) => {
    const insets = useSafeAreaInsets();
    const [optA, setOptA] = useState("");
    const [optB, setOptB] = useState("");

    const sendCard = (a: string, b: string) => {
        hapticTap("celebration");
        onCreate({
            id: `wyr_${Date.now()}`,
            optionA: a.trim(),
            optionB: b.trim(),
        });
        setOptA("");
        setOptB("");
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={modalStyles.overlay}>
                    <TouchableWithoutFeedback>
                        <KeyboardAvoidingView
                            behavior="padding"
                            style={[modalStyles.sheet, { paddingBottom: Math.max(insets.bottom, spacingY._20) + spacingY._8 }]}
                        >
                            <View style={modalStyles.handle} />
                            <View style={modalStyles.header}>
                                <Typo size={17} fontWeight="800" color={colors.neutral900}>⚖️ This or That</Typo>
                                <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
                                    <Icons.X size={16} color={colors.neutral600} weight="bold" />
                                </TouchableOpacity>
                            </View>
                            <ScrollView contentContainerStyle={modalStyles.body} keyboardShouldPersistTaps="handled">
                                <Typo size={12} fontWeight="700" color={colors.neutral500}>Quick Icebreakers</Typo>
                                {WYR_PRESETS.map((p) => (
                                    <TouchableOpacity
                                        key={p.optionA}
                                        style={modalStyles.tplCard}
                                        onPress={() => sendCard(p.optionA, p.optionB)}
                                        activeOpacity={0.75}
                                    >
                                        <Typo size={13} fontWeight="700" color={colors.neutral900} style={{ flex: 1 }}>
                                            {p.optionA}  vs  {p.optionB}
                                        </Typo>
                                        <Icons.PaperPlaneTilt size={15} color={colors.primaryDark} weight="fill" />
                                    </TouchableOpacity>
                                ))}
                                <Typo size={12} fontWeight="700" color={colors.neutral500} style={{ marginTop: 8 }}>Or Create Custom</Typo>
                                <TextInput
                                    style={modalStyles.input}
                                    placeholder="Option A..."
                                    placeholderTextColor={colors.neutral400}
                                    value={optA}
                                    onChangeText={setOptA}
                                    maxLength={60}
                                />
                                <TextInput
                                    style={modalStyles.input}
                                    placeholder="Option B..."
                                    placeholderTextColor={colors.neutral400}
                                    value={optB}
                                    onChangeText={setOptB}
                                    maxLength={60}
                                />
                                <TouchableOpacity
                                    style={[modalStyles.primaryBtn, (!optA.trim() || !optB.trim()) && { opacity: 0.45 }]}
                                    disabled={!optA.trim() || !optB.trim()}
                                    onPress={() => sendCard(optA, optB)}
                                >
                                    <Typo size={15} fontWeight="800" color={colors.black}>Send This or That</Typo>
                                </TouchableOpacity>
                            </ScrollView>
                        </KeyboardAvoidingView>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

// ── 14. Fancy Unicode Font Styler Modal ───────────────────────────────────────
function toUnicodeRange(text: string, upperStart: number, lowerStart: number, digitStart?: number): string {
    return Array.from(text)
        .map((ch) => {
            const code = ch.charCodeAt(0);
            if (code >= 65 && code <= 90) return String.fromCodePoint(upperStart + (code - 65));
            if (code >= 97 && code <= 122) return String.fromCodePoint(lowerStart + (code - 97));
            if (digitStart !== undefined && code >= 48 && code <= 57) return String.fromCodePoint(digitStart + (code - 48));
            return ch;
        })
        .join("");
}

const FANCY_TRANSFORMS: { id: string; label: string; transform: (s: string) => string }[] = [
    { id: "bold", label: "𝐒𝐞𝐫𝐢𝐟 𝐁𝐨𝐥𝐝", transform: (s) => toUnicodeRange(s, 0x1d400, 0x1d41a, 0x1d7ce) },
    { id: "italic", label: "𝑆𝑒𝑟𝑖𝑓 𝐼𝑡𝑎𝑙𝑖𝑐", transform: (s) => toUnicodeRange(s, 0x1d434, 0x1d44e) },
    { id: "mono", label: "𝙼𝚘𝚗𝚘𝚜𝚙𝚊𝚌𝚎", transform: (s) => toUnicodeRange(s, 0x1d670, 0x1d68a, 0x1d7f6) },
    { id: "bubble", label: "Ⓑⓤⓑⓑⓛⓔ", transform: (s) => toUnicodeRange(s, 0x24b6, 0x24d0) },
    { id: "spaced", label: "Ｓｐａｃｅｄ", transform: (s) => s.split("").join(" ") },
];

export const FancyTextModal = ({
    visible,
    initialText,
    onApply,
    onClose,
}: {
    visible: boolean;
    initialText: string;
    onApply: (styledText: string) => void;
    onClose: () => void;
}) => {
    const insets = useSafeAreaInsets();
    const [text, setText] = useState(initialText || "");

    useEffect(() => {
        if (visible) setText(initialText || "Hello Bubbly");
    }, [visible, initialText]);

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={modalStyles.overlay}>
                    <TouchableWithoutFeedback>
                        <KeyboardAvoidingView
                            behavior="padding"
                            style={[modalStyles.sheet, { paddingBottom: Math.max(insets.bottom, spacingY._20) + spacingY._8 }]}
                        >
                            <View style={modalStyles.handle} />
                            <View style={modalStyles.header}>
                                <Typo size={17} fontWeight="800" color={colors.neutral900}>✨ Fancy Text Styler</Typo>
                                <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
                                    <Icons.X size={16} color={colors.neutral600} weight="bold" />
                                </TouchableOpacity>
                            </View>
                            <ScrollView contentContainerStyle={modalStyles.body} keyboardShouldPersistTaps="handled">
                                <TextInput
                                    style={modalStyles.input}
                                    placeholder="Type text to stylize..."
                                    placeholderTextColor={colors.neutral400}
                                    value={text}
                                    onChangeText={setText}
                                    maxLength={180}
                                />
                                {FANCY_TRANSFORMS.map((f) => {
                                    const preview = f.transform(text || "Hello Bubbly");
                                    return (
                                        <TouchableOpacity
                                            key={f.id}
                                            style={modalStyles.tplCard}
                                            activeOpacity={0.75}
                                            onPress={() => {
                                                hapticTap("success");
                                                onApply(preview);
                                            }}
                                        >
                                            <View style={{ flex: 1, minWidth: 0 }}>
                                                <Typo size={10.5} fontWeight="700" color={colors.primaryDark}>{f.label}</Typo>
                                                <Typo size={14} color={colors.neutral900} textProps={{ numberOfLines: 2 }}>{preview}</Typo>
                                            </View>
                                            <Icons.Check size={16} color={colors.primaryDark} weight="bold" />
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </KeyboardAvoidingView>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};
export const QuickJumpModal = ({
    visible,
    conversations,
    currentUserId,
    nicknames,
    onlineUsers = {},
    focusActive,
    onToggleFocus,
    onSelectConversation,
    onNavigateRoute,
    onClose,
}: {
    visible: boolean;
    conversations: ConversationProps[];
    currentUserId?: string;
    nicknames: Record<string, string>;
    onlineUsers?: Record<string, boolean>;
    focusActive: boolean;
    onToggleFocus: () => void;
    onSelectConversation: (conv: ConversationProps) => void;
    onNavigateRoute: (route: string) => void;
    onClose: () => void;
}) => {
    const insets = useSafeAreaInsets();
    const { height: windowHeight } = useWindowDimensions();
    const [q, setQ] = useState("");

    const QUICK_ACTIONS = [
        { id: "focus", label: focusActive ? "Turn Off Focus Mode" : "Enable Focus / Quiet Mode", route: "__focus__", icon: "🌙" },
        { id: "vault", label: "Secret Chat Vault", route: "/(main)/vault", icon: "🔐" },
        { id: "qr", label: "My QR Code & Scanner", route: "/(main)/qrCode", icon: "📷" },
        { id: "starred", label: "Starred Messages", route: "/(main)/starredMessages", icon: "⭐" },
        { id: "calls", label: "Call History & Logs", route: "/(main)/callLogs", icon: "📞" },
        { id: "storage", label: "Storage & Data Manager", route: "/(main)/storageManager", icon: "💾" },
        { id: "settings", label: "App Settings & Privacy", route: "/(main)/settings", icon: "⚙️" },
    ].filter((a) => !q.trim() || a.label.toLowerCase().includes(q.toLowerCase()));

    const matchedChats = conversations
        .filter((c) => {
            if (!q.trim()) return true;
            const other = c.type === "direct" ? c.participants?.find((p) => p._id !== currentUserId) : null;
            const rawName = (c.type === "group" ? c.name : other?.name) || "";
            const nick = nicknames[c._id] || (other?._id ? nicknames[other._id] : "") || "";
            return (
                rawName.toLowerCase().includes(q.toLowerCase()) ||
                nick.toLowerCase().includes(q.toLowerCase())
            );
        })
        .slice(0, 8);

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={modalStyles.overlayCenter}>
                    <KeyboardAvoidingView
                        behavior="padding"
                        style={{ width: "100%" }}
                    >
                        <TouchableWithoutFeedback>
                            <View style={[modalStyles.centerCard, { marginTop: insets.top + verticalScale(24) }]}>
                                <View style={modalStyles.commandSearchRow}>
                                    <Icons.MagnifyingGlass size={18} color={colors.primaryDark} weight="bold" />
                                    <TextInput
                                        style={modalStyles.commandInput}
                                        placeholder="Quick Jump to chat, tool, or setting..."
                                        placeholderTextColor={colors.neutral400}
                                        value={q}
                                        onChangeText={setQ}
                                        autoFocus
                                    />
                                    <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
                                        <Icons.X size={15} color={colors.neutral600} weight="bold" />
                                    </TouchableOpacity>
                                </View>

                                <ScrollView style={{ maxHeight: Math.min(verticalScale(340), Math.round(windowHeight * 0.45)) }} keyboardShouldPersistTaps="handled">
                                    <Typo size={11} fontWeight="800" color={colors.neutral400} style={{ paddingHorizontal: 16, paddingTop: 10 }}>
                                        QUICK ACTIONS
                                    </Typo>
                                    {QUICK_ACTIONS.map((act) => (
                                        <TouchableOpacity
                                            key={act.id}
                                            style={modalStyles.commandRow}
                                            onPress={() => {
                                                hapticTap("medium");
                                                onClose();
                                                setQ("");
                                                if (act.route === "__focus__") onToggleFocus();
                                                else onNavigateRoute(act.route);
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <Typo size={16}>{act.icon}</Typo>
                                            <Typo size={14} fontWeight="600" color={colors.neutral900} style={{ flex: 1 }}>
                                                {act.label}
                                            </Typo>
                                            <Icons.CaretRight size={14} color={colors.neutral400} />
                                        </TouchableOpacity>
                                    ))}

                                    {matchedChats.length > 0 && (
                                        <>
                                            <Typo size={11} fontWeight="800" color={colors.neutral400} style={{ paddingHorizontal: 16, paddingTop: 12 }}>
                                                CONVERSATIONS
                                            </Typo>
                                            {matchedChats.map((c) => {
                                                const other = c.type === "direct" ? c.participants?.find((p) => p._id !== currentUserId) : null;
                                                const baseName = (c.type === "group" ? c.name : other?.name) || "Chat";
                                                const display = nicknames[c._id] || (other?._id ? nicknames[other._id] : "") || baseName;
                                                const av = c.type === "direct" ? other?.avatar || c.avatar : c.avatar;
                                                const isOnline = other?._id ? !!onlineUsers[other._id] : false;
                                                const unread = c.unreadCount || 0;
                                                return (
                                                    <TouchableOpacity
                                                        key={c._id}
                                                        style={modalStyles.commandRow}
                                                        onPress={() => {
                                                            hapticTap("medium");
                                                            setQ("");
                                                            onClose();
                                                            onSelectConversation(c);
                                                        }}
                                                        activeOpacity={0.7}
                                                    >
                                                        <View style={{ position: "relative" }}>
                                                            <Avatar size={30} uri={av} isGroup={c.type === "group"} />
                                                            {isOnline && (
                                                                <View style={{
                                                                    position: "absolute", bottom: -1, right: -1,
                                                                    width: 9, height: 9, borderRadius: 5,
                                                                    backgroundColor: colors.green, borderWidth: 1.5, borderColor: colors.white,
                                                                }} />
                                                            )}
                                                        </View>
                                                        <Typo size={14} fontWeight="600" color={colors.neutral900} style={{ flex: 1 }} textProps={{ numberOfLines: 1 }}>
                                                            {display}
                                                        </Typo>
                                                        {(c as any).isArchived && (
                                                            <View style={{ backgroundColor: colors.neutral100, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.full }}>
                                                                <Typo size={9.5} fontWeight="700" color={colors.neutral500}>Archived</Typo>
                                                            </View>
                                                        )}
                                                        {unread > 0 && (
                                                            <View style={{ backgroundColor: colors.primary, minWidth: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 }}>
                                                                <Typo size={10} fontWeight="800" color={colors.black}>{unread > 99 ? "99+" : unread}</Typo>
                                                            </View>
                                                        )}
                                                        <Icons.ArrowUpRight size={14} color={colors.neutral400} />
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </>
                                    )}
                                </ScrollView>
                            </View>
                        </TouchableWithoutFeedback>
                    </KeyboardAvoidingView>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

// ── 7. Message Reminders Drawer Modal ─────────────────────────────────────────
export const RemindersListModal = ({
    visible,
    reminders,
    onCancelReminder,
    onPressReminder,
    onClose,
}: {
    visible: boolean;
    reminders: SavedMessageReminder[];
    onCancelReminder: (id: string) => void;
    onPressReminder?: (reminder: SavedMessageReminder) => void;
    onClose: () => void;
}) => {
    const insets = useSafeAreaInsets();
    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={modalStyles.overlay}>
                    <TouchableWithoutFeedback>
                        <View style={[modalStyles.sheet, { paddingBottom: Math.max(insets.bottom, spacingY._20) + spacingY._8, maxHeight: "75%" }]}>
                            <View style={modalStyles.handle} />
                            <View style={modalStyles.header}>
                                <Typo size={17} fontWeight="800" color={colors.neutral900}>⏰ Message Reminders ({reminders.length})</Typo>
                                <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
                                    <Icons.X size={16} color={colors.neutral600} weight="bold" />
                                </TouchableOpacity>
                            </View>
                            <FlatList
                                data={reminders}
                                keyExtractor={(r) => r.id}
                                contentContainerStyle={modalStyles.body}
                                ListEmptyComponent={
                                    <View style={{ paddingVertical: 28, alignItems: "center" }}>
                                        <Typo size={13.5} color={colors.neutral400}>
                                            Long-press any message in a chat and tap "Remind Me" to set an alarm.
                                        </Typo>
                                    </View>
                                }
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={modalStyles.tplCard}
                                        activeOpacity={onPressReminder ? 0.72 : 1}
                                        onPress={() => onPressReminder?.(item)}
                                    >
                                        <View style={{ flex: 1, minWidth: 0 }}>
                                            <Typo size={12} fontWeight="800" color={colors.primaryDark}>
                                                {item.senderName} · {moment(item.remindAt).calendar()}
                                            </Typo>
                                            <Typo size={13} color={colors.neutral800} textProps={{ numberOfLines: 2 }}>
                                                {item.preview}
                                            </Typo>
                                        </View>
                                        <TouchableOpacity onPress={() => onCancelReminder(item.id)} style={modalStyles.removeBtn}>
                                            <Icons.Trash size={14} color={colors.rose} weight="bold" />
                                        </TouchableOpacity>
                                    </TouchableOpacity>
                                )}
                            />
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

// ── 8. Split Bill Creator Modal ───────────────────────────────────────────────
export const SplitBillModal = ({
    visible,
    defaultParticipants,
    currentUserName,
    onCreate,
    onClose,
}: {
    visible: boolean;
    defaultParticipants: string[];
    currentUserName?: string;
    onCreate: (split: BubblySplitPayload) => void;
    onClose: () => void;
}) => {
    const insets = useSafeAreaInsets();
    const [title, setTitle] = useState("");
    const [amountStr, setAmountStr] = useState("");
    const [currency, setCurrency] = useState<"$" | "₹" | "€" | "£">("$");
    const [members, setMembers] = useState<string[]>([]);
    const [newMember, setNewMember] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        if (visible) {
            const initial = Array.from(
                new Set(
                    [currentUserName || "You", ...defaultParticipants]
                        .map((s) => (s || "").trim())
                        .filter(Boolean)
                )
            ).slice(0, 8);
            setMembers(initial.length >= 2 ? initial : [currentUserName || "You", "Friend"]);
            setError("");
        }
    }, [visible, defaultParticipants, currentUserName]);

    const parsedAmount = parseFloat(amountStr.replace(/[^0-9.]/g, "")) || 0;
    const perPerson = members.length > 0 ? parsedAmount / members.length : 0;

    const handleAddMember = () => {
        const clean = newMember.trim().slice(0, 24);
        if (!clean) return;
        hapticTap("light");
        setMembers((prev) => Array.from(new Set([...prev, clean])).slice(0, 10));
        setNewMember("");
    };

    const handleSubmit = () => {
        if (parsedAmount <= 0) {
            hapticTap("error");
            setError("Enter a valid bill amount greater than 0");
            return;
        }
        if (members.length < 2) {
            hapticTap("error");
            setError("Add at least 2 people to split with");
            return;
        }
        hapticTap("success");
        onCreate({
            id: `split_${Date.now()}`,
            title: title.trim() || "Shared Expense",
            currency,
            totalAmount: Number(parsedAmount.toFixed(2)),
            participants: members.map((name, idx) => ({
                id: `p_${idx}_${name.toLowerCase().replace(/\W+/g, "")}`,
                name,
                paid: idx === 0, // creator defaults to paid their own share
            })),
            createdBy: currentUserName || "You",
        });
        setTitle("");
        setAmountStr("");
        setError("");
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={modalStyles.overlay}>
                    <TouchableWithoutFeedback>
                        <KeyboardAvoidingView
                            behavior="padding"
                            style={[modalStyles.sheet, { paddingBottom: Math.max(insets.bottom, spacingY._20) + spacingY._8 }]}
                        >
                            <View style={modalStyles.handle} />
                            <View style={modalStyles.header}>
                                <Typo size={17} fontWeight="800" color={colors.neutral900}>💸 Split Bill</Typo>
                                <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
                                    <Icons.X size={16} color={colors.neutral600} weight="bold" />
                                </TouchableOpacity>
                            </View>
                            <ScrollView contentContainerStyle={modalStyles.body} keyboardShouldPersistTaps="handled">
                                <Typo size={12} fontWeight="700" color={colors.neutral600}>Expense Title</Typo>
                                <TextInput
                                    style={modalStyles.input}
                                    placeholder="e.g. Dinner, Cab Ride, Movie Tickets"
                                    placeholderTextColor={colors.neutral400}
                                    value={title}
                                    onChangeText={(v) => { setTitle(v); setError(""); }}
                                    maxLength={60}
                                />

                                <View style={{ flexDirection: "row", gap: 8, alignItems: "center", marginTop: 6 }}>
                                    {(["$", "₹", "€", "£"] as const).map((c) => {
                                        const active = currency === c;
                                        return (
                                            <TouchableOpacity
                                                key={c}
                                                onPress={() => { hapticTap("light"); setCurrency(c); }}
                                                style={[modalStyles.emojiBtn, active && modalStyles.emojiBtnActive]}
                                            >
                                                <Typo size={16} fontWeight="800" color={active ? colors.primaryDark : colors.neutral700}>{c}</Typo>
                                            </TouchableOpacity>
                                        );
                                    })}
                                    <TextInput
                                        style={[modalStyles.input, { flex: 1, marginTop: 0 }]}
                                        placeholder="Total amount (e.g. 48.50)"
                                        placeholderTextColor={colors.neutral400}
                                        value={amountStr}
                                        onChangeText={(v) => { setAmountStr(v); setError(""); }}
                                        keyboardType="decimal-pad"
                                        maxLength={12}
                                    />
                                </View>

                                <Typo size={12} fontWeight="700" color={colors.neutral600} style={{ marginTop: 8 }}>
                                    Participants ({members.length}) {parsedAmount > 0 && members.length > 0 ? `· ${currency}${perPerson.toFixed(2)} each` : ""}
                                </Typo>
                                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                                    {members.map((m, idx) => (
                                        <TouchableOpacity
                                            key={`${m}_${idx}`}
                                            onPress={() => {
                                                if (members.length <= 2) return;
                                                hapticTap("light");
                                                setMembers(members.filter((_, i) => i !== idx));
                                            }}
                                            style={modalStyles.emojiStatPill}
                                        >
                                            <Typo size={12.5} fontWeight="700" color={colors.neutral800}>{m}</Typo>
                                            {members.length > 2 && <Icons.X size={11} color={colors.neutral400} weight="bold" />}
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <View style={modalStyles.itemRow}>
                                    <TextInput
                                        style={[modalStyles.input, { flex: 1, marginTop: 0 }]}
                                        placeholder="Add person name..."
                                        placeholderTextColor={colors.neutral400}
                                        value={newMember}
                                        onChangeText={setNewMember}
                                        onSubmitEditing={handleAddMember}
                                        maxLength={24}
                                    />
                                    <TouchableOpacity
                                        onPress={handleAddMember}
                                        style={[modalStyles.addBtn, { marginTop: 0, paddingHorizontal: 14 }]}
                                    >
                                        <Icons.Plus size={15} color={colors.primaryDark} weight="bold" />
                                    </TouchableOpacity>
                                </View>

                                {!!error && <Typo size={12} color={colors.rose} fontWeight="600">{error}</Typo>}

                                <TouchableOpacity style={modalStyles.primaryBtn} onPress={handleSubmit} activeOpacity={0.8}>
                                    <Typo size={15} fontWeight="800" color={colors.black}>Send Split Bill Card</Typo>
                                </TouchableOpacity>
                            </ScrollView>
                        </KeyboardAvoidingView>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

// ── 9. Finger-Drawing Sketch / Doodle Pad Modal ───────────────────────────────
const DOODLE_COLORS = ["#f59e0b", "#ef4444", "#10b981", "#0284c7", "#8b5cf6", "#1c1917"];

export const DoodlePadModal = ({
    visible,
    onSend,
    onClose,
}: {
    visible: boolean;
    onSend: (payload: BubblyDoodlePayload) => void;
    onClose: () => void;
}) => {
    const insets = useSafeAreaInsets();
    const [strokes, setStrokes] = useState<BubblyDoodleStroke[]>([]);
    const [activePath, setActivePath] = useState<string>("");
    const [inkColor, setInkColor] = useState<string>(DOODLE_COLORS[0]);
    const [strokeWidth, setStrokeWidth] = useState<number>(4);
    const [darkBg, setDarkBg] = useState<boolean>(false);
    const [caption, setCaption] = useState<string>("");
    const [canvasLayout, setCanvasLayout] = useState({ width: 260, height: 170 });

    const currentPointsRef = useRef<{ x: number; y: number }[]>([]);
    const inkRef = useRef(inkColor);
    inkRef.current = inkColor;
    const widthRef = useRef(strokeWidth);
    widthRef.current = strokeWidth;
    const layoutRef = useRef(canvasLayout);
    layoutRef.current = canvasLayout;

    const toViewBox = (lx: number, ly: number) => {
        const w = Math.max(1, layoutRef.current.width);
        const h = Math.max(1, layoutRef.current.height);
        const vx = Math.round(Math.max(0, Math.min(260, (lx / w) * 260)));
        const vy = Math.round(Math.max(0, Math.min(170, (ly / h) * 170)));
        return { x: vx, y: vy };
    };

    const buildPath = (pts: { x: number; y: number }[]) => {
        if (pts.length === 0) return "";
        if (pts.length === 1) return `M${pts[0].x} ${pts[0].y} L${pts[0].x + 1} ${pts[0].y}`;
        return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" ");
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt) => {
                const { locationX, locationY } = evt.nativeEvent;
                const pt = toViewBox(locationX, locationY);
                currentPointsRef.current = [pt];
                setActivePath(buildPath([pt]));
            },
            onPanResponderMove: (evt) => {
                const { locationX, locationY } = evt.nativeEvent;
                const pt = toViewBox(locationX, locationY);
                const pts = currentPointsRef.current;
                const last = pts[pts.length - 1];
                if (!last || Math.abs(pt.x - last.x) + Math.abs(pt.y - last.y) >= 4) {
                    const nextPts = [...pts, pt];
                    currentPointsRef.current = nextPts;
                    setActivePath(buildPath(nextPts));
                }
            },
            onPanResponderRelease: () => {
                const d = buildPath(currentPointsRef.current);
                if (d) {
                    setStrokes((prev) => [
                        ...prev.slice(-24),
                        { d, color: inkRef.current, width: widthRef.current },
                    ]);
                }
                currentPointsRef.current = [];
                setActivePath("");
            },
            onPanResponderTerminate: () => {
                currentPointsRef.current = [];
                setActivePath("");
            },
        })
    ).current;

    const handleSend = () => {
        if (strokes.length === 0) {
            hapticTap("error");
            return;
        }
        hapticTap("celebration");
        onSend({ strokes, darkBg, caption: caption.trim() || undefined });
        setStrokes([]);
        setCaption("");
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={modalStyles.overlay}>
                    <TouchableWithoutFeedback>
                        <KeyboardAvoidingView
                            behavior="padding"
                            style={[modalStyles.sheet, { paddingBottom: Math.max(insets.bottom, spacingY._20) + spacingY._8 }]}
                        >
                            <View style={modalStyles.handle} />
                            <View style={modalStyles.header}>
                                <Typo size={17} fontWeight="800" color={colors.neutral900}>🎨 Sketch & Doodle Pad</Typo>
                                <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
                                    <Icons.X size={16} color={colors.neutral600} weight="bold" />
                                </TouchableOpacity>
                            </View>
                            <View style={modalStyles.body}>
                                <View
                                    onLayout={(e) => {
                                        const { width, height } = e.nativeEvent.layout;
                                        if (width > 0 && height > 0) setCanvasLayout({ width, height });
                                    }}
                                    {...panResponder.panHandlers}
                                    style={{
                                        width: "100%",
                                        height: verticalScale(200),
                                        borderRadius: radius._20,
                                        backgroundColor: darkBg ? "#1c1917" : "#fffdf7",
                                        borderWidth: 1.5,
                                        borderColor: colors.neutral200,
                                        overflow: "hidden",
                                    }}
                                >
                                    <Svg width="100%" height="100%" viewBox="0 0 260 170">
                                        {strokes.map((s, idx) => (
                                            <Path
                                                key={idx}
                                                d={s.d}
                                                stroke={s.color}
                                                strokeWidth={s.width}
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                fill="none"
                                            />
                                        ))}
                                        {!!activePath && (
                                            <Path
                                                d={activePath}
                                                stroke={inkColor}
                                                strokeWidth={strokeWidth}
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                fill="none"
                                            />
                                        )}
                                    </Svg>
                                </View>

                                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
                                    <View style={{ flexDirection: "row", gap: 6 }}>
                                        {DOODLE_COLORS.map((c) => {
                                            const active = inkColor === c;
                                            return (
                                                <TouchableOpacity
                                                    key={c}
                                                    onPress={() => { hapticTap("light"); setInkColor(c); }}
                                                    style={{
                                                        width: scale(26),
                                                        height: scale(26),
                                                        borderRadius: radius.full,
                                                        backgroundColor: c,
                                                        borderWidth: active ? 2.5 : 1,
                                                        borderColor: active ? colors.neutral900 : colors.neutral200,
                                                    }}
                                                />
                                            );
                                        })}
                                    </View>
                                    <View style={{ flexDirection: "row", gap: 6 }}>
                                        <TouchableOpacity
                                            onPress={() => {
                                                hapticTap("light");
                                                setDarkBg((p) => !p);
                                                if (!darkBg && inkColor === "#1c1917") setInkColor("#ffffff");
                                            }}
                                            style={modalStyles.closeBtn}
                                        >
                                            <Icons.Moon size={14} color={darkBg ? colors.primaryDark : colors.neutral600} weight="fill" />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => { hapticTap("light"); setStrokes((p) => p.slice(0, -1)); }}
                                            style={modalStyles.closeBtn}
                                        >
                                            <Icons.ArrowCounterClockwise size={14} color={colors.neutral700} weight="bold" />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => { hapticTap("warning"); setStrokes([]); }}
                                            style={modalStyles.removeBtn}
                                        >
                                            <Icons.Trash size={14} color={colors.rose} weight="bold" />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>
                                    {[
                                        { label: "Thin", w: 2.5 },
                                        { label: "Medium", w: 4.5 },
                                        { label: "Bold", w: 7.5 },
                                    ].map((sz) => (
                                        <TouchableOpacity
                                            key={sz.label}
                                            onPress={() => { hapticTap("light"); setStrokeWidth(sz.w); }}
                                            style={[
                                                modalStyles.emojiStatPill,
                                                strokeWidth === sz.w && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
                                            ]}
                                        >
                                            <Typo size={11.5} fontWeight="700" color={strokeWidth === sz.w ? colors.primaryDark : colors.neutral700}>
                                                {sz.label}
                                            </Typo>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <TextInput
                                    style={modalStyles.input}
                                    placeholder="Optional sketch caption..."
                                    placeholderTextColor={colors.neutral400}
                                    value={caption}
                                    onChangeText={setCaption}
                                    maxLength={60}
                                />

                                <TouchableOpacity
                                    style={[modalStyles.primaryBtn, strokes.length === 0 && { opacity: 0.45 }]}
                                    onPress={handleSend}
                                    disabled={strokes.length === 0}
                                    activeOpacity={0.8}
                                >
                                    <Typo size={15} fontWeight="800" color={colors.black}>Send Sketch</Typo>
                                </TouchableOpacity>
                            </View>
                        </KeyboardAvoidingView>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

// ── 10. Per-Conversation Private Scratchpad Modal ─────────────────────────────
export const ChatScratchpadModal = ({
    visible,
    conversationId,
    chatName,
    onClose,
}: {
    visible: boolean;
    conversationId: string;
    chatName: string;
    onClose: () => void;
}) => {
    const insets = useSafeAreaInsets();
    const [note, setNote] = useState("");
    const [savedHint, setSavedHint] = useState(false);

    useEffect(() => {
        if (visible && conversationId) {
            getChatScratchpad(conversationId).then(setNote);
            setSavedHint(false);
        }
    }, [visible, conversationId]);

    const handleSave = async () => {
        await saveChatScratchpad(conversationId, note);
        hapticTap("success");
        setSavedHint(true);
        setTimeout(() => setSavedHint(false), 1800);
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={modalStyles.overlay}>
                    <TouchableWithoutFeedback>
                        <KeyboardAvoidingView
                            behavior="padding"
                            style={[modalStyles.sheet, { paddingBottom: Math.max(insets.bottom, spacingY._20) + spacingY._8 }]}
                        >
                            <View style={modalStyles.handle} />
                            <View style={modalStyles.header}>
                                <View style={{ flex: 1, minWidth: 0 }}>
                                    <Typo size={17} fontWeight="800" color={colors.neutral900} textProps={{ numberOfLines: 1 }}>
                                        📝 Private Scratchpad
                                    </Typo>
                                    <Typo size={11.5} color={colors.neutral500} textProps={{ numberOfLines: 1 }}>
                                        Only visible to you · {chatName}
                                    </Typo>
                                </View>
                                <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
                                    <Icons.X size={16} color={colors.neutral600} weight="bold" />
                                </TouchableOpacity>
                            </View>
                            <View style={modalStyles.body}>
                                <TextInput
                                    style={[modalStyles.input, { minHeight: verticalScale(150), textAlignVertical: "top" }]}
                                    placeholder="Jot down action items, dates, links, or gift ideas for this chat..."
                                    placeholderTextColor={colors.neutral400}
                                    value={note}
                                    onChangeText={setNote}
                                    multiline
                                    maxLength={4000}
                                />
                                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                                    <Typo size={11} color={savedHint ? "#16a34a" : colors.neutral400} fontWeight="600">
                                        {savedHint ? "✓ Saved privately on device" : `${note.length}/4000 characters`}
                                    </Typo>
                                    <View style={{ flexDirection: "row", gap: 8 }}>
                                        <TouchableOpacity
                                            onPress={async () => {
                                                if (!note.trim()) return;
                                                await Clipboard.setStringAsync(note).catch(() => {});
                                                hapticTap("medium");
                                            }}
                                            style={modalStyles.emojiStatPill}
                                        >
                                            <Icons.Copy size={13} color={colors.neutral700} weight="bold" />
                                            <Typo size={11.5} fontWeight="700" color={colors.neutral700}>Copy</Typo>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={async () => {
                                                hapticTap("warning");
                                                setNote("");
                                                await saveChatScratchpad(conversationId, "");
                                            }}
                                            style={[modalStyles.emojiStatPill, { borderColor: "#fecaca", backgroundColor: "#fef2f2" }]}
                                        >
                                            <Typo size={11.5} fontWeight="700" color={colors.rose}>Clear</Typo>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                <TouchableOpacity style={modalStyles.primaryBtn} onPress={handleSave} activeOpacity={0.8}>
                                    <Typo size={15} fontWeight="800" color={colors.black}>Save Scratchpad</Typo>
                                </TouchableOpacity>
                            </View>
                        </KeyboardAvoidingView>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

// ── 11. Daily Activity Digest Modal (Home) ────────────────────────────────────
export const DailyDigestModal = ({
    visible,
    activity,
    unreadDirect,
    unreadGroups,
    unreadConversations,
    currentUserId,
    nicknames,
    onSelectConversation,
    onClose,
}: {
    visible: boolean;
    activity: DailyActivityStats;
    unreadDirect: number;
    unreadGroups: number;
    unreadConversations: ConversationProps[];
    currentUserId?: string;
    nicknames: Record<string, string>;
    onSelectConversation: (c: ConversationProps) => void;
    onClose: () => void;
}) => {
    const insets = useSafeAreaInsets();
    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={modalStyles.overlay}>
                    <TouchableWithoutFeedback>
                        <View style={[modalStyles.sheet, { paddingBottom: Math.max(insets.bottom, spacingY._20) + spacingY._8, maxHeight: "82%" }]}>
                            <View style={modalStyles.handle} />
                            <View style={modalStyles.header}>
                                <View>
                                    <Typo size={17} fontWeight="800" color={colors.neutral900}>🔥 Today on Bubbly</Typo>
                                    <Typo size={11.5} color={colors.neutral500}>Your daily messaging pulse & unread digest</Typo>
                                </View>
                                <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
                                    <Icons.X size={16} color={colors.neutral600} weight="bold" />
                                </TouchableOpacity>
                            </View>
                            <ScrollView contentContainerStyle={modalStyles.body}>
                                <View style={modalStyles.statGrid}>
                                    {[
                                        { label: "Sent Today", val: String(activity.messagesSentToday), icon: "💬" },
                                        { label: "Chats Active", val: String(activity.activeConvIdsToday.length), icon: "⚡" },
                                        { label: "All-Time Sent", val: String(activity.totalSentAllTime), icon: "🚀" },
                                        { label: "Unread Direct", val: String(unreadDirect), icon: "📩" },
                                        { label: "Unread Groups", val: String(unreadGroups), icon: "👥" },
                                    ].map((box) => (
                                        <View key={box.label} style={[modalStyles.statTile, { flexGrow: 1, minWidth: "30%" }]}>
                                            <Typo size={18}>{box.icon}</Typo>
                                            <Typo size={15} fontWeight="800" color={colors.neutral900}>{box.val}</Typo>
                                            <Typo size={10.5} color={colors.neutral500}>{box.label}</Typo>
                                        </View>
                                    ))}
                                </View>

                                <Typo size={12} fontWeight="800" color={colors.neutral500} style={{ marginTop: 10 }}>
                                    UNREAD CONVERSATIONS ({unreadConversations.length})
                                </Typo>
                                {unreadConversations.length === 0 ? (
                                    <View style={[modalStyles.ratioCard, { alignItems: "center", paddingVertical: 18 }]}>
                                        <Typo size={13.5} fontWeight="700" color="#16a34a">🎉 Inbox Zero! All caught up.</Typo>
                                    </View>
                                ) : (
                                    unreadConversations.slice(0, 6).map((c) => {
                                        const other = c.type === "direct" ? c.participants?.find((p) => p._id !== currentUserId) : null;
                                        const baseName = (c.type === "group" ? c.name : other?.name) || "Chat";
                                        const display = nicknames[c._id] || (other?._id ? nicknames[other._id] : "") || baseName;
                                        const av = c.type === "direct" ? other?.avatar || c.avatar : c.avatar;
                                        return (
                                            <TouchableOpacity
                                                key={c._id}
                                                style={modalStyles.tplCard}
                                                onPress={() => {
                                                    hapticTap("medium");
                                                    onClose();
                                                    onSelectConversation(c);
                                                }}
                                                activeOpacity={0.75}
                                            >
                                                <Avatar size={34} uri={av} isGroup={c.type === "group"} />
                                                <View style={{ flex: 1, minWidth: 0 }}>
                                                    <Typo size={13.5} fontWeight="700" color={colors.neutral900} textProps={{ numberOfLines: 1 }}>
                                                        {display}
                                                    </Typo>
                                                    <Typo size={11.5} color={colors.neutral500} textProps={{ numberOfLines: 1 }}>
                                                        {c.unreadCount || 0} unread message{(c.unreadCount || 0) === 1 ? "" : "s"}
                                                    </Typo>
                                                </View>
                                                <Icons.CaretRight size={14} color={colors.neutral400} />
                                            </TouchableOpacity>
                                        );
                                    })
                                )}
                            </ScrollView>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const modalStyles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.48)", justifyContent: "flex-end" },
    overlayCenter: { flex: 1, backgroundColor: "rgba(0,0,0,0.52)", paddingHorizontal: spacingX._15 },
    sheet: { backgroundColor: colors.white, borderTopLeftRadius: radius._30, borderTopRightRadius: radius._30, maxHeight: "88%" },
    centerCard: { backgroundColor: colors.white, borderRadius: radius._24, overflow: "hidden", shadowColor: colors.black, shadowOpacity: 0.25, shadowRadius: 16, elevation: 12 },
    handle: { width: scale(36), height: verticalScale(4), borderRadius: radius.full, backgroundColor: colors.neutral300, alignSelf: "center", marginTop: 10 },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacingX._20, paddingVertical: spacingY._12, borderBottomWidth: 1, borderBottomColor: colors.neutral100, gap: 10 },
    closeBtn: { width: scale(30), height: scale(30), borderRadius: radius.full, backgroundColor: colors.neutral100, alignItems: "center", justifyContent: "center" },
    body: { padding: spacingX._20, gap: spacingY._8 },
    input: { backgroundColor: colors.neutral50, borderWidth: 1, borderColor: colors.neutral200, borderRadius: radius._12, paddingHorizontal: spacingX._12, paddingVertical: verticalScale(10), fontSize: verticalScale(14), color: colors.neutral900, marginTop: 6 },
    itemRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
    removeBtn: { width: scale(30), height: scale(30), borderRadius: radius.full, backgroundColor: "#fef2f2", alignItems: "center", justifyContent: "center" },
    addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: colors.primaryLight, borderRadius: radius._12, paddingVertical: verticalScale(9), marginTop: 4 },
    primaryBtn: { backgroundColor: colors.primary, borderRadius: radius.full, paddingVertical: verticalScale(12), alignItems: "center", justifyContent: "center", marginTop: 10 },
    gameGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
    gameTile: { width: "48%", backgroundColor: colors.neutral50, borderRadius: radius._15, padding: spacingY._15, alignItems: "center", gap: 4, borderWidth: 1, borderColor: colors.neutral200 },
    emojiBtn: { width: scale(40), height: scale(40), borderRadius: radius.full, backgroundColor: colors.neutral100, alignItems: "center", justifyContent: "center" },
    emojiBtnActive: { backgroundColor: colors.primaryLight, borderWidth: 1.5, borderColor: colors.primary },
    rowOption: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: verticalScale(12), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.neutral200 },
    tplCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: spacingX._12, backgroundColor: colors.neutral50, borderRadius: radius._12, borderWidth: 1, borderColor: colors.neutral200 },
    statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    statTile: { width: "31%", backgroundColor: colors.neutral50, borderRadius: radius._12, paddingVertical: verticalScale(10), paddingHorizontal: 6, alignItems: "center", gap: 3, borderWidth: 1, borderColor: colors.neutral200 },
    ratioCard: { backgroundColor: colors.neutral50, borderRadius: radius._12, padding: spacingX._12, borderWidth: 1, borderColor: colors.neutral200, marginTop: 8 },
    ratioBar: { height: verticalScale(8), backgroundColor: colors.neutral300, borderRadius: radius.full, overflow: "hidden" },
    ratioMine: { height: "100%", backgroundColor: colors.primary },
    emojiStatPill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.white, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full, borderWidth: 1, borderColor: colors.neutral200 },
    commandSearchRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: spacingX._15, paddingVertical: verticalScale(12), borderBottomWidth: 1, borderBottomColor: colors.neutral100 },
    commandInput: { flex: 1, fontSize: verticalScale(14), color: colors.neutral900, padding: 0 },
    commandRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: spacingX._15, paddingVertical: verticalScale(11), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.neutral100 },
});
