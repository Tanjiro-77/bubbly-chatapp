import { Socket, Server as SocketIOServer } from "socket.io";
import User from "../modals/User";
import { generateToken } from "../utils/token";

export function registerUserEvents(io: SocketIOServer, socket: Socket) {
    socket.on('testSocket', (data) => {
        socket.emit('testSocket', { msg: "its working!!!" });
    });

    socket.on("updateProfile", async (data: { name?: string; avatar?: string }) => {
        console.log('updateprofile event:', data);

        const userId = socket.data.userId;
        if (!userId) {
            return socket.emit('updateProfile', {
                success: false, msg: "Unathorized"
            })
        }

        try {
            const updatedUser = await User.findByIdAndUpdate(userId, { name: data.name, avatar: data.avatar }, { new: true })

            if (!updatedUser) {
                return socket.emit('updateProfile', {
                    success: false, msg: "User not found"
                })
            }

            // gen token with updated value
            const newToken = generateToken(updatedUser);

            socket.emit('updateProfile', {
                success: true,
                data: { token: newToken },
                msg: "Profile updated successfully"
            })

        } catch (error) {
            console.log("Error updating profile:", error);
            socket.emit('updateProfile', {
                success: false, msg: "Error updating profile"
            })
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

            const user = await User.find(
                { _id: { $ne: currentUserId } },
                { password: 0 }
            ).lean();

            const contacts = user.map((user) => ({
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                avatar: user.avatar || "",
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
