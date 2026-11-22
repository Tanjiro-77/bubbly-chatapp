import ScheduledMessage from "../modals/ScheduledMessage";
import { createAndBroadcastMessage } from "./messageService";

let started = false;

export function startScheduledMessageWorker() {
    if (started) return;
    started = true;

    const tick = async () => {
        try {
            const due = await ScheduledMessage.find({
                status: "pending",
                sendAt: { $lte: new Date() },
            }).limit(25);

            for (const item of due) {
                try {
                    item.status = "sent";
                    const payload = await createAndBroadcastMessage({
                        conversationId: item.conversationId.toString(),
                        senderId: item.senderId.toString(),
                        content: item.content,
                        type: item.type || "text",
                        attachement: item.attachement,
                        attachmentMeta: item.attachmentMeta,
                        location: item.location,
                        voiceUrl: item.voiceUrl,
                        voiceDuration: item.voiceDuration ?? undefined,
                    });
                    item.sentMessageId = payload.id;
                    await item.save();
                } catch (error: any) {
                    item.status = "failed";
                    item.error = error.message || "Failed to send";
                    await item.save();
                }
            }
        } catch (error) {
            console.log("scheduled worker error:", error);
        }
    };

    tick();
    setInterval(tick, 15_000);
}
