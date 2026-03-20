import axios from "axios";
import db from "../db.js";

async function login(req, res) {
  const state = crypto.randomUUID();

  const client_id = process.env.SPOTIFY_CLIENT_ID;
  const redirect_uri = process.env.SPOTIFY_REDIRECT_URI;
  const scope = process.env.SPOTIFY_SCOPE;

  return res.redirect(`https://accounts.spotify.com/authorize?${new URLSearchParams({
    response_type: 'code',
    client_id: client_id,
    scope: scope,
    redirect_uri: redirect_uri,
    state: state,
    // TODO: Remove this after testing
    show_dialog: true
  }).toString()}`);
}

async function spotifyCallback(req, res) {
  const code = req.query.code;
  const state = req.query.state;

  if (state === undefined) {
    return res.redirect(
      "/#" + new URLSearchParams({ error: "state_mismatch" }).toString()
    );
  }

  const client_id = process.env.SPOTIFY_CLIENT_ID;
  const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirect_uri = process.env.SPOTIFY_REDIRECT_URI;

  try {

    // Exchange auth code for access token and refresh token
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({
        code: code,
        redirect_uri: redirect_uri,
        grant_type: "authorization_code",
      }),
      {
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          Authorization:
            "Basic " +
            Buffer.from(client_id + ":" + client_secret).toString("base64"),
        },
      }
    );

    const { access_token, refresh_token } = response.data;

    // 2. Fetch Spotify profile
    const profileRes = await axios.get("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const { id, display_name, email, images } = profileRes.data;

    // Upsert user in DB
    const result = await db.query(
      `INSERT INTO users (spotify_id, display_name, email, avatar_url, refresh_token)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (spotify_id) DO UPDATE
       SET display_name = $2, email = $3, avatar_url = $4, refresh_token = $5
       RETURNING id`,
      [id, display_name, email, images?.[0]?.url ?? null, refresh_token]
    );

    const userId = result.rows[0].id;


    req.session.userId = userId;
    req.session.access_token = access_token;

    return res.redirect(
      "http://127.0.0.1:3000/#"
    );
  } catch (err) {
    console.error("Spotify callback error:", err.message);
    return res.redirect(
      "http://127.0.0.1:3000/#" + new URLSearchParams({ error: "invalid_token" }).toString()
    );
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

async function me(req, res){
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
}

try {
    const results = await db.query("SELECT * FROM users WHERE id = $1", [req.session.userId]);

    if(results.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json(results.rows[0]);

  } catch (err) {
    console.error("Me error:", err.message);
    return res.status(500).json({ error: "Failed to fetch user" });
  }
}

async function logout(req, res) {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Failed to logout" });
    }
    res.clearCookie("connect.sid");
    return res.json({ success: true });
  });
}

export { spotifyCallback, registerPushToken, login, me, logout };