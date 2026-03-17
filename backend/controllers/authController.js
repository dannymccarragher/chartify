import axios from "axios";
import jwt from "jsonwebtoken";
import db from "../db.js";

async function spotifyCallback(req, res) {
  const { code, redirectUri, codeVerifier } = req.body;

  console.log("code:", code);
  console.log("redirectUri:", redirectUri);
  console.log("codeVerifier:", codeVerifier);
  if (!code || !redirectUri) {
    return res.status(400).json({ error: "Missing code or redirectUri" });
  }

  try {
    // Exchange authorization code for access token using client secret (server-side)
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: process.env.SPOTIFY_CLIENT_ID,
      code_verifier: codeVerifier
    });


    const { data: tokenData } = await axios.post(
      "https://accounts.spotify.com/api/token",
      params.toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const spotifyAccessToken = tokenData.access_token;

    // Fetch Spotify user profile
    const { data: spotifyUser } = await axios.get("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${spotifyAccessToken}` },
    });

    // Upsert user in DB
    const { rows } = await db.query(
      `INSERT INTO users (spotify_id, display_name, email, avatar_url)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (spotify_id) DO UPDATE
       SET display_name = EXCLUDED.display_name,
           avatar_url = EXCLUDED.avatar_url
       RETURNING id`,
      [
        spotifyUser.id,
        spotifyUser.display_name,
        spotifyUser.email,
        spotifyUser.images?.[0]?.url || null,
      ]
    );

    const userId = rows[0].id;

    // Issue JWT
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "30d" });

    // Return JWT + Spotify token so the app can call Spotify directly (artist search)
    return res.json({ token, userId, spotifyAccessToken });
  } catch (err) {
    const spotifyError = err.response?.data;
    console.error("Spotify auth error:", spotifyError ?? err.message);
    return res.status(500).json({ error: "Auth failed", detail: spotifyError });
  }
}

async function registerPushToken(req, res) {
  const { pushToken } = req.body;

  try {
    await db.query("UPDATE users SET push_token = $1 WHERE id = $2", [
      pushToken,
      req.userId,
    ]);
    return res.json({ success: true });
  } catch (err) {
    console.error("Push token error:", err.message);
    return res.status(500).json({ error: "Failed to save push token" });
  }
}

export { spotifyCallback, registerPushToken };