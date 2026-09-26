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
        const q = String(req.query.q || "").trim();
        const type = String(req.query.type || "all");
        const from = req.query.from ? new Date(String(req.query.from)) : null;
        const to = req.query.to ? new Date(String(req.query.to)) : null;

        if (q.length < 2 && type === "all") {
            res.json({ success: true, data: { users: [], conversations: [], messages: [], media: [], files: [], links: [] } });
            return;
        }

        const myConversations = await Conversation.find({ participants: userId }).select("_id type name").lean();
        const convIds = myConversations.map((c) => c._id);
        const rx = q ? new RegExp(escapeRegex(q), "i") : null;

        const dateFilter: any = {};
        if (from && !Number.isNaN(from.getTime())) dateFilter.$gte = from;
        if (to && !Number.isNaN(to.getTime())) dateFilter.$lte = to;
        const createdFilter = Object.keys(dateFilter).length ? { createdAt: dateFilter } : {};

        const result: any = { users: [], conversations: [], messages: [], media: [], files: [], links: [] };

        if ((!type || type === "all" || type === "users") && rx) {
            result.users = await User.find({
                _id: { $ne: userId },
                $or: [{ name: rx }, { email: rx }],
            }).select("name email avatar").limit(12).lean();
        }

        if ((!type || type === "all" || type === "conversations") && rx) {
            result.conversations = await Conversation.find({
                participants: userId,
                $or: [{ name: rx }, { description: rx }],
            }).select("name avatar type participants").limit(12).lean();
        }

        if (!type || type === "all" || type === "messages") {
            const messageQuery: any = {
                conversationId: { $in: convIds },
                isDeleted: { $ne: true },
                ...createdFilter,
            };
            if (rx) messageQuery.content = rx;
            result.messages = await Message.find(messageQuery)
                .sort({ createdAt: -1 })
                .limit(30)
                .populate("senderId", "name avatar")
                .populate("conversationId", "name type")
                .lean();
        }

        if (!type || type === "all" || type === "media") {
            result.media = await Message.find({
                conversationId: { $in: convIds },
                isDeleted: { $ne: true },
                type: { $in: ["image", "video"] },
                ...createdFilter,
            }).sort({ createdAt: -1 }).limit(24).lean();
        }

        if (!type || type === "all" || type === "files") {
            const fileQuery: any = {
                conversationId: { $in: convIds },
                isDeleted: { $ne: true },
                type: "file",
                ...createdFilter,
            };
            if (rx) fileQuery["attachmentMeta.name"] = rx;
            result.files = await Message.find(fileQuery).sort({ createdAt: -1 }).limit(24).lean();
        }

        if (!type || type === "all" || type === "links") {
            const linkRx = q ? rx : /(https?:\/\/[^\s]+)/i;
            result.links = await Message.find({
                conversationId: { $in: convIds },
                isDeleted: { $ne: true },
                content: linkRx,
                ...createdFilter,
            }).sort({ createdAt: -1 }).limit(20).lean();
        }

        res.json({ success: true, data: result });
    } catch (error) {
        console.log("search error", error);
        res.status(500).json({ success: false, msg: "Search failed" });
    }
}

export async function translateText(req: AuthRequest, res: Response) {
    try {
        const { text, targetLang } = req.body as { text?: string; targetLang?: string };
        if (!text?.trim() || !targetLang) {
            res.status(400).json({ success: false, msg: "text and targetLang are required" });
            return;
        }
        const hash = crypto.createHash("sha256").update(`${text}::${targetLang}`).digest("hex");
        const cached = await TranslationCache.findOne({ sourceHash: hash, targetLang }).lean();
        if (cached) {
            res.json({ success: true, data: { translatedText: cached.translatedText, cached: true } });
            return;
        }

        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0, 500))}&langpair=autodetect|${encodeURIComponent(targetLang)}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Translation service unavailable");
        const json: any = await response.json();
        const translatedText = json?.responseData?.translatedText;
        if (!translatedText) throw new Error("Could not translate");

        await TranslationCache.create({
            sourceHash: hash,
            targetLang,
            sourceText: text.slice(0, 500),
            translatedText,
        });

        res.json({ success: true, data: { translatedText, cached: false } });
    } catch (error: any) {
        res.status(500).json({ success: false, msg: error.message || "Translation failed" });
    }
}
