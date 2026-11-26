import { Socket, Server as SocketIOServer } from "socket.io";
import User from "../modals/User";
import Conversation from "../modals/Conversation";
import { generateToken } from "../utils/token";

export function registerUserEvents(io: SocketIOServer, socket: Socket) {
    socket.on('testSocket', (data) => {
        socket.emit('testSocket', { msg: "its working!!!" });
    });

    socket.on("updateProfile", async (data: { name?: string; avatar?: string }) => {
        console.log('updateprofile event:', data);

        try {
            const userId = socket.data.userId;
            if (!userId) {
                return socket.emit('updateProfile', {
                    success: false, msg: "Unauthorized"
                });
            }

            if (!data || typeof data !== "object") {
                return socket.emit('updateProfile', {
                    success: false, msg: "Invalid profile data"
                });
            }

            const updateData: { name?: string; avatar?: string } = {};

            if (typeof data.name === "string") {
                const trimmedName = data.name.trim();
                if (!trimmedName || trimmedName.length > 70) {
                    return socket.emit('updateProfile', {
                        success: false, msg: "Name must be between 1 and 70 characters"
                    });
                }
                updateData.name = trimmedName;
            }

            if (typeof data.avatar === "string") {
                updateData.avatar = data.avatar.slice(0, 500);
            }

            const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });

            if (!updatedUser) {
                return socket.emit('updateProfile', {
                    success: false, msg: "User not found"
                });
            }

            // Update socket data
            if (updateData.name) socket.data.name = updateData.name;
            if (updateData.avatar !== undefined) socket.data.avatar = updateData.avatar;

            // Generate token with updated values
            const newToken = generateToken(updatedUser);

            socket.emit('updateProfile', {
                success: true,
                data: { token: newToken },
                msg: "Profile updated successfully"
            });

        } catch (error) {
            console.error("Error updating profile:", error);
            socket.emit('updateProfile', {
                success: false, msg: "Error updating profile"
            });
        }
    })

    socket.on("getContacts", async () => {
        try {
            const currentUserId = socket.data.userId;
            if (!currentUserId) {
                socket.emit("getContacts", {
                    success: false,
                    msg: "Unautorized",
                });
                return;
            }

            // WhatsApp-style Contact Privacy:
            // Only return users the requester already shares a conversation with
            // (never expose unrelated strangers who don't share a chat/synced number).
            const myConversations = await Conversation.find({
                participants: currentUserId,
            })
                .select("participants")
                .lean();

            const knownUserIds = new Set<string>();
            for (const conv of myConversations) {
                for (const p of conv.participants || []) {
                    const pStr = p.toString();
                    if (pStr !== currentUserId.toString()) {
                        knownUserIds.add(pStr);
                    }
                }
            }

            if (knownUserIds.size === 0) {
                socket.emit("getContacts", {
                    success: true,
                    data: [],
                });
                return;
            }

            const users = await User.find(
                { _id: { $in: Array.from(knownUserIds) } },
                { password: 0 }
            ).sort({ name: 1 }).lean();

            const contacts = users.map((u) => ({
                id: u._id.toString(),
                name: u.name,
                email: u.email || "",
                phoneNumber: u.phoneNumber || "",
                avatar: u.avatar || "",
            }));

            socket.emit("getContacts", {
                success: true,
                data: contacts,
            });

        } catch (error: any) {
            console.log("getContacts error:", error);
            socket.emit("getContacts", {
                success: false,
                msg: "Failed to fetch contact",
            });
        }
    })
}
