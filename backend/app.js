import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import artistRoutes from "./routes/artists.js";
import showRoutes from "./routes/shows.js";
import { startCronJobs } from "./jobs/tourChecker.js";
import db from "./db.js";

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use("/auth", authRoutes);
app.use("/artists", artistRoutes);
app.use("/shows", showRoutes);

// Start background jobs
startCronJobs();


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Tourly server running on port ${PORT}`));