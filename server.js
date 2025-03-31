import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import setupAuth from "./auth.js";
import routes from "./routes.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: "https://mindmetricss.netlify.app", credentials: true }));
app.use(express.json());

// Setup Authentication
setupAuth(app);
app.use("/", routes);

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));