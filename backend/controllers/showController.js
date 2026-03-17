import axios from "axios";
import db from "../db.js";

async function getNearbyShows(req, res) {
  const { lat, lng, radius = 50 } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: "lat and lng are required" });
  }

  try {
    // Get user's followed artists
    const { rows: follows } = await db.query(
      "SELECT artist_name FROM follows WHERE user_id = $1",
      [req.userId]
    );

    if (follows.length === 0) {
      return res.json([]);
    }

    const artistNames = follows.map((f) => f.artist_name);
    const allShows = [];

    // Fetch shows for each followed artist from Ticketmaster
    for (const name of artistNames) {
      try {
        const { data } = await axios.get(
          "https://app.ticketmaster.com/discovery/v2/events.json",
          {
            params: {
              keyword: name,
              apikey: process.env.TICKETMASTER_API_KEY,
              latlong: `${lat},${lng}`,
              radius,
              unit: "miles",
              sort: "date,asc",
              size: 5,
            },
          }
        );

        const events = data._embedded?.events || [];

        events.forEach((event) => {
          allShows.push({
            id: event.id,
            name: event.name,
            artist: name,
            date: event._dates?.start?.localDate,
            time: event._dates?.start?.localTime,
            venue: event._embedded?.venues?.[0]?.name,
            city: event._embedded?.venues?.[0]?.city?.name,
            state: event._embedded?.venues?.[0]?.state?.stateCode,
            ticketUrl: event.url,
            imageUrl: event.images?.[0]?.url,
          });
        });
      } catch (err) {
        console.error(`Ticketmaster error for ${name}:`, err.message);
      }
    }

    // Sort all shows by date
    allShows.sort((a, b) => new Date(a.date) - new Date(b.date));

    return res.json(allShows);
  } catch (err) {
    console.error("Get shows error:", err.message);
    return res.status(500).json({ error: "Failed to fetch shows" });
  }
}

export { getNearbyShows };