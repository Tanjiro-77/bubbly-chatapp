import { Response } from "express";
import { isValidObjectId } from "mongoose";
import { AuthRequest } from "../middleware/auth";
import Message from "../modals/Message";
import { getMembership } from "../utils/permissions";

const MAX_AUDIO_BYTES = 20 * 1024 * 1024; // 20 MB

/** Restricts server-side fetches to trusted HTTPS Cloudinary / CDN audio origins (prevents SSRF). */
export function isAllowedAudioUrl(rawUrl: string): boolean {
    try {
        const parsed = new URL(rawUrl);
        if (parsed.protocol !== "https:") return false;
        const host = parsed.hostname.toLowerCase();
        return host === "res.cloudinary.com" || host.endsWith(".cloudinary.com");
    } catch {
        return false;
    }
}

export function getConfiguredSttProvider(): "groq" | "gemini" | "openai" | "deepgram" | null {
    if (process.env.GROQ_API_KEY?.trim()) return "groq";
    if ((process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY)?.trim()) return "gemini";
    if (process.env.OPENAI_API_KEY?.trim()) return "openai";
    if (process.env.DEEPGRAM_API_KEY?.trim()) return "deepgram";
    return null;
}

function resolveExtensionAndMime(audioUrl: string, contentType?: string | null): { ext: string; mime: string } {
    const lowerUrl = audioUrl.toLowerCase().split("?")[0];
    const cleanCt = (contentType || "").split(";")[0].trim().toLowerCase();
    if (lowerUrl.endsWith(".mp3") || cleanCt === "audio/mpeg") return { ext: "mp3", mime: "audio/mpeg" };
    if (lowerUrl.endsWith(".wav") || cleanCt === "audio/wav") return { ext: "wav", mime: "audio/wav" };
    if (lowerUrl.endsWith(".webm") || cleanCt === "audio/webm") return { ext: "webm", mime: "audio/webm" };
    if (lowerUrl.endsWith(".ogg") || cleanCt === "audio/ogg") return { ext: "ogg", mime: "audio/ogg" };
    if (lowerUrl.endsWith(".aac") || cleanCt === "audio/aac") return { ext: "aac", mime: "audio/aac" };
    return { ext: "m4a", mime: cleanCt.startsWith("audio/") ? cleanCt : "audio/mp4" };
}

async function callOpenAiCompatibleStt(params: {
    endpoint: string;
    apiKey: string;
    model: string;
    buffer: ArrayBuffer;
    ext: string;
    mime: string;
}): Promise<string> {
    const form = new FormData();
    const blob = new Blob([params.buffer], { type: params.mime });
    form.append("file", blob, `voice.${params.ext}`);
    form.append("model", params.model);
    form.append("response_format", "json");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25_000);
    try {
        const resp = await fetch(params.endpoint, {
            method: "POST",
            headers: { Authorization: `Bearer ${params.apiKey}` },
            body: form,
            signal: controller.signal,
        });
        const data: any = await resp.json().catch(() => null);
        if (!resp.ok) {
            throw new Error(data?.error?.message || `STT failed (${resp.status})`);
        }
        return typeof data?.text === "string" ? data.text.trim() : "";
    } finally {
        clearTimeout(timeout);
    }
}

const DEFAULT_GEMINI_AUDIO_MODELS = [
    "gemini-3.8-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash-lite",
] as const;

export function resolveGeminiEndpoints(
    apiKey: string,
    preferredModel = process.env.GEMINI_STT_MODEL
): Array<{ url: string; headers: Record<string, string> }> {
    const cleanKey = apiKey.trim();
    const override = preferredModel?.trim();
    const models = override
        ? [override, ...DEFAULT_GEMINI_AUDIO_MODELS.filter((m) => m !== override)]
        : [...DEFAULT_GEMINI_AUDIO_MODELS];

    const vertexTargets = models.map((model) => ({
        url: `https://aiplatform.googleapis.com/v1/models/${model}:generateContent`,
        headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": cleanKey,
        },
    }));

    const aiStudioTargets = models.map((model) => ({
        url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(cleanKey)}`,
        headers: {
            "Content-Type": "application/json",
        },
    }));

    return cleanKey.startsWith("AQ.")
        ? [...vertexTargets, ...aiStudioTargets]
        : [...aiStudioTargets, ...vertexTargets];
}

async function callGeminiStt(apiKey: string, buffer: ArrayBuffer, mime: string): Promise<string> {
    const b64 = Buffer.from(buffer).toString("base64");
    const targets = resolveGeminiEndpoints(apiKey);
    const payload = JSON.stringify({
        contents: [
            {
                role: "user",
                parts: [
                    {
                        text: "Transcribe the spoken speech in this audio accurately in its original language. Return ONLY the transcript text with normal punctuation, or an empty string if silent.",
                    },
                    { inlineData: { mimeType: mime, data: b64 } },
                ],
            },
        ],
    });

    let lastErrMsg = "Gemini transcription failed";
    for (const target of targets) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 22_000);
        try {
            const resp = await fetch(target.url, {
                method: "POST",
                headers: target.headers,
                body: payload,
                signal: controller.signal,
            });
            const data: any = await resp.json().catch(() => null);
            if (!resp.ok) {
                lastErrMsg = data?.error?.message || `Gemini STT failed (${resp.status})`;
                continue;
            }
            const parts = data?.candidates?.[0]?.content?.parts;
            return Array.isArray(parts) ? parts.map((p: any) => p?.text || "").join(" ").trim() : "";
        } catch (err: any) {
            lastErrMsg = err?.name === "AbortError" ? "Gemini request timed out" : (err?.message || lastErrMsg);
        } finally {
            clearTimeout(timeout);
        }
    }

    throw new Error(lastErrMsg);
}

async function callDeepgramStt(apiKey: string, buffer: ArrayBuffer, mime: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25_000);
    try {
        const resp = await fetch("https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&detect_language=true", {
            method: "POST",
            headers: {
                Authorization: `Token ${apiKey}`,
                "Content-Type": mime,
            },
            body: Buffer.from(buffer),
            signal: controller.signal,
        });
        const data: any = await resp.json().catch(() => null);
        if (!resp.ok) {
            throw new Error(data?.err_msg || `Deepgram STT failed (${resp.status})`);
        }
        const transcript = data?.results?.channels?.[0]?.alternatives?.[0]?.transcript;
        return typeof transcript === "string" ? transcript.trim() : "";
    } finally {
        clearTimeout(timeout);
    }
}

/**
 * Transcribes a voice message using server-configured STT providers and caches the result on the Message doc.
 * POST /api/transcribe
 */
export async function transcribeAudio(req: AuthRequest, res: Response): Promise<void> {
    try {
        const userId = req.userId;
        if (!userId) {
            res.status(401).json({ success: false, msg: "Unauthorized" });
            return;
        }

        const { messageId, audioUrl } = (req.body ?? {}) as { messageId?: string; audioUrl?: string };

        let messageDoc: any = null;
        if (messageId && isValidObjectId(messageId)) {
            messageDoc = await Message.findById(messageId).select("conversationId voiceUrl transcript isDeleted content");
            if (!messageDoc) {
                res.status(404).json({ success: false, msg: "Voice message not found" });
                return;
            }
            const { isMember } = await getMembership(messageDoc.conversationId?.toString(), userId);
            if (!isMember) {
                res.status(403).json({ success: false, msg: "Forbidden" });
                return;
            }
            if (messageDoc.isDeleted) {
                res.status(400).json({ success: false, msg: "Message was deleted" });
                return;
            }
            if (typeof messageDoc.transcript === "string" && messageDoc.transcript.trim()) {
                res.json({
                    success: true,
                    data: { transcript: messageDoc.transcript.trim(), cached: true },
                });
                return;
            }
        }

        const targetUrl = String(messageDoc?.voiceUrl || audioUrl || "").trim();
        if (!targetUrl || !isAllowedAudioUrl(targetUrl)) {
            res.status(400).json({ success: false, msg: "A valid hosted Cloudinary voice URL is required" });
            return;
        }

        const provider = getConfiguredSttProvider();
        if (!provider) {
            res.status(503).json({
                success: false,
                code: "STT_NOT_CONFIGURED",
                msg: "Voice transcription requires a server speech-to-text API key (GROQ_API_KEY, GEMINI_API_KEY, OPENAI_API_KEY, or DEEPGRAM_API_KEY).",
            });
            return;
        }

        const downloadController = new AbortController();
        const downloadTimeout = setTimeout(() => downloadController.abort(), 20_000);
        let audioBuffer: ArrayBuffer;
        let contentType: string | null = null;
        try {
            const audioRes = await fetch(targetUrl, { signal: downloadController.signal });
            if (!audioRes.ok) {
                throw new Error(`Could not download audio (${audioRes.status})`);
            }
            contentType = audioRes.headers.get("content-type");
            const lenHeader = Number(audioRes.headers.get("content-length") || 0);
            if (lenHeader > MAX_AUDIO_BYTES) {
                res.status(413).json({ success: false, msg: "Audio file is too large to transcribe" });
                return;
            }
            audioBuffer = await audioRes.arrayBuffer();
            if (audioBuffer.byteLength > MAX_AUDIO_BYTES || audioBuffer.byteLength === 0) {
                res.status(400).json({ success: false, msg: "Invalid or oversized audio file" });
                return;
            }
        } finally {
            clearTimeout(downloadTimeout);
        }

        const { ext, mime } = resolveExtensionAndMime(targetUrl, contentType);
        let transcript = "";

        if (provider === "groq") {
            transcript = await callOpenAiCompatibleStt({
                endpoint: "https://api.groq.com/openai/v1/audio/transcriptions",
                apiKey: process.env.GROQ_API_KEY!.trim(),
                model: "whisper-large-v3-turbo",
                buffer: audioBuffer,
                ext,
                mime,
            });
        } else if (provider === "openai") {
            transcript = await callOpenAiCompatibleStt({
                endpoint: "https://api.openai.com/v1/audio/transcriptions",
                apiKey: process.env.OPENAI_API_KEY!.trim(),
                model: "whisper-1",
                buffer: audioBuffer,
                ext,
                mime,
            });
        } else if (provider === "gemini") {
            transcript = await callGeminiStt(
                (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY)!.trim(),
                audioBuffer,
                mime
            );
        } else if (provider === "deepgram") {
            transcript = await callDeepgramStt(process.env.DEEPGRAM_API_KEY!.trim(), audioBuffer, mime);
        }

        const finalTranscript = transcript.trim();
        if (!finalTranscript) {
            res.json({
                success: true,
                data: { transcript: "", emptySpeech: true, cached: false, provider },
            });
            return;
        }

        if (messageDoc) {
            await Message.findByIdAndUpdate(messageDoc._id, {
                $set: { transcript: finalTranscript.slice(0, 4000) },
            }).catch(() => {});
        }

        res.json({
            success: true,
            data: { transcript: finalTranscript, cached: false, provider },
        });
    } catch (error: any) {
        console.error("transcribeAudio error:", error?.message || error);
        res.status(500).json({
            success: false,
            msg: error?.name === "AbortError" ? "Transcription timed out" : (error?.message || "Transcription failed"),
        });
    }
}
