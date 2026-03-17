import express from "express";
import { getNearbyShows } from "../controllers/showController.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

router.use(authenticate);

// GET /shows?lat=47.6&lng=-122.3&radius=50
router.get("/", getNearbyShows);

export default router;