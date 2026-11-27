import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import User from "../modals/User";
import Conversation from "../modals/Conversation";
import Message from "../modals/Message";
import crypto from "crypto";
import TranslationCache from "../modals/TranslationCache";

function escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function searchAll(req: AuthRequest, res: Response) {
    try {
        const userId = req.userId!;
        // Sanitize and bound query length to prevent ReDoS
        const rawQ = String(req.query.q || "").trim();
        const q = rawQ.slice(0, 100);
        const type = String(req.query.type || "all");
        const from = req.query.from ? new Date(String(req.query.from)) : null;
        const to = req.query.to ? new Date(String(req.query.to)) : null;

        if (q.length < 2 && type === "all") {
            res.json({ success: true, data: { users: [], conversations: [], messages: [], media: [], files: [], links: [] } });
            return;
        }

        const myConversations = await Conversation.find({ participants: userId })
            .select("_id type name participants")
            .lean();
        const convIds = myConversations.map((c) => c._id);
        const rx = q ? new RegExp(escapeRegex(q), "i") : null;

        const dateFilter: any = {};
        if (from && !Number.isNaN(from.getTime())) dateFilter.$gte = from;
        if (to && !Number.isNaN(to.getTime())) dateFilter.$lte = to;
        const createdFilter = Object.keys(dateFilter).length ? { createdAt: dateFilter } : {};

        const result: any = { users: [], conversations: [], messages: [], media: [], files: [], links: [] };
        const now = new Date();
        const notExpired = { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] };
        const tasks: Promise<void>[] = [];

        if ((!type || type === "all" || type === "users") && rx) {
            // Privacy: only search users you share a conversation with (reuse fetched conversations)
            const knownIds = Array.from(new Set(
                myConversations.flatMap((c: any) => (c.participants || []).map((p: any) => p.toString()))
            )).filter((id) => id !== userId.toString());

            if (knownIds.length > 0) {
                tasks.push(
                    User.find({
                        _id: { $in: knownIds },
                        $or: [{ name: rx }, { email: rx }, { phoneNumber: rx }],
                    }).select("name email phoneNumber avatar").limit(12).lean().then((rows) => {
                        result.users = rows;
                    })
                );
            }
        }

        if ((!type || type === "all" || type === "conversations") && rx) {
            tasks.push(
                Conversation.find({
                    participants: userId,
                    $or: [{ name: rx }, { description: rx }],
                }).select("name avatar type participants").limit(12).lean().then((rows) => {
                    result.conversations = rows;
                })
            );
        }

        if (!type || type === "all" || type === "messages") {
            const messageQuery: any = {
                conversationId: { $in: convIds },
                isDeleted: { $ne: true },
                isViewOnce: { $ne: true },
                ...notExpired,
                ...createdFilter,
            };
            if (rx) messageQuery.content = rx;
            tasks.push(
                Message.find(messageQuery)
                    .sort({ createdAt: -1 })
                    .limit(30)
                    .populate("senderId", "name avatar")
                    .populate("conversationId", "name type")
                    .lean()
                    .then((rows) => { result.messages = rows; })
            );
        }

        if (!type || type === "all" || type === "media") {
            tasks.push(
                Message.find({
                    conversationId: { $in: convIds },
                    isDeleted: { $ne: true },
                    isViewOnce: { $ne: true },
                    type: { $in: ["image", "video"] },
                    ...notExpired,
                    ...createdFilter,
                }).sort({ createdAt: -1 }).limit(24).lean().then((rows) => {
                    result.media = rows;
                })
            );
        }

        if (!type || type === "all" || type === "files") {
            const fileQuery: any = {
                conversationId: { $in: convIds },
                isDeleted: { $ne: true },
                isViewOnce: { $ne: true },
                type: "file",
                ...notExpired,
                ...createdFilter,
            };
            if (rx) fileQuery["attachmentMeta.name"] = rx;
            tasks.push(
                Message.find(fileQuery).sort({ createdAt: -1 }).limit(24).lean().then((rows) => {
                    result.files = rows;
                })
            );
        }

        if (!type || type === "all" || type === "links") {
            const urlPattern = /(https?:\/\/[^\s]+)/i;
            const linkQuery: any = {
                conversationId: { $in: convIds },
                isDeleted: { $ne: true },
                isViewOnce: { $ne: true },
                ...createdFilter,
            };
            if (rx) {
                linkQuery.$and = [notExpired, { content: urlPattern }, { content: rx }];
            } else {
                linkQuery.$and = [notExpired, { content: urlPattern }];
            }
            tasks.push(
                Message.find(linkQuery).sort({ createdAt: -1 }).limit(20).lean().then((rows) => {
                    result.links = rows;
                })
            );
        }

        await Promise.all(tasks);

        res.json({ success: true, data: result });
    } catch (error) {
        console.log("search error", error);
        res.status(500).json({ success: false, msg: "Search failed" });
    }
}

export async function translateText(req: AuthRequest, res: Response) {
    try {
        const { text, targetLang, sourceLang } = (req.body ?? {}) as {
            text?: string;
            targetLang?: string;
            sourceLang?: string;
        };
        const safeTargetLang = typeof targetLang === "string" ? targetLang.trim() : "";
        const safeText = typeof text === "string" ? text.trim().slice(0, 500) : "";

        if (!safeText || !safeTargetLang) {
            res.status(400).json({ success: false, msg: "text and targetLang are required" });
            return;
        }

        // Validate target language format (e.g. "es", "en", "pt-BR")
        if (!/^[a-zA-Z]{2,5}(-[a-zA-Z0-9]{2,5})?$/.test(safeTargetLang)) {
            res.status(400).json({ success: false, msg: "Invalid target language format" });
            return;
        }

        const cleanSourceLang =
            typeof sourceLang === "string" && /^[a-zA-Z]{2,5}(-[a-zA-Z0-9]{2,5})?$/.test(sourceLang.trim())
                ? sourceLang.trim()
                : safeTargetLang.toLowerCase() === "en"
                ? "es"
                : "en";

        if (cleanSourceLang.toLowerCase() === safeTargetLang.toLowerCase()) {
            res.json({ success: true, data: { translatedText: safeText, cached: false } });
            return;
        }

        const hash = crypto.createHash("sha256").update(`${safeText}::${cleanSourceLang}::${safeTargetLang}`).digest("hex");
        const cached = await TranslationCache.findOne({ sourceHash: hash, targetLang: { $eq: safeTargetLang } }).lean();
        if (cached) {
            res.json({ success: true, data: { translatedText: cached.translatedText, cached: true } });
            return;
        }

        const langPair = `${encodeURIComponent(cleanSourceLang)}|${encodeURIComponent(safeTargetLang)}`;
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(safeText)}&langpair=${langPair}`;
        
        // Use timeout to prevent hanging on external API
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        let response: any;
        try {
            response = await fetch(url, { signal: controller.signal });
        } finally {
            clearTimeout(timeoutId);
        }

        if (!response.ok) throw new Error("Translation service unavailable");
        const json: any = await response.json();
        if (json?.responseStatus && Number(json.responseStatus) !== 200) {
            throw new Error(json?.responseDetails || "Translation service rejected language pair");
        }
        const translatedText = json?.responseData?.translatedText;
        if (!translatedText || typeof translatedText !== "string") throw new Error("Could not translate");

        await TranslationCache.findOneAndUpdate(
            { sourceHash: hash, targetLang: safeTargetLang },
            {
                $setOnInsert: {
                    sourceHash: hash,
                    targetLang: safeTargetLang,
                    sourceText: safeText,
                    translatedText,
                },
            },
            { upsert: true, new: true }
        );

        res.json({ success: true, data: { translatedText, cached: false } });
    } catch (error: any) {
        console.error("translateText error:", error?.message || error);
        res.status(500).json({ success: false, msg: error.name === "AbortError" ? "Translation request timed out" : (error.message || "Translation failed") });
    }
}
