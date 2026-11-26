import ScheduledMessage from "../modals/ScheduledMessage";
import { createAndBroadcastMessage } from "./messageService";
import { getIO, userRoom } from "../socket/io";

let started = false;
let isRunning = false;

export function startScheduledMessageWorker() {
    if (started) return;
    started = true;

    const reclaimStale = () =>
        ScheduledMessage.updateMany(
            { status: "processing", updatedAt: { $lte: new Date(Date.now() - 5 * 60 * 1000) } },
            { $set: { status: "pending" } }
        ).catch((err) => console.error("Error reclaiming stale scheduled messages:", err));

    const tick = async () => {
        if (isRunning) return;
        isRunning = true;
        try {
            await reclaimStale();
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

                let payload: any;
                try {
                    payload = await createAndBroadcastMessage({
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
                } catch (error: any) {
                    lockedItem.status = "failed";
                    lockedItem.error = error.message || "Failed to send";
                    await lockedItem.save().catch(() => {});
                    continue;
                }

                try {
                    lockedItem.status = "sent";
                    lockedItem.sentMessageId = payload.id;
                    await lockedItem.save();
                    try {
                        getIO().to(userRoom(lockedItem.senderId.toString())).emit("scheduledMessageSent", {
                            id: lockedItem._id.toString(),
                            conversationId: lockedItem.conversationId.toString(),
                            sentMessageId: payload.id,
                        });
                    } catch {
                        // IO may not be initialized in unit test contexts
                    }
                } catch (saveErr) {
                    console.error("Failed to mark scheduled message sent:", saveErr);
                }
            }
        } catch (error) {
            console.log("scheduled worker error:", error);
        } finally {
            isRunning = false;
        }
    };

    tick();
    setInterval(tick, 15_000);
}
