import express from "express";
import { spotifyCallback, registerPushToken, login } from "../controllers/authController.js";

const router = express.Router();

// Spotify redirects here after OAuth completes
router.get("/callback", spotifyCallback);

// Called when the user clicks the "Login with Spotify" button in the app
router.get("/login", login);

// Save Expo push token for notifications
router.post("/push-token", registerPushToken);

export default router;