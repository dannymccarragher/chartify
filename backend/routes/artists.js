import express from "express";
import { followArtist, unfollowArtist, getFollowedArtists } from "../controllers/artistController.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

router.use(authenticate);

router.get("/", getFollowedArtists);
router.post("/:spotifyId/follow", followArtist);
router.delete("/:spotifyId/unfollow", unfollowArtist);

export default router;