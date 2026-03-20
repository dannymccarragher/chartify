import express from "express";
import { getStats, getLeaderboard, syncRecentlyPlayed, getUserProfile, getUserTopRange } from "../controllers/statsController.js";
const router = express.Router();


router.get("/sync", syncRecentlyPlayed);
router.get("/stats", getStats);
router.get("/leaderboard", getLeaderboard);
router.get("/user/top/:range", getUserTopRange);
router.get("/user/:userId", getUserProfile);

export default router;
