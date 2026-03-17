const axios = require("axios");

const TM_BASE = "https://app.ticketmaster.com/discovery/v2";

async function getEventsByArtist(artistName, lat, lng, radius = 50) {
  const { data } = await axios.get(`${TM_BASE}/events.json`, {
    params: {
      keyword: artistName,
      apikey: process.env.TICKETMASTER_API_KEY,
      latlong: `${lat},${lng}`,
      radius,
      unit: "miles",
      sort: "date,asc",
      size: 5,
    },
  });

  const events = data._embedded?.events || [];

  return events.map((event) => ({
    id: event.id,
    name: event.name,
    date: event.dates?.start?.localDate,
    time: event.dates?.start?.localTime,
    venue: event._embedded?.venues?.[0]?.name,
    city: event._embedded?.venues?.[0]?.city?.name,
    state: event._embedded?.venues?.[0]?.state?.stateCode,
    ticketUrl: event.url,
    imageUrl: event.images?.[0]?.url,
  }));
}

module.exports = { getEventsByArtist };