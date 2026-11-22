import ScheduledMessage from "../modals/ScheduledMessage";
import { createAndBroadcastMessage } from "./messageService";

let started = false;

export function startScheduledMessageWorker() {
    if (started) return;
    started = true;

    // Reclaim orphaned messages from earlier crashed process instances (older than 5 minutes)
    ScheduledMessage.updateMany(
        { status: "processing", updatedAt: { $lte: new Date(Date.now() - 5 * 60 * 1000) } },
        { $set: { status: "pending" } }
    ).catch((err) => console.error("Error reclaiming stale scheduled messages:", err));

    const tick = async () => {
        try {
            const due = await ScheduledMessage.find({
                status: "pending",
                sendAt: { $lte: new Date() },
            }).limit(25);

            for (const item of due) {
                // Atomically claim the message to prevent duplicate processing
                const lockedItem = await ScheduledMessage.findOneAndUpdate(
                    { _id: item._id, status: "pending" },
                    { $set: { status: "processing" } },
                    { new: true }
                );

                if (!lockedItem) continue;

                try {
                    const payload = await createAndBroadcastMessage({
                        conversationId: lockedItem.conversationId.toString(),
                        senderId: lockedItem.senderId.toString(),
                        content: lockedItem.content,
                        type: lockedItem.type || "text",
                        attachement: lockedItem.attachement,
                        attachmentMeta: lockedItem.attachmentMeta,
                        location: lockedItem.location,
                        voiceUrl: lockedItem.voiceUrl,
                        voiceDuration: lockedItem.voiceDuration ?? undefined,
                    });
                    lockedItem.status = "sent";
                    lockedItem.sentMessageId = payload.id;
                    await lockedItem.save();
                } catch (error: any) {
                    lockedItem.status = "failed";
                    lockedItem.error = error.message || "Failed to send";
                    await lockedItem.save();
                }
            }
        } catch (error) {
            console.log("scheduled worker error:", error);
        }
    };

    tick();
    setInterval(tick, 15_000);
}
