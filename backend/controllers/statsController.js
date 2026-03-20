import axios from "axios";
import db from "../db.js";

import { refreshAccessToken } from "../utils/spotify.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));


// shared — used by route and cron
export async function syncUserPlays(userId, access_token) {
  const lastPlay = await db.query(
    "SELECT MAX(played_at) as last FROM plays WHERE user_id = $1",
    [userId]
  );

  const after = lastPlay.rows[0].last
    ? new Date(lastPlay.rows[0].last).getTime()
    : null;

  const url = new URL("https://api.spotify.com/v1/me/player/recently-played");
  url.searchParams.set("limit", "50");
  if (after) url.searchParams.set("after", after);

  const spotifyRes = await axios.get(url.toString(), {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  const items = spotifyRes.data.items;

  for (const item of items) {
    await db.query(
      `INSERT INTO plays (user_id, track_id, track_name, artist_name, duration_ms, played_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, played_at) DO NOTHING`,
      [
        userId,
        item.track.id,
        item.track.name,
        item.track.artists[0].name,
        item.track.duration_ms,
        new Date(item.played_at),
      ]
    );
  }

  return items.length;
}

// route handler
async function syncRecentlyPlayed(req, res) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const user = await db.query(
      "SELECT refresh_token FROM users WHERE id = $1",
      [req.session.userId]
    );

    const access_token = await refreshAccessToken(user.rows[0].refresh_token);
    req.session.access_token = access_token;

    const synced = await syncUserPlays(req.session.userId, access_token);
    return res.json({ synced });
  } catch (err) {
    console.error("Sync error:", err.message);
    return res.status(500).json({ error: "Sync failed" });
  }
}

async function getStats(req, res) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const { rows } = await db.query(
      `SELECT
          COUNT(*) as total_songs,
          SUM(duration_ms) / 60000 as total_minutes,
          MAX(played_at) as last_played,
          (SELECT artist_name FROM plays
            WHERE user_id = $1
            AND played_at >= date_trunc('week', NOW())
            GROUP BY artist_name
            ORDER BY COUNT(*) DESC
            LIMIT 1) as top_artist
         FROM plays
         WHERE user_id = $1
         AND played_at >= date_trunc('week', NOW())`,
      [req.session.userId]
    );

    return res.json(rows[0]);
  } catch (err) {
    console.error("Stats error:", err.message);
    return res.status(500).json({ error: "Failed to fetch stats" });
  }
}

async function getLeaderboard(req, res) {
  try {
    const { rows } = await db.query(
      `SELECT
          u.id,
          u.display_name,
          u.avatar_url,
          COUNT(p.id) as total_songs,
          SUM(p.duration_ms) / 60000 as total_minutes,
          (SELECT p2.artist_name FROM plays p2
            WHERE p2.user_id = u.id
            AND p2.played_at >= date_trunc('week', NOW())
            GROUP BY p2.artist_name
            ORDER BY COUNT(*) DESC
            LIMIT 1) as top_artist
         FROM users u
         LEFT JOIN plays p ON p.user_id = u.id
           AND p.played_at >= date_trunc('week', NOW())
         GROUP BY u.id
         ORDER BY total_minutes DESC`,
    );

    return res.json(rows);
  } catch (err) {
    console.error("Leaderboard error:", err.message);
    return res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
}

async function getUserProfile(req, res) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const targetId = req.params.userId;
  if (!targetId || typeof targetId !== "string") {
    return res.status(400).json({ error: "Invalid user ID" });
  }

  try {
    const [userRes, statsRes, artistsRes, songsRes, lastPlayedRes, rankRes] =
      await Promise.all([
        db.query(
          `SELECT id, display_name, avatar_url FROM users WHERE id = $1`,
          [targetId]
        ),
        db.query(
          `SELECT
              COUNT(*) as total_songs,
              COALESCE(SUM(duration_ms) / 60000, 0) as total_minutes,
              MAX(played_at) as last_played
             FROM plays
             WHERE user_id = $1
             AND played_at >= date_trunc('week', NOW())`,
          [targetId]
        ),
        db.query(
          `SELECT artist_name, COUNT(*) as play_count
             FROM plays
             WHERE user_id = $1
             AND played_at >= date_trunc('week', NOW())
             GROUP BY artist_name
             ORDER BY play_count DESC
             LIMIT 10`,
          [targetId]
        ),
        db.query(
          `SELECT track_name, artist_name, MAX(track_id) as track_id, COUNT(*) as play_count
             FROM plays
             WHERE user_id = $1
             AND played_at >= date_trunc('week', NOW())
             GROUP BY track_name, artist_name
             ORDER BY play_count DESC
             LIMIT 50`,
          [targetId]
        ),
        db.query(
          `SELECT track_name, artist_name, track_id, played_at
             FROM plays
             WHERE user_id = $1
             ORDER BY played_at DESC
             LIMIT 1`,
          [targetId]
        ),
        db.query(
          `SELECT COUNT(*) + 1 AS rank
             FROM (
               SELECT u.id, COALESCE(SUM(p.duration_ms), 0) AS ms
               FROM users u
               LEFT JOIN plays p ON p.user_id = u.id
                 AND p.played_at >= date_trunc('week', NOW())
               GROUP BY u.id
             ) ranked
             WHERE ms > (
               SELECT COALESCE(SUM(duration_ms), 0)
               FROM plays
               WHERE user_id = $1
               AND played_at >= date_trunc('week', NOW())
             )`,
          [targetId]
        ),
      ]);

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    let topSongs = songsRes.rows;
    let topArtists = artistsRes.rows;
    let lastSong = lastPlayedRes.rows[0] ?? null;

    try {
      let userToken = req.session.access_token;
      if (!userToken) {
        const userRow = await db.query(
          "SELECT refresh_token FROM users WHERE id = $1",
          [req.session.userId]
        );
        userToken = await refreshAccessToken(userRow.rows[0].refresh_token);
        req.session.access_token = userToken;
      }

      const trackIds = [
        ...new Set(
          [...topSongs.map((s) => s.track_id), lastSong?.track_id].filter(Boolean)
        ),
      ].slice(0, 50);

      if (trackIds.length > 0) {
        const albumMap = {};
        const artistIdMap = {};

        // check cache for tracks
        const cachedTracksRes = await db.query(
          `SELECT spotify_id, image_url, artist_id FROM spotify_image_cache WHERE spotify_id = ANY($1)`,
          [trackIds]
        );
        const cachedTrackIds = new Set();
        for (const row of cachedTracksRes.rows) {
          cachedTrackIds.add(row.spotify_id);
          albumMap[row.spotify_id] = row.image_url;
          if (row.artist_id) {
            const song =
              topSongs.find((s) => s.track_id === row.spotify_id) ??
              (lastSong?.track_id === row.spotify_id ? lastSong : null);
            if (song) artistIdMap[song.artist_name] = row.artist_id;
          }
        }
        console.log(`Track cache: ${cachedTrackIds.size} hits, ${trackIds.length - cachedTrackIds.size} misses`);

        // fetch uncached tracks from Spotify
        const uncachedTrackIds = trackIds.filter((id) => !cachedTrackIds.has(id));
        for (const id of uncachedTrackIds) {
          const track = await axios
            .get(`https://api.spotify.com/v1/tracks/${id}`, {
              headers: { Authorization: `Bearer ${userToken}` },
            })
            .then((r) => r.data)
            .catch((err) => {
              const retryAfter = err.response?.headers?.["retry-after"];
              console.error(`Track ${id} failed:`, err.response?.status, `retry after: ${retryAfter}s`);
              return null;
            });

          if (track) {
            const imgs = track.album?.images ?? [];
            const imageUrl = imgs[imgs.length - 1]?.url ?? null;
            const artistId = track.artists?.[0]?.id ?? null;
            const artistName = track.artists?.[0]?.name;

            albumMap[track.id] = imageUrl;
            if (artistName && artistId) artistIdMap[artistName] = artistId;

            await db.query(
              `INSERT INTO spotify_image_cache (spotify_id, image_url, artist_id)
               VALUES ($1, $2, $3)
               ON CONFLICT (spotify_id) DO UPDATE SET image_url = $2, artist_id = $3, cached_at = NOW()`,
              [track.id, imageUrl, artistId]
            );
          }
          await sleep(500);
        }

        topSongs = topSongs.map((s) => ({
          ...s,
          image_url: albumMap[s.track_id] ?? null,
        }));

        if (lastSong?.track_id) {
          lastSong = {
            ...lastSong,
            image_url: albumMap[lastSong.track_id] ?? null,
          };
        }

        // fetch artists
        const artistIds = topArtists
          .map((a) => artistIdMap[a.artist_name])
          .filter(Boolean);

        if (artistIds.length > 0) {
          const artistImgMap = {};

          // check cache for artists
          const cachedArtistsRes = await db.query(
            `SELECT spotify_id, image_url FROM spotify_image_cache WHERE spotify_id = ANY($1)`,
            [artistIds]
          );
          const cachedArtistIds = new Set();
          for (const row of cachedArtistsRes.rows) {
            cachedArtistIds.add(row.spotify_id);
            artistImgMap[row.spotify_id] = row.image_url;
          }
          console.log(`Artist cache: ${cachedArtistIds.size} hits, ${artistIds.length - cachedArtistIds.size} misses`);

          // fetch uncached artists from Spotify
          const uncachedArtistIds = artistIds.filter((id) => !cachedArtistIds.has(id));
          for (const id of uncachedArtistIds) {
            const artist = await axios
              .get(`https://api.spotify.com/v1/artists/${id}`, {
                headers: { Authorization: `Bearer ${userToken}` },
              })
              .then((r) => r.data)
              .catch((err) => {
                console.error(`Artist ${id} failed:`, err.response?.status);
                return null;
              });

            if (artist) {
              const imgs = artist.images ?? [];
              const imageUrl = imgs[imgs.length - 1]?.url ?? null;
              artistImgMap[artist.id] = imageUrl;

              await db.query(
                `INSERT INTO spotify_image_cache (spotify_id, image_url)
                 VALUES ($1, $2)
                 ON CONFLICT (spotify_id) DO UPDATE SET image_url = $2, cached_at = NOW()`,
                [artist.id, imageUrl]
              );
            }
            await sleep(500);
          }

          topArtists = topArtists.map((a) => ({
            ...a,
            image_url: artistImgMap[artistIdMap[a.artist_name]] ?? null,
          }));
        }
      }
    } catch (spotifyErr) {
      console.error("Spotify image fetch error:", spotifyErr.message);
    }

    return res.json({
      user: userRes.rows[0],
      stats: statsRes.rows[0],
      rank: Number(rankRes.rows[0].rank),
      top_artists: topArtists,
      top_songs: topSongs,
      last_played_song: lastSong,
    });
  } catch (err) {
    console.error("getUserProfile error:", err.message);
    return res.status(500).json({ error: "Failed to fetch user profile" });
  }
}

async function getUserTopRange(req, res) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const rangeMap = {
    '4weeks': "short_term",
    '6months': "medium_term",
    '1year': "long_term",
  };
  const spotifyRange = rangeMap[req.params.range];

  if (!spotifyRange) {
    return res.status(400).json({ error: "Invalid range" });
  }

  try {
    let userToken = req.session.access_token;
    if (!userToken) {
      const userRow = await db.query(
        "SELECT refresh_token FROM users WHERE id = $1",
        [req.session.userId]
      );
      userToken = await refreshAccessToken(userRow.rows[0].refresh_token);
      req.session.access_token = userToken;
    }

    const spotifyRes = await axios.get(
      `https://api.spotify.com/v1/me/top/tracks?time_range=${spotifyRange}&limit=50`,
      { headers: { Authorization: `Bearer ${userToken}` } }
    );

    const items = spotifyRes.data.items;
    return res.json(items);
  } catch (err) {
    console.error("getUserTopRange error:", err.message);
    return res.status(500).json({ error: "Failed to fetch user top range" });
  }
}

export { syncRecentlyPlayed, getStats, getLeaderboard, getUserProfile, getUserTopRange };