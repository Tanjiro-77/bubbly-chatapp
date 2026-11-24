import dotenv from "dotenv";
import path from "path";
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, ".env") });

import express from "express";
import http from "http";
import cors from "cors";
import dns from "dns";
import connectDB from "./config/db";
import authRoutes from "./routes/auth.routes";
import appRoutes from "./routes/app.routes";
import errorReportRoutes from "./routes/errorReport.routes";
import { intializeSocket } from "./socket/socket";
import { startScheduledMessageWorker } from "./services/scheduledWorker";

// Only override DNS servers if explicitly configured, preserving VPC/internal DNS by default
if (process.env.SET_PUBLIC_DNS === "true") {
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
}

const app = express();

// Security headers middleware
app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
});

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((s) => s.trim())
    : "*";

app.use(cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use("/auth", authRoutes);
app.use("/api", appRoutes);
app.use("/api/errors", errorReportRoutes);

app.get("/", (req, res) => {
    res.send("Server is running");
});

app.get("/health", (req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Express global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Unhandled request error:", err?.message || err);
    res.status(err.status || 500).json({
        success: false,
        msg: err.message || "Internal server error",
    });
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
    console.error("Failed to start server due to database connection error:", error);
});

// Graceful shutdown
const shutdown = () => {
    console.log("Shutting down gracefully...");
    server.close(() => {
        console.log("HTTP server closed.");
        process.exit(0);
    });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
