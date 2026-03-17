import cron from "node-cron";
import axios from "axios";
import { Expo } from "expo-server-sdk";
import db from "../db.js";

const expo = new Expo();

async function checkNewShows() {
  console.log("Checking for new tour dates...");

  // Get all followed artists with user push tokens
  const { rows: follows } = await db.query(`
    SELECT f.user_id, f.artist_spotify_id, f.artist_name, u.push_token
    FROM follows f
    JOIN users u ON u.id = f.user_id
    WHERE u.push_token IS NOT NULL
  `);

  for (const follow of follows) {
    try {
      // Check Ticketmaster for new events
      const { data } = await axios.get("https://app.ticketmaster.com/discovery/v2/events.json", {
        params: {
          keyword: follow.artist_name,
          apikey: process.env.TICKETMASTER_API_KEY,
          sort: "date,asc",
        },
      });

      const events = data._embedded?.events || [];

      for (const event of events) {
        // Check if we've already notified about this event
        const { rows } = await db.query(
          "SELECT id FROM notified_events WHERE user_id = $1 AND event_id = $2",
          [follow.user_id, event.id]
        );

        if (rows.length === 0) {
          // Send push notification
          if (Expo.isExpoPushToken(follow.push_token)) {
            await expo.sendPushNotificationsAsync([{
              to: follow.push_token,
              title: "🎵 New Show Alert!",
              body: `${follow.artist_name} is coming to ${event._embedded?.venues?.[0]?.city?.name}!`,
              data: { eventId: event.id },
            }]);
          }

          // Mark as notified
          await db.query(
            "INSERT INTO notified_events (user_id, event_id) VALUES ($1, $2)",
            [follow.user_id, event.id]
          );
        }
      }
    } catch (err) {
      console.error(`Error checking shows for ${follow.artist_name}:`, err.message);
    }
  }
}

function startCronJobs() {
  // Run every day at 9am
  cron.schedule("0 9 * * *", checkNewShows);
  console.log("Tour checker cron job started");
}

export { startCronJobs };