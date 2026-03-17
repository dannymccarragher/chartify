import axios from "axios";

const SPOTIFY_BASE = "https://api.spotify.com/v1";

function spotifyClient(accessToken) {
  return axios.create({
    baseURL: SPOTIFY_BASE,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

async function searchArtists(accessToken, query) {
  const client = spotifyClient(accessToken);
  const { data } = await client.get("/search", {
    params: { q: query, type: "artist", limit: 10 },
  });

  return data.artists.items.map((artist) => ({
    spotifyId: artist.id,
    name: artist.name,
    imageUrl: artist.images?.[0]?.url || null,
    genres: artist.genres,
    popularity: artist.popularity,
    followers: artist.followers.total,
  }));
}

async function getSpotifyUser(accessToken) {
  const client = spotifyClient(accessToken);
  const { data } = await client.get("/me");
  return data;
}

export { searchArtists, getSpotifyUser };