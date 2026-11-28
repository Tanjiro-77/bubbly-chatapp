import nacl from "tweetnacl";
import * as Crypto from "expo-crypto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { API_URL } from "../constants";

// Seed TweetNaCl PRNG with Expo's native CSPRNG (with WebCrypto fallback)
let prngInitialized = false;
function ensurePrng() {
    if (prngInitialized) return;
    nacl.setPRNG((x: Uint8Array, n: number) => {
        if (n <= 0) return;
        try {
            const random = Crypto.getRandomBytes(n);
            for (let i = 0; i < n; i++) {
                x[i] = random[i];
            }
            return;
        } catch {
            // Fallback to WebCrypto if available
            const webCrypto = (globalThis as any)?.crypto;
            if (webCrypto && typeof webCrypto.getRandomValues === "function") {
                webCrypto.getRandomValues(x.subarray(0, n));
                return;
            }
            throw new Error("No secure CSPRNG available on this device");
        }
    });
    prngInitialized = true;
}

const B64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export function bytesToBase64(bytes: Uint8Array): string {
    const chunks: string[] = [];
    const len = bytes.length;
    for (let i = 0; i < len; i += 3) {
        const b0 = bytes[i];
        const b1 = i + 1 < len ? bytes[i + 1] : 0;
        const b2 = i + 2 < len ? bytes[i + 2] : 0;
        chunks.push(
            B64_CHARS[b0 >> 2] +
            B64_CHARS[((b0 & 3) << 4) | (b1 >> 4)] +
            (i + 1 < len ? B64_CHARS[((b1 & 15) << 2) | (b2 >> 6)] : "=") +
            (i + 2 < len ? B64_CHARS[b2 & 63] : "=")
        );
    }
    return chunks.join("");
}

export function base64ToBytes(b64: string): Uint8Array {
    const clean = b64.replace(/[^A-Za-z0-9+/=]/g, "");
    const len = clean.length;
    if (len === 0) return new Uint8Array(0);
    let pad = 0;
    if (clean[len - 1] === "=") pad++;
    if (clean[len - 2] === "=") pad++;
    const outLen = (len * 3) / 4 - pad;
    const out = new Uint8Array(outLen);
    let j = 0;
    for (let i = 0; i < len; i += 4) {
        const c0 = B64_CHARS.indexOf(clean[i]);
        const c1 = B64_CHARS.indexOf(clean[i + 1]);
        const c2 = clean[i + 2] === "=" ? 0 : B64_CHARS.indexOf(clean[i + 2]);
        const c3 = clean[i + 3] === "=" ? 0 : B64_CHARS.indexOf(clean[i + 3]);
        const n = (c0 << 18) | (c1 << 12) | (c2 << 6) | c3;
        if (j < outLen) out[j++] = (n >> 16) & 0xff;
        if (j < outLen) out[j++] = (n >> 8) & 0xff;
        if (j < outLen) out[j++] = n & 0xff;
    }
    return out;
}

function utf8ToBytes(str: string): Uint8Array {
    const out: number[] = [];
    for (let i = 0; i < str.length; i++) {
        let code = str.charCodeAt(i);
        if (code < 0x80) {
            out.push(code);
        } else if (code < 0x800) {
            out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
        } else if (code >= 0xd800 && code <= 0xdbff && i + 1 < str.length) {
            const next = str.charCodeAt(++i);
            const cp = ((code - 0xd800) << 10) + (next - 0xdc00) + 0x10000;
            out.push(
                0xf0 | (cp >> 18),
                0x80 | ((cp >> 12) & 0x3f),
                0x80 | ((cp >> 6) & 0x3f),
                0x80 | (cp & 0x3f)
            );
        } else {
            out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
        }
    }
    return new Uint8Array(out);
}

function bytesToUtf8(bytes: Uint8Array): string {
    let out = "";
    let i = 0;
    while (i < bytes.length) {
        const b0 = bytes[i++];
        if (b0 < 0x80) {
            out += String.fromCharCode(b0);
        } else if ((b0 & 0xe0) === 0xc0) {
            const b1 = bytes[i++] & 0x3f;
            out += String.fromCharCode(((b0 & 0x1f) << 6) | b1);
        } else if ((b0 & 0xf0) === 0xe0) {
            const b1 = bytes[i++] & 0x3f;
            const b2 = bytes[i++] & 0x3f;
            out += String.fromCharCode(((b0 & 0x0f) << 12) | (b1 << 6) | b2);
        } else {
            const b1 = bytes[i++] & 0x3f;
            const b2 = bytes[i++] & 0x3f;
            const b3 = bytes[i++] & 0x3f;
            const cp = (((b0 & 0x07) << 18) | (b1 << 12) | (b2 << 6) | b3) - 0x10000;
            out += String.fromCharCode(0xd800 + (cp >> 10), 0xdc00 + (cp & 0x3ff));
        }
    }
    return out;
}

export interface E2EEIdentityKeys {
    publicKey: string;
    secretKey: string;
    keyVersion: number;
    fingerprint: string;
}

export interface E2EEEncryptedPayload {
    v: number;
    alg: string;
    iv: string;
    ciphertext: string;
    keyVersion?: number;
}

export interface E2EEMessagePlaintext {
    content?: string;
    type?: string;
    attachement?: string | null;
    attachmentMeta?: {
        url?: string;
        name?: string;
        mimeType?: string;
        size?: number;
        resourceType?: "image" | "video" | "raw" | "audio";
        isHd?: boolean;
        isViewOnce?: boolean;
        fileKey?: string;
        fileNonce?: string;
    } | null;
    voiceUrl?: string | null;
    voiceDuration?: number;
    voiceFileKey?: string;
    voiceFileNonce?: string;
    location?: { latitude: number; longitude: number; label?: string } | null;
}

export interface E2EEConversationKeyEntry {
    userId: string;
    encryptedKey: string;
    nonce: string;
    senderPublicKey: string;
    keyVersion: number;
}

const IDENTITY_KEY_PREFIX = "bubbly_e2ee_identity_";
const CONV_KEY_PREFIX = "bubbly_e2ee_convkey_";
const identityCache = new Map<string, E2EEIdentityKeys>();
const convKeyCache = new Map<string, string>();
const publicKeyCache = new Map<string, { publicKey: string; keyVersion: number; fingerprint: string }>();

export function computePublicKeyFingerprint(publicKeyB64: string): string {
    try {
        const hash = nacl.hash(base64ToBytes(publicKeyB64));
        const groups: string[] = [];
        for (let i = 0; i < 16; i += 2) {
            const val = ((hash[i] << 8) | hash[i + 1]).toString(16).padStart(4, "0").toUpperCase();
            groups.push(val);
        }
        return groups.join(" ");
    } catch {
        return "";
    }
}

export function computeSafetyNumber(
    myUserId: string,
    myPublicKeyB64: string,
    theirUserId: string,
    theirPublicKeyB64: string
): string {
    try {
        const pair = [
            { id: myUserId, pub: myPublicKeyB64 },
            { id: theirUserId, pub: theirPublicKeyB64 },
        ].sort((a, b) => a.id.localeCompare(b.id));
        const input = `${pair[0].id}|${pair[0].pub}|${pair[1].id}|${pair[1].pub}`;
        const digest = nacl.hash(utf8ToBytes(input));
        const chunks: string[] = [];
        for (let i = 0; i < 12; i++) {
            const idx = i * 4;
            const num =
                ((digest[idx] << 24) | (digest[idx + 1] << 16) | (digest[idx + 2] << 8) | digest[idx + 3]) >>> 0;
            chunks.push(String(num % 100000).padStart(5, "0"));
        }
        return chunks.join(" ");
    } catch {
        return "";
    }
}

export async function ensureIdentityKeyPair(userId: string): Promise<E2EEIdentityKeys> {
    ensurePrng();
    const cached = identityCache.get(userId);
    if (cached) return cached;

    const storageKey = `${IDENTITY_KEY_PREFIX}${userId}`;
    const raw = await AsyncStorage.getItem(storageKey);
    if (raw) {
        try {
            const parsed = JSON.parse(raw) as E2EEIdentityKeys;
            if (parsed.publicKey && parsed.secretKey) {
                if (!parsed.fingerprint) {
                    parsed.fingerprint = computePublicKeyFingerprint(parsed.publicKey);
                }
                identityCache.set(userId, parsed);
                return parsed;
            }
        } catch {
            // regenerate below
        }
    }

    const kp = nacl.box.keyPair();
    const publicKey = bytesToBase64(kp.publicKey);
    const secretKey = bytesToBase64(kp.secretKey);
    const keys: E2EEIdentityKeys = {
        publicKey,
        secretKey,
        keyVersion: 1,
        fingerprint: computePublicKeyFingerprint(publicKey),
    };
    await AsyncStorage.setItem(storageKey, JSON.stringify(keys));
    identityCache.set(userId, keys);
    return keys;
}

export async function publishMyPublicKey(userId: string, token?: string | null): Promise<E2EEIdentityKeys> {
    const keys = await ensureIdentityKeyPair(userId);
    const authToken = token || (await AsyncStorage.getItem("token"));
    if (authToken) {
        await axios.put(
            `${API_URL}/api/e2ee/keys`,
            {
                publicKey: keys.publicKey,
                keyVersion: keys.keyVersion,
                fingerprint: keys.fingerprint,
            },
            {
                headers: { Authorization: `Bearer ${authToken}` },
                timeout: 10000,
            }
        ).catch(() => {});
    }
    return keys;
}

export async function fetchBatchPublicKeys(
    userIds: string[],
    token?: string | null
): Promise<Record<string, { publicKey: string; keyVersion: number; fingerprint: string }>> {
    const missing = userIds.filter((id) => id && !publicKeyCache.has(id));
    if (missing.length > 0) {
        const authToken = token || (await AsyncStorage.getItem("token"));
        if (authToken) {
            try {
                const res = await axios.post(
                    `${API_URL}/api/e2ee/keys/batch`,
                    { userIds: missing },
                    { headers: { Authorization: `Bearer ${authToken}` }, timeout: 10000 }
                );
                const map = res.data?.data || {};
                for (const [uid, info] of Object.entries<any>(map)) {
                    if (info?.publicKey) {
                        publicKeyCache.set(uid, info);
                    }
                }
            } catch {
                // fallback to whatever is cached
            }
        }
    }
    const result: Record<string, { publicKey: string; keyVersion: number; fingerprint: string }> = {};
    for (const id of userIds) {
        const entry = publicKeyCache.get(id);
        if (entry) result[id] = entry;
    }
    return result;
}

export function seedPublicKeyCache(participants: any[]) {
    for (const p of participants || []) {
        const id = p?._id?.toString?.() || p?.id?.toString?.();
        if (id && p?.e2eePublicKey) {
            publicKeyCache.set(id, {
                publicKey: p.e2eePublicKey,
                keyVersion: p.e2eeKeyVersion || 1,
                fingerprint: p.e2eeKeyFingerprint || computePublicKeyFingerprint(p.e2eePublicKey),
            });
        }
    }
}

export async function getOrCreateConversationKey(
    conversationId: string,
    myUserId: string,
    participants: any[],
    existingEncryptedKeys?: E2EEConversationKeyEntry[],
    keyVersion: number = 1
): Promise<string | null> {
    ensurePrng();
    const cacheKey = `${CONV_KEY_PREFIX}${myUserId}_${conversationId}_v${keyVersion}`;
    const mem = convKeyCache.get(cacheKey);
    if (mem) return mem;

    const stored = await AsyncStorage.getItem(cacheKey);
    if (stored) {
        convKeyCache.set(cacheKey, stored);
        return stored;
    }

    const myKeys = await ensureIdentityKeyPair(myUserId);

    // 1. Try unwrapping an existing encrypted key for me
    if (Array.isArray(existingEncryptedKeys)) {
        const myEntry = existingEncryptedKeys.find(
            (e) => String(e.userId) === String(myUserId) && (e.keyVersion || 1) === keyVersion
        ) || existingEncryptedKeys.find((e) => String(e.userId) === String(myUserId));

        if (myEntry) {
            try {
                const unwrapped = nacl.box.open(
                    base64ToBytes(myEntry.encryptedKey),
                    base64ToBytes(myEntry.nonce),
                    base64ToBytes(myEntry.senderPublicKey),
                    base64ToBytes(myKeys.secretKey)
                );
                if (unwrapped && unwrapped.length === 32) {
                    const keyB64 = bytesToBase64(unwrapped);
                    convKeyCache.set(cacheKey, keyB64);
                    await AsyncStorage.setItem(cacheKey, keyB64);
                    return keyB64;
                }
            } catch {
                // key mismatch or rotated
            }
        }
        // If other participants already have encryptedKeys for this conversation,
        // do NOT overwrite them with a brand-new key — wait for a peer to wrap the existing key for us.
        if (existingEncryptedKeys.length > 0) {
            return null;
        }
    }

    // 2. If no key exists for this conversation yet, generate & distribute to all participants with public keys
    seedPublicKeyCache(participants);
    const participantIds = (participants || [])
        .map((p: any) => (typeof p === "string" ? p : p?._id?.toString?.() || p?.id?.toString?.()))
        .filter(Boolean) as string[];
    if (!participantIds.includes(myUserId)) participantIds.push(myUserId);

    const pubMap = await fetchBatchPublicKeys(participantIds);
    pubMap[myUserId] = {
        publicKey: myKeys.publicKey,
        keyVersion: myKeys.keyVersion,
        fingerprint: myKeys.fingerprint,
    };

    const convKeyBytes = nacl.randomBytes(32);
    const convKeyB64 = bytesToBase64(convKeyBytes);
    const mySecretBytes = base64ToBytes(myKeys.secretKey);

    const wrappedEntries: E2EEConversationKeyEntry[] = [];
    for (const pid of participantIds) {
        const peerPub = pubMap[pid]?.publicKey;
        if (!peerPub) continue;
        try {
            const peerPubBytes = base64ToBytes(peerPub);
            if (peerPubBytes.length !== nacl.box.publicKeyLength || mySecretBytes.length !== nacl.box.secretKeyLength) {
                continue;
            }
            const nonce = nacl.randomBytes(nacl.box.nonceLength);
            const boxed = nacl.box(convKeyBytes, nonce, peerPubBytes, mySecretBytes);
            wrappedEntries.push({
                userId: pid,
                encryptedKey: bytesToBase64(boxed),
                nonce: bytesToBase64(nonce),
                senderPublicKey: myKeys.publicKey,
                keyVersion,
            });
        } catch {
            // Skip invalid peer public key without crashing
        }
    }

    if (wrappedEntries.length > 0) {
        const token = await AsyncStorage.getItem("token");
        if (token) {
            await axios.put(
                `${API_URL}/api/e2ee/conversations/${conversationId}/keys`,
                { encryptedKeys: wrappedEntries, keyVersion },
                { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }
            ).catch(() => {});
        }
    }

    convKeyCache.set(cacheKey, convKeyB64);
    await AsyncStorage.setItem(cacheKey, convKeyB64);
    return convKeyB64;
}

export async function wrapConversationKeyForPeer(
    conversationId: string,
    myUserId: string,
    peerUserId: string,
    peerPublicKeyB64: string,
    keyVersion: number = 1
): Promise<boolean> {
    ensurePrng();
    const cacheKey = `${CONV_KEY_PREFIX}${myUserId}_${conversationId}_v${keyVersion}`;
    const convKeyB64 = convKeyCache.get(cacheKey) || (await AsyncStorage.getItem(cacheKey));
    if (!convKeyB64) return false;

    const myKeys = await ensureIdentityKeyPair(myUserId);
    const peerPubBytes = base64ToBytes(peerPublicKeyB64);
    const convKeyBytes = base64ToBytes(convKeyB64);
    const mySecretBytes = base64ToBytes(myKeys.secretKey);
    if (
        peerPubBytes.length !== nacl.box.publicKeyLength ||
        convKeyBytes.length !== nacl.secretbox.keyLength ||
        mySecretBytes.length !== nacl.box.secretKeyLength
    ) {
        return false;
    }
    const nonce = nacl.randomBytes(nacl.box.nonceLength);
    const boxed = nacl.box(convKeyBytes, nonce, peerPubBytes, mySecretBytes);
    const token = await AsyncStorage.getItem("token");
    if (!token) return false;

    await axios.put(
        `${API_URL}/api/e2ee/conversations/${conversationId}/keys`,
        {
            encryptedKeys: [
                {
                    userId: peerUserId,
                    encryptedKey: bytesToBase64(boxed),
                    nonce: bytesToBase64(nonce),
                    senderPublicKey: myKeys.publicKey,
                    keyVersion,
                },
            ],
            keyVersion,
        },
        { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }
    );
    return true;
}

export function encryptMessagePayload(
    plaintext: E2EEMessagePlaintext,
    convKeyB64: string,
    keyVersion: number = 1
): E2EEEncryptedPayload {
    ensurePrng();
    const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
    const msgBytes = utf8ToBytes(JSON.stringify(plaintext));
    const boxed = nacl.secretbox(msgBytes, nonce, base64ToBytes(convKeyB64));
    return {
        v: 1,
        alg: "x25519-xsalsa20poly1305",
        iv: bytesToBase64(nonce),
        ciphertext: bytesToBase64(boxed),
        keyVersion,
    };
}

export function decryptMessagePayload(
    e2ee: E2EEEncryptedPayload,
    convKeyB64: string
): E2EEMessagePlaintext | null {
    try {
        if (!e2ee?.iv || !e2ee?.ciphertext || !convKeyB64) return null;
        const opened = nacl.secretbox.open(
            base64ToBytes(e2ee.ciphertext),
            base64ToBytes(e2ee.iv),
            base64ToBytes(convKeyB64)
        );
        if (!opened) return null;
        return JSON.parse(bytesToUtf8(opened)) as E2EEMessagePlaintext;
    } catch {
        return null;
    }
}

export function encryptBytesForE2EE(bytes: Uint8Array): {
    encryptedBytes: Uint8Array;
    fileKey: string;
    fileNonce: string;
} {
    ensurePrng();
    const key = nacl.randomBytes(32);
    const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
    const encryptedBytes = nacl.secretbox(bytes, nonce, key);
    return {
        encryptedBytes,
        fileKey: bytesToBase64(key),
        fileNonce: bytesToBase64(nonce),
    };
}

export function decryptBytesForE2EE(
    encryptedBytes: Uint8Array,
    fileKeyB64: string,
    fileNonceB64: string
): Uint8Array | null {
    try {
        return nacl.secretbox.open(encryptedBytes, base64ToBytes(fileNonceB64), base64ToBytes(fileKeyB64));
    } catch {
        return null;
    }
}

function deriveBackupKey(passphrase: string, saltBytes: Uint8Array): Uint8Array {
    const passBytes = utf8ToBytes(passphrase);
    const combined = new Uint8Array(saltBytes.length + passBytes.length);
    combined.set(saltBytes, 0);
    combined.set(passBytes, saltBytes.length);
    let digest = nacl.hash(combined);
    for (let i = 0; i < 4096; i++) {
        digest = nacl.hash(digest);
    }
    return digest.slice(0, 32);
}

export async function backupMyKeyToServer(userId: string, passphrase: string, token?: string | null): Promise<boolean> {
    ensurePrng();
    const keys = await ensureIdentityKeyPair(userId);
    const salt = nacl.randomBytes(16);
    const derivedKey = deriveBackupKey(passphrase, salt);
    const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
    const boxed = nacl.secretbox(base64ToBytes(keys.secretKey), nonce, derivedKey);

    const authToken = token || (await AsyncStorage.getItem("token"));
    if (!authToken) return false;

    const res = await axios.put(
        `${API_URL}/api/e2ee/keys`,
        {
            publicKey: keys.publicKey,
            keyVersion: keys.keyVersion,
            fingerprint: keys.fingerprint,
            keyBackup: {
                ciphertext: bytesToBase64(boxed),
                nonce: bytesToBase64(nonce),
                salt: bytesToBase64(salt),
                kdfVersion: 1,
            },
        },
        { headers: { Authorization: `Bearer ${authToken}` }, timeout: 10000 }
    );
    return Boolean(res.data?.success);
}

export async function restoreMyKeyFromServer(
    userId: string,
    passphrase: string,
    token?: string | null
): Promise<boolean> {
    const authToken = token || (await AsyncStorage.getItem("token"));
    if (!authToken) return false;
    const res = await axios.get(`${API_URL}/api/e2ee/backup`, {
        headers: { Authorization: `Bearer ${authToken}` },
        timeout: 10000,
    });
    const backup = res.data?.data?.keyBackup;
    const publicKey = res.data?.data?.publicKey;
    const keyVersion = res.data?.data?.keyVersion || 1;
    if (!backup?.ciphertext || !backup?.nonce || !backup?.salt || !publicKey) return false;

    const derivedKey = deriveBackupKey(passphrase, base64ToBytes(backup.salt));
    const secretBytes = nacl.secretbox.open(
        base64ToBytes(backup.ciphertext),
        base64ToBytes(backup.nonce),
        derivedKey
    );
    if (!secretBytes || secretBytes.length !== 32) return false;

    const restored: E2EEIdentityKeys = {
        publicKey,
        secretKey: bytesToBase64(secretBytes),
        keyVersion,
        fingerprint: computePublicKeyFingerprint(publicKey),
    };
    await AsyncStorage.setItem(`${IDENTITY_KEY_PREFIX}${userId}`, JSON.stringify(restored));
    identityCache.set(userId, restored);
    return true;
}

export function generateCallEncryptionCredentials(): { e2eeMediaKey: string; e2eeMediaSalt: string } {
    ensurePrng();
    return {
        e2eeMediaKey: bytesToBase64(nacl.randomBytes(32)),
        e2eeMediaSalt: bytesToBase64(nacl.randomBytes(32)),
    };
}
