import User from "../modals/User";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_TOKEN_REGEX = /^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/;

export type CallRingtoneId =
    | "incoming_call"
    | "incoming_call_2"
    | "incoming_call_3"
    | "incoming_call_4";

export const CALL_RINGTONE_META: Record<
    CallRingtoneId,
    { ringtoneId: CallRingtoneId; channelId: string; sound: string }
> = {
    incoming_call: {
        ringtoneId: "incoming_call",
        channelId: "calls_ringtone_1",
        sound: "incoming_call.mp3",
    },
    incoming_call_2: {
        ringtoneId: "incoming_call_2",
        channelId: "calls_ringtone_2",
        sound: "incoming_call_2.mp3",
    },
    incoming_call_3: {
        ringtoneId: "incoming_call_3",
        channelId: "calls_ringtone_3",
        sound: "incoming_call_3.mp3",
    },
    incoming_call_4: {
        ringtoneId: "incoming_call_4",
        channelId: "calls_ringtone_4",
        sound: "incoming_call_4.mp3",
    },
};

export function isValidCallRingtone(ringtone: unknown): ringtone is CallRingtoneId {
    return typeof ringtone === "string" && ringtone in CALL_RINGTONE_META;
}

export function resolveCallRingtonePushConfig(ringtone?: unknown) {
    if (isValidCallRingtone(ringtone)) {
        return CALL_RINGTONE_META[ringtone];
    }
    return CALL_RINGTONE_META.incoming_call;
}

export interface ExpoPushMessage {
    to: string;
    title?: string;
    subtitle?: string;
    body: string;
    data?: Record<string, unknown>;
    sound?: string | null;
    priority?: "default" | "normal" | "high";
    channelId?: string;
    categoryId?: string;
    ttl?: number;
    badge?: number;
    mutableContent?: boolean;
    interruptionLevel?: "passive" | "active" | "time-sensitive" | "critical";
    _contentAvailable?: boolean;
}

export function isValidExpoPushToken(token: unknown): token is string {
    return typeof token === "string" && EXPO_TOKEN_REGEX.test(token.trim());
}

/**
 * Formats a WhatsApp-style notification preview string for any message type.
 */
export function formatMessageNotificationBody(message: {
    type?: string;
    content?: string;
    attachmentMeta?: { name?: string; mimeType?: string };
    location?: { label?: string };
    voiceDuration?: number;
    isViewOnce?: boolean;
    isEncrypted?: boolean;
}): string {
    if (message.isEncrypted) {
        if (message.isViewOnce) return "🔒 Encrypted view-once media";
        if (message.type === "image") return "🔒 Encrypted photo";
        if (message.type === "video") return "🔒 Encrypted video";
        if (message.type === "voice") return "🔒 Encrypted voice message";
        if (message.type === "file") return "🔒 Encrypted file";
        return "🔒 New encrypted message";
    }
    if (message.isViewOnce) {
        return message.type === "video" ? "🎥 View-once video" : "📷 View-once photo";
    }

    const rawTrimmed = (message.content || "").trim();
    const trimmedContent = rawTrimmed.split(/\n?\[BUBBLY_(?:GAME|COUNTDOWN|CHECKLIST)\]/)[0].trim();

    switch (message.type) {
        case "image": {
            const isGif = message.attachmentMeta?.mimeType === "image/gif";
            if (isGif) return trimmedContent ? `🎞️ GIF · ${trimmedContent}` : "🎞️ GIF";
            return trimmedContent ? `📷 ${trimmedContent}` : "📷 Photo";
        }
        case "video":
            return trimmedContent ? `🎥 ${trimmedContent}` : "🎥 Video";
        case "voice": {
            const secs = typeof message.voiceDuration === "number" ? Math.round(message.voiceDuration) : 0;
            if (secs > 0) {
                const mins = Math.floor(secs / 60);
                const rem = secs % 60;
                return `🎤 Voice message (${mins}:${rem < 10 ? "0" : ""}${rem})`;
            }
            return "🎤 Voice message";
        }
        case "file":
            return message.attachmentMeta?.name
                ? `📎 ${message.attachmentMeta.name}`
                : "📎 Document";
        case "location":
            return message.location?.label
                ? `📍 ${message.location.label}`
                : "📍 Location";
        case "poll":
            return trimmedContent ? `📊 Poll: ${trimmedContent}` : "📊 Poll";
        case "checklist":
            return trimmedContent ? `✅ Checklist: ${trimmedContent}` : "✅ Checklist";
        case "announcement":
            return trimmedContent ? `📢 ${trimmedContent}` : "📢 Announcement";
        default:
            if (!trimmedContent) return "New message";
            return trimmedContent.length > 180
                ? `${trimmedContent.slice(0, 177)}...`
                : trimmedContent;
    }
}

/**
 * Sends push notifications in batches of 100 to Expo Push API and cleans up invalid tokens.
 */
export async function sendExpoPushNotifications(
    messages: ExpoPushMessage[]
): Promise<{ sent: number; failed: number }> {
    const validMessages = messages.filter((m) => isValidExpoPushToken(m.to));
    if (validMessages.length === 0) return { sent: 0, failed: 0 };

    let sent = 0;
    let failed = 0;
    const invalidTokens: string[] = [];

    for (let i = 0; i < validMessages.length; i += 100) {
        const chunk = validMessages.slice(i, i + 100);
        try {
            const response = await fetch(EXPO_PUSH_URL, {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Accept-encoding": "gzip, deflate",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(chunk),
            });

            if (!response.ok) {
                failed += chunk.length;
                console.error("Expo Push API HTTP error:", response.status, await response.text());
                continue;
            }

            const result: any = await response.json();
            const tickets: any[] = Array.isArray(result?.data) ? result.data : [];

            tickets.forEach((ticket, idx) => {
                if (ticket?.status === "ok") {
                    sent += 1;
                } else {
                    failed += 1;
                    console.warn(
                        "Expo Push ticket error:",
                        ticket?.details?.error || ticket?.message || "unknown"
                    );
                    if (ticket?.details?.error === "DeviceNotRegistered" && chunk[idx]?.to) {
                        invalidTokens.push(chunk[idx].to);
                    }
                }
            });
        } catch (err) {
            failed += chunk.length;
            console.error("Expo Push API network error:", err instanceof Error ? err.message : err);
        }
    }

    if (invalidTokens.length > 0) {
        User.updateMany(
            { pushTokens: { $in: invalidTokens } },
            { $pull: { pushTokens: { $in: invalidTokens } } }
        ).catch((err) => console.error("Failed to prune invalid push tokens:", err));
    }

    return { sent, failed };
}

/**
 * Dispatches WhatsApp-style push notifications for a newly created message.
 */
export async function sendMessagePushNotifications(params: {
    conversation: {
        _id: any;
        type: string;
        name?: string;
        avatar?: string;
        participants: any[];
        mutedBy?: { userId: any; until: Date | null }[];
    };
    sender: { id: string; name?: string; avatar?: string | null };
    message: {
        id?: string;
        _id?: any;
        type?: string;
        content?: string;
        attachmentMeta?: { name?: string; mimeType?: string };
        location?: { label?: string };
        voiceDuration?: number;
        isViewOnce?: boolean;
        isSilent?: boolean;
    };
}): Promise<void> {
    const { conversation, sender, message } = params;

    if (message.type === "system" || message.type === "call" || message.isSilent) return;

    const now = new Date();
    const senderIdStr = sender.id.toString();

    const recipientIds = conversation.participants
        .map((p) => p.toString())
        .filter((pid) => {
            if (pid === senderIdStr) return false;
            const muteEntry = (conversation.mutedBy || []).find(
                (m) => m.userId?.toString() === pid
            );
            if (muteEntry) {
                const isMuted = !muteEntry.until || new Date(muteEntry.until) > now;
                if (isMuted) return false;
            }
            return true;
        });

    if (recipientIds.length === 0) return;

    const [senderDoc, recipients] = await Promise.all([
        User.findById(senderIdStr).select("blockedUsers").lean(),
        User.find({
            _id: { $in: recipientIds },
            notificationsEnabled: { $ne: false },
            pushTokens: { $exists: true, $ne: [] },
        })
            .select("_id pushTokens blockedUsers")
            .lean(),
    ]);

    const senderBlocked = new Set((senderDoc?.blockedUsers || []).map((id: any) => id.toString()));
    const filteredRecipients = recipients.filter((r: any) => {
        const rid = r._id.toString();
        if (senderBlocked.has(rid)) return false;
        const recipientBlocked = (r.blockedUsers || []).some((id: any) => id.toString() === senderIdStr);
        return !recipientBlocked;
    });

    if (filteredRecipients.length === 0) return;

    const isGroup = conversation.type === "group";
    const senderName = sender.name || "New Message";
    const title = isGroup ? `${conversation.name || "Group"}` : senderName;
    const preview = formatMessageNotificationBody(message);
    const body = isGroup ? `${senderName}: ${preview}` : preview;
    const conversationId = conversation._id.toString();
    const messageId = (message.id || message._id || "").toString();

    const notifications: ExpoPushMessage[] = [];
    for (const recipient of filteredRecipients) {
        const tokens = Array.isArray(recipient.pushTokens) ? recipient.pushTokens : [];
        for (const token of tokens) {
            if (!isValidExpoPushToken(token)) continue;
            notifications.push({
                to: token,
                title,
                subtitle: isGroup ? senderName : undefined,
                body: isGroup ? preview : body,
                sound: "notification.mp3",
                priority: "high",
                interruptionLevel: "time-sensitive",
                mutableContent: true,
                _contentAvailable: true,
                ttl: 86400,
                channelId: "messages",
                data: {
                    type: "message",
                    conversationId,
                    messageId,
                    senderId: senderIdStr,
                    senderName,
                    senderAvatar: sender.avatar || "",
                    conversationType: conversation.type,
                    conversationName: conversation.name || senderName,
                    conversationAvatar: conversation.avatar || sender.avatar || "",
                    timestamp: Date.now(),
                },
            });
        }
    }

    if (notifications.length > 0) {
        await sendExpoPushNotifications(notifications);
    }
}

/**
 * Dispatches a high-priority incoming call push notification so closed/background devices ring.
 */
export async function sendCallPushNotification(params: {
    calleeId: string;
    caller: { id: string; name?: string; avatar?: string | null };
    callId: string;
    kind: "voice" | "video";
    conversationId: string;
}): Promise<{ sent: boolean }> {
    const callee = await User.findById(params.calleeId)
        .select("pushTokens notificationsEnabled callRingtone")
        .lean();

    if (!callee || callee.notificationsEnabled === false) {
        return { sent: false };
    }

    const tokens = Array.isArray(callee.pushTokens)
        ? callee.pushTokens.filter(isValidExpoPushToken)
        : [];

    if (tokens.length === 0) {
        return { sent: false };
    }

    const callerName = params.caller.name || "Someone";
    const isVideo = params.kind === "video";
    const ringtoneMeta = resolveCallRingtonePushConfig((callee as any).callRingtone);

    const notifications: ExpoPushMessage[] = tokens.map((token) => ({
        to: token,
        title: isVideo ? "Incoming Video Call" : "Incoming Voice Call",
        subtitle: isVideo ? "Video Call · Bubbly" : "Voice Call · Bubbly",
        body: `${callerName} is calling you on Bubbly`,
        sound: ringtoneMeta.sound,
        priority: "high",
        interruptionLevel: "time-sensitive",
        mutableContent: true,
        _contentAvailable: true,
        ttl: 60,
        channelId: ringtoneMeta.channelId,
        categoryId: "incoming_call",
        data: {
            type: "call",
            callId: params.callId,
            conversationId: params.conversationId,
            kind: params.kind,
            callerId: params.caller.id,
            callerName,
            callerAvatar: params.caller.avatar || "",
            ringtoneId: ringtoneMeta.ringtoneId,
            timestamp: Date.now(),
        },
    }));

    const res = await sendExpoPushNotifications(notifications);
    return { sent: res.sent > 0 };
}

/**
 * Dispatches a missed call notification if an unanswered call ends/times out.
 */
export async function sendMissedCallPushNotification(params: {
    calleeId: string;
    callerId?: string;
    callerName: string;
    callerAvatar?: string;
    callId: string;
    kind: "voice" | "video";
    conversationId: string;
}): Promise<void> {
    const callee = await User.findById(params.calleeId)
        .select("pushTokens notificationsEnabled")
        .lean();

    if (!callee || callee.notificationsEnabled === false) return;

    const tokens = Array.isArray(callee.pushTokens)
        ? callee.pushTokens.filter(isValidExpoPushToken)
        : [];

    if (tokens.length === 0) return;

    const notifications: ExpoPushMessage[] = tokens.map((token) => ({
        to: token,
        title: `Missed ${params.kind === "video" ? "Video" : "Voice"} Call`,
        body: `${params.callerName || "Someone"} tried to reach you`,
        sound: "notification.mp3",
        priority: "high",
        interruptionLevel: "time-sensitive",
        mutableContent: true,
        channelId: "messages",
        data: {
            type: "missed_call",
            callId: params.callId,
            dismissCallId: params.callId,
            conversationId: params.conversationId,
            conversationType: "direct",
            kind: params.kind,
            callerId: params.callerId || "",
            callerName: params.callerName || "Someone",
            callerAvatar: params.callerAvatar || "",
            senderId: params.callerId || "",
            senderName: params.callerName || "Someone",
            senderAvatar: params.callerAvatar || "",
            timestamp: Date.now(),
        },
    }));

    await sendExpoPushNotifications(notifications);
}
