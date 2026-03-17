import express from "express";
import { spotifyCallback, registerPushToken } from "../controllers/authController.js";

const router = express.Router();

// Called after Spotify OAuth completes in the app
router.post("/spotify", spotifyCallback);

// Save Expo push token for notifications
router.post("/push-token", registerPushToken);

export default router;