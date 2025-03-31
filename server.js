import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import setupAuth from "./auth.js";
import routes from "./routes.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

// Setup Authentication
setupAuth(app);

// Use API Routes
app.use("/", routes);

// Serve React build folder


// Start Server
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
