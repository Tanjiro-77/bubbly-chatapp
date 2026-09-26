import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db";
import authRoutes from "./routes/auth.routes";
import appRoutes from "./routes/app.routes";
import dns from "dns";
import { intializeSocket } from "./socket/socket";
import { startScheduledMessageWorker } from "./services/scheduledWorker";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

dotenv.config();

const app = express();

app.use(express.json({ limit: "2mb" }));
app.use(cors());

app.use("/auth", authRoutes);
app.use("/api", appRoutes);

app.get("/", (req, res) => {
    res.send("Server is running");
});

const PORT = Number(process.env.PORT) || 3000;

const server = http.createServer(app);

intializeSocket(server);

connectDB().then(() => {
    console.log("Database Connected");
    startScheduledMessageWorker();
    server.listen(PORT, "0.0.0.0", () => {
        console.log("Server is running on port ", PORT);
    });
}).catch((error) => {
    console.log("Failed to start server due to databas connection error: ", error);
});
