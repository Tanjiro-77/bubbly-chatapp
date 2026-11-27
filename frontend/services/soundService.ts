/**
 * frontend/services/soundService.ts
 *
 * Centralized audio & ringtone engine for Bubbly:
 * - Manages the 4 user-selectable incoming call ringtones (persisted locally & synced to backend).
 * - Maps each ringtone to its dedicated immutable Android NotificationChannel ID & sound filename
 *   so closed/killed-app call pushes play the exact selected ringtone.
 * - Plays custom notification chimes, incoming call loops, outgoing ringback tones, and previews
 *   via expo-audio.
 */

import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AudioPlayer, createAudioPlayer, setAudioModeAsync, setIsAudioActiveAsync } from "expo-audio";
import { API_URL } from "../constants";

export type IncomingRingtoneId =
    | "incoming_call"
    | "incoming_call_2"
    | "incoming_call_3"
    | "incoming_call_4";

export interface IncomingRingtoneOption {
    id: IncomingRingtoneId;
    label: string;
    subtitle: string;
    channelId: string;
    soundFile: string;
    asset: number;
}

export const NOTIFICATION_SOUND_FILE = "notification.mp3";
export const NOTIFICATION_SOUND_ASSET = require("../assets/audio/notification.mp3");
export const OUTGOING_CALL_SOUND_ASSET = require("../assets/audio/outgoing_call.mp3");

export const INCOMING_RINGTONES: IncomingRingtoneOption[] = [
    {
        id: "incoming_call",
        label: "Classic Bubbly",
        subtitle: "Warm flagship ringtone",
        channelId: "calls_ringtone_1",
        soundFile: "incoming_call.mp3",
        asset: require("../assets/audio/incoming_call.mp3"),
    },
    {
        id: "incoming_call_2",
        label: "Crisp Horizon",
        subtitle: "Bright modern chime",
        channelId: "calls_ringtone_2",
        soundFile: "incoming_call_2.mp3",
        asset: require("../assets/audio/incoming_call_2.mp3"),
    },
    {
        id: "incoming_call_3",
        label: "Pulse Wave",
        subtitle: "Rhythmic studio pulse",
        channelId: "calls_ringtone_3",
        soundFile: "incoming_call_3.mp3",
        asset: require("../assets/audio/incoming_call_3.mp3"),
    },
    {
        id: "incoming_call_4",
        label: "Celestial Bells",
        subtitle: "Deep resonant bells",
        channelId: "calls_ringtone_4",
        soundFile: "incoming_call_4.mp3",
        asset: require("../assets/audio/incoming_call_4.mp3"),
    },
];

export const DEFAULT_RINGTONE_ID: IncomingRingtoneId = "incoming_call";
const RINGTONE_STORAGE_KEY = "@bubbly_incoming_ringtone_v1";
const SOUND_ENABLED_KEY = "bubbly_sound_enabled";

let cachedRingtoneId: IncomingRingtoneId = DEFAULT_RINGTONE_ID;

let incomingPlayer: AudioPlayer | null = null;
let outgoingPlayer: AudioPlayer | null = null;
let previewPlayer: AudioPlayer | null = null;
let notifPlayer: AudioPlayer | null = null;
let previewTimer: ReturnType<typeof setTimeout> | null = null;

function releasePlayer(player: AudioPlayer | null): null {
    if (!player) return null;
    try {
        player.pause();
    } catch {}
    try {
        player.remove();
    } catch {}
    return null;
}

export function isValidRingtoneId(value: unknown): value is IncomingRingtoneId {
    return INCOMING_RINGTONES.some((item) => item.id === value);
}

export function getIncomingRingtoneOption(id?: string | null): IncomingRingtoneOption {
    const found = INCOMING_RINGTONES.find((item) => item.id === id);
    return found || INCOMING_RINGTONES[0];
}

export function getIncomingRingtoneId(): IncomingRingtoneId {
    return cachedRingtoneId;
}

export async function initIncomingRingtone(): Promise<IncomingRingtoneId> {
    try {
        const stored = await AsyncStorage.getItem(RINGTONE_STORAGE_KEY);
        if (isValidRingtoneId(stored)) {
            cachedRingtoneId = stored;
        }
    } catch {
        // Keep default fallback
    }
    return cachedRingtoneId;
}

export async function syncCallRingtoneToBackend(
    id: IncomingRingtoneId,
    authToken?: string | null
): Promise<void> {
    try {
        const jwt = authToken || (await AsyncStorage.getItem("token"));
        if (!jwt) return;

        await fetch(`${API_URL}/api/user/call-ringtone`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${jwt}`,
            },
            body: JSON.stringify({ callRingtone: id }),
        });
    } catch {
        // Non-blocking when offline
    }
}

export async function setIncomingRingtoneId(
    id: IncomingRingtoneId,
    authToken?: string | null
): Promise<IncomingRingtoneOption> {
    const resolved = getIncomingRingtoneOption(id);
    cachedRingtoneId = resolved.id;
    try {
        await AsyncStorage.setItem(RINGTONE_STORAGE_KEY, resolved.id);
    } catch {}
    syncCallRingtoneToBackend(resolved.id, authToken).catch(() => {});
    return resolved;
}

/**
 * Plays the custom notification chime (`assets/audio/notification.mp3`) for foreground alerts.
 */
async function startAudioClip({
    asset,
    loop,
    volume,
    playsInSilentMode,
    interruptionMode,
    shouldRouteThroughEarpiece = false,
}: {
    asset: number;
    loop: boolean;
    volume: number;
    playsInSilentMode: boolean;
    interruptionMode: "mixWithOthers" | "doNotMix";
    shouldRouteThroughEarpiece?: boolean;
}): Promise<AudioPlayer | null> {
    await setIsAudioActiveAsync(true).catch(() => {});
    await setAudioModeAsync({
        playsInSilentMode,
        shouldPlayInBackground: false,
        shouldRouteThroughEarpiece,
        interruptionMode,
    }).catch(() => {});

    const player = createAudioPlayer(asset);
    player.loop = loop;
    player.volume = volume;
    player.play();
    return player;
}

export async function playNotificationSound(): Promise<void> {
    if (Platform.OS === "web") return;
    try {
        const pref = await AsyncStorage.getItem(SOUND_ENABLED_KEY);
        if (pref === "false") return;

        notifPlayer = releasePlayer(notifPlayer);
        notifPlayer = await startAudioClip({
            asset: NOTIFICATION_SOUND_ASSET,
            loop: false,
            volume: 0.85,
            playsInSilentMode: false,
            interruptionMode: "mixWithOthers",
        });
    } catch {
        // Ignore playback failures when device audio focus is locked
    }
}

/**
 * Loops the user's chosen incoming call sound on the IncomingCall screen.
 */
export async function startIncomingRingtone(explicitId?: string | null): Promise<void> {
    if (Platform.OS === "web") return;
    try {
        stopPreviewRingtone();
        await initIncomingRingtone();
        const option = getIncomingRingtoneOption(explicitId || cachedRingtoneId);

        incomingPlayer = releasePlayer(incomingPlayer);
        incomingPlayer = await startAudioClip({
            asset: option.asset,
            loop: true,
            volume: 1.0,
            playsInSilentMode: true,
            interruptionMode: "doNotMix",
        });
    } catch {
        // Ignore audio focus failures
    }
}

export function stopIncomingRingtone(): void {
    incomingPlayer = releasePlayer(incomingPlayer);
}

/**
 * Plays the outgoing dial ringback loop (`assets/audio/outgoing_call.mp3`) while awaiting pickup.
 */
export async function startOutgoingRingback(): Promise<void> {
    if (Platform.OS === "web") return;
    try {
        const pref = await AsyncStorage.getItem(SOUND_ENABLED_KEY);
        if (pref === "false") return;

        outgoingPlayer = releasePlayer(outgoingPlayer);
        outgoingPlayer = await startAudioClip({
            asset: OUTGOING_CALL_SOUND_ASSET,
            loop: true,
            volume: 0.9,
            playsInSilentMode: true,
            interruptionMode: "doNotMix",
            shouldRouteThroughEarpiece: false,
        });
    } catch {
        // Ignore audio focus failures
    }
}

export function stopOutgoingRingback(): void {
    outgoingPlayer = releasePlayer(outgoingPlayer);
}

/**
 * Stops call ringback/ringtones and deactivates expo-audio focus before Agora enters communication mode.
 */
export async function releaseCallAudioSession(): Promise<void> {
    stopIncomingRingtone();
    stopOutgoingRingback();
    stopPreviewRingtone();
    if (Platform.OS === "web") return;
    await setIsAudioActiveAsync(false).catch(() => {});
}

/**
 * Plays a short audition preview for one of the 4 selectable incoming call sounds.
 */
export async function previewIncomingRingtone(id: IncomingRingtoneId): Promise<void> {
    if (Platform.OS === "web") return;
    try {
        stopPreviewRingtone();
        const option = getIncomingRingtoneOption(id);

        previewPlayer = await startAudioClip({
            asset: option.asset,
            loop: true,
            volume: 0.95,
            playsInSilentMode: true,
            interruptionMode: "doNotMix",
        });

        previewTimer = setTimeout(() => {
            stopPreviewRingtone();
        }, 5500);
    } catch {
        // Ignore preview errors
    }
}

export function stopPreviewRingtone(): void {
    if (previewTimer) {
        clearTimeout(previewTimer);
        previewTimer = null;
    }
    previewPlayer = releasePlayer(previewPlayer);
}
