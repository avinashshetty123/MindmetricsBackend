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
app.get("/", (req, res) => {
    res.status(200).json({ message: "Welcome to the MindMetrics Backend!" });
  });
  
  app.get("/favicon.ico", (req, res) => {
    res.status(204).end(); // No Content
  });
  

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));