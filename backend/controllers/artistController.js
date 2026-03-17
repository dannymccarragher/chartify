import db from "../db.js";

async function getFollowedArtists(req, res) {
  try {
    const { rows } = await db.query(
      "SELECT * FROM follows WHERE user_id = $1 ORDER BY followed_at DESC",
      [req.userId]
    );
    return res.json(rows);
  } catch (err) {
    console.error("Get artists error:", err.message);
    return res.status(500).json({ error: "Failed to fetch artists" });
  }
}

async function followArtist(req, res) {
  const { spotifyId } = req.params;
  const { name, imageUrl } = req.body;

  try {
    await db.query(
      `INSERT INTO follows (user_id, artist_spotify_id, artist_name, artist_image_url)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, artist_spotify_id) DO NOTHING`,
      [req.userId, spotifyId, name, imageUrl]
    );
    return res.json({ success: true });
  } catch (err) {
    console.error("Follow error:", err.message);
    return res.status(500).json({ error: "Failed to follow artist" });
  }
}

async function unfollowArtist(req, res) {
  const { spotifyId } = req.params;

  try {
    await db.query(
      "DELETE FROM follows WHERE user_id = $1 AND artist_spotify_id = $2",
      [req.userId, spotifyId]
    );
    return res.json({ success: true });
  } catch (err) {
    console.error("Unfollow error:", err.message);
    return res.status(500).json({ error: "Failed to unfollow artist" });
  }
}

export { getFollowedArtists, followArtist, unfollowArtist };