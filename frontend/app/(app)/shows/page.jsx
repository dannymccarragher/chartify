"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { theme } from "@/constants/theme";
import { Guitar } from "lucide-react";

const API = "http://127.0.0.1:5000";

const GENRES = [
  { label: "All", id: null },
  { label: "Pop", id: "KnvZfZ7vAev" },
  { label: "Rock", id: "KnvZfZ7vAeA" },
  { label: "Hip-Hop", id: "KnvZfZ7vAeI" },
  { label: "R&B", id: "KnvZfZ7vAee" },
  { label: "Country", id: "KnvZfZ7vAv6" },
  { label: "Electronic", id: "KnvZfZ7vAvF" },
  { label: "Alternative", id: "KnvZfZ7vAvt" },
  { label: "Metal", id: "KnvZfZ7vAv7" },
];

function LocationIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return {
    month: date.toLocaleString("en-US", { month: "short" }).toUpperCase(),
    day: date.getDate(),
    full: date.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric" }),
  };
}

function formatTime(timeStr) {
  if (!timeStr) return null;
  const [h, min] = timeStr.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(min).padStart(2, "0")} ${ampm}`;
}

export default function ShowsPage() {
  const [mode, setMode] = useState("location"); // "location" | "city" | "artist"
  const [locationStatus, setLocationStatus] = useState("idle"); // idle | loading | granted | denied
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);

  const [cityInput, setCityInput] = useState("");
  const [submittedCity, setSubmittedCity] = useState("");

  const [artistInput, setArtistInput] = useState("");
  const [submittedArtist, setSubmittedArtist] = useState("");

  const [genreId, setGenreId] = useState(null);

  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const cityInputRef = useRef(null);
  const artistInputRef = useRef(null);

  const fetchShows = useCallback(async ({ lat, lng, city, keyword, genreId }) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (keyword) {
        params.set("keyword", keyword);
      } else if (city) {
        params.set("city", city);
      } else {
        params.set("lat", lat);
        params.set("lng", lng);
      }
      if (genreId) params.set("genreId", genreId);

      const res = await fetch(`${API}/shows?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch shows");
      const data = await res.json();
      setShows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  function requestLocation() {
    if (!navigator.geolocation) {
      setLocationStatus("denied");
      return;
    }
    setLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setLocationStatus("granted");
        fetchShows({ lat: pos.coords.latitude, lng: pos.coords.longitude, genreId });
      },
      () => setLocationStatus("denied")
    );
  }

  function submitCity(e) {
    e?.preventDefault();
    const trimmed = cityInput.trim();
    if (!trimmed) return;
    setSubmittedCity(trimmed);
    fetchShows({ city: trimmed, genreId });
  }

  function submitArtist(e) {
    e?.preventDefault();
    const trimmed = artistInput.trim();
    if (!trimmed) return;
    setSubmittedArtist(trimmed);
    fetchShows({ keyword: trimmed, genreId });
  }

  // Re-fetch when genre changes (if we already have a location, city, or artist)
  useEffect(() => {
    if (mode === "location" && locationStatus === "granted" && lat && lng) {
      fetchShows({ lat, lng, genreId });
    } else if (mode === "city" && submittedCity) {
      fetchShows({ city: submittedCity, genreId });
    } else if (mode === "artist" && submittedArtist) {
      fetchShows({ keyword: submittedArtist, genreId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genreId]);

  function switchMode(next) {
    setMode(next);
    setShows([]);
    setError(null);
    if (next === "city") setTimeout(() => cityInputRef.current?.focus(), 50);
    if (next === "artist") setTimeout(() => artistInputRef.current?.focus(), 50);
  }

  const followedCount = shows.filter((s) => s.followed).length;

  return (
    <div className="px-6 py-8" style={{ maxWidth: 820, margin: "0 auto" }}>
      {/* Header */}
      <div className="mb-6">
        <h1
          className="text-3xl font-bold mb-1"
          style={{ color: theme.text.primary, letterSpacing: "-0.5px" }}
        >
          Shows
        </h1>
        <p className="text-sm" style={{ color: theme.text.muted }}>
          Concerts for artists you follow, plus local discoveries
        </p>
      </div>

      {/* Mode toggle */}
      <div
        className="flex gap-1 p-1 rounded-xl mb-5 w-fit"
        style={{ background: theme.bg.elevated }}
      >
        {[
          { key: "location", label: "Near Me", icon: <LocationIcon /> },
          { key: "city", label: "By City", icon: <SearchIcon /> },
          { key: "artist", label: "By Artist", icon: <MicIcon /> },
        ].map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => switchMode(key)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium"
            style={{
              background: mode === key ? theme.bg.surface : "transparent",
              color: mode === key ? theme.text.primary : theme.text.muted,
              border: mode === key ? `1px solid ${theme.border.default}` : "1px solid transparent",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* City search input */}
      {mode === "city" && (
        <form onSubmit={submitCity} className="flex gap-2 mb-5">
          <input
            ref={cityInputRef}
            type="text"
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            placeholder="e.g. Nashville, Chicago, Los Angeles"
            className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
            style={{
              background: theme.bg.surface,
              border: `1px solid ${theme.border.default}`,
              color: theme.text.primary,
            }}
          />
          <button
            type="submit"
            disabled={!cityInput.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{
              background: theme.accent.green,
              color: "#000",
              border: "none",
              cursor: cityInput.trim() ? "pointer" : "not-allowed",
              opacity: cityInput.trim() ? 1 : 0.5,
              transition: "opacity 0.15s",
            }}
          >
            <SearchIcon />
            Search
          </button>
        </form>
      )}

      {/* Artist keyword search input */}
      {mode === "artist" && (
        <form onSubmit={submitArtist} className="flex gap-2 mb-5">
          <input
            ref={artistInputRef}
            type="text"
            value={artistInput}
            onChange={(e) => setArtistInput(e.target.value)}
            placeholder="e.g. Taylor Swift, Kendrick Lamar, Radiohead"
            className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
            style={{
              background: theme.bg.surface,
              border: `1px solid ${theme.border.default}`,
              color: theme.text.primary,
            }}
          />
          <button
            type="submit"
            disabled={!artistInput.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{
              background: theme.accent.purple,
              color: "#fff",
              border: "none",
              cursor: artistInput.trim() ? "pointer" : "not-allowed",
              opacity: artistInput.trim() ? 1 : 0.5,
              transition: "opacity 0.15s",
            }}
          >
            <MicIcon />
            Search
          </button>
        </form>
      )}

      {/* Location prompt */}
      {mode === "location" && locationStatus !== "granted" && (
        <div
          className="rounded-2xl p-10 text-center mb-5"
          style={{
            background: theme.bg.surface,
            border: `1px solid ${theme.border.subtle}`,
          }}
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: theme.bg.elevated, color: theme.accent.green }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold mb-2" style={{ color: theme.text.primary }}>
            Find shows near you
          </h2>
          <p className="text-sm mb-6 mx-auto" style={{ color: theme.text.muted, maxWidth: 360 }}>
            Share your location to discover upcoming concerts within 100 miles.
          </p>
          {locationStatus === "denied" ? (
            <p className="text-sm" style={{ color: theme.accent.purple }}>
              Location access was denied. Enable it in your browser settings and refresh.
            </p>
          ) : (
            <button
              onClick={requestLocation}
              disabled={locationStatus === "loading"}
              className="px-6 py-3 rounded-full font-semibold text-sm inline-flex items-center gap-2"
              style={{
                background: theme.accent.green,
                color: "#000",
                border: "none",
                cursor: locationStatus === "loading" ? "not-allowed" : "pointer",
                opacity: locationStatus === "loading" ? 0.6 : 1,
                transition: "opacity 0.15s",
              }}
            >
              <LocationIcon />
              {locationStatus === "loading" ? "Getting location…" : "Use my location"}
            </button>
          )}
        </div>
      )}

      {/* Genre filter — shown once we have a location, city, or artist */}
      {(locationStatus === "granted" || submittedCity || submittedArtist) && (
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <span className="text-xs font-medium" style={{ color: theme.text.muted }}>
            Genre:
          </span>
          {GENRES.map((g) => {
            const active = genreId === g.id;
            return (
              <button
                key={g.label}
                onClick={() => setGenreId(g.id)}
                className="px-3.5 py-1.5 rounded-full text-xs font-medium"
                style={{
                  background: active ? theme.accent.green : theme.bg.elevated,
                  color: active ? "#000" : theme.text.secondary,
                  border: `1px solid ${active ? "transparent" : theme.border.subtle}`,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {g.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="py-16 text-center">
          <p style={{ color: theme.text.muted }}>Finding shows…</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div
          className="rounded-xl px-4 py-3 mb-5 text-sm"
          style={{
            background: "rgba(162,89,255,0.08)",
            border: "1px solid rgba(162,89,255,0.2)",
            color: theme.accent.purple,
          }}
        >
          {error}
        </div>
      )}

      {/* Section header when we have results */}
      {!loading && shows.length > 0 && followedCount > 0 && (
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: theme.text.muted }}>
            {followedCount} from artists you follow · {shows.length - followedCount} more nearby
          </span>
        </div>
      )}

      {/* Shows list */}
      {!loading && shows.length > 0 && (
        <div className="flex flex-col gap-3">
          {shows.map((show, i) => {
            const date = formatDate(show.date);
            const time = formatTime(show.time);
            return (
              <div
                key={show.id ?? i}
                className="flex items-center gap-4 p-4 rounded-2xl"
                style={{
                  background: theme.bg.surface,
                  border: `1px solid ${show.followed ? "rgba(30,215,96,0.2)" : theme.border.subtle}`,
                  transition: "border-color 0.15s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.borderColor = show.followed
                    ? "rgba(30,215,96,0.4)"
                    : theme.border.default)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.borderColor = show.followed
                    ? "rgba(30,215,96,0.2)"
                    : theme.border.subtle)
                }
              >
                {/* Date block */}
                <div
                  className="flex-shrink-0 flex flex-col items-center justify-center rounded-xl"
                  style={{
                    background: theme.bg.elevated,
                    width: 52,
                    height: 56,
                    border: `1px solid ${theme.border.subtle}`,
                  }}
                >
                  {date ? (
                    <>
                      <span className="text-xs font-semibold" style={{ color: theme.accent.green }}>
                        {date.month}
                      </span>
                      <span className="text-xl font-bold leading-none" style={{ color: theme.text.primary }}>
                        {date.day}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs" style={{ color: theme.text.muted }}>TBD</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold truncate" style={{ color: theme.text.primary }}>
                      {show.name}
                    </p>
                    {show.followed && (
                      <span
                        className="flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          background: "rgba(30,215,96,0.12)",
                          color: theme.accent.green,
                          border: "1px solid rgba(30,215,96,0.25)",
                        }}
                      >
                        Following
                      </span>
                    )}
                  </div>
                  {show.artist && (
                    <p
                      className="text-sm truncate"
                      style={{
                        color: show.followed ? theme.accent.green : theme.text.secondary,
                        fontWeight: show.followed ? 500 : 400,
                      }}
                    >
                      {show.artist}
                    </p>
                  )}
                  <p className="text-sm truncate mt-0.5" style={{ color: theme.text.muted }}>
                    {[show.venue, show.city && show.state ? `${show.city}, ${show.state}` : show.city, time]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>

                {/* Ticket link */}
                {show.ticketUrl && (
                  <a
                    href={show.ticketUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold"
                    style={{
                      background: "rgba(30,215,96,0.1)",
                      color: theme.accent.green,
                      border: "1px solid rgba(30,215,96,0.2)",
                      textDecoration: "none",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(30,215,96,0.18)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(30,215,96,0.1)")}
                  >
                    Tickets
                    <ExternalLinkIcon />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && shows.length === 0 &&
        (locationStatus === "granted" || submittedCity || submittedArtist) && (
          <div
            className="rounded-2xl p-10 text-center"
            style={{
              background: theme.bg.surface,
              border: `1px solid ${theme.border.subtle}`,
            }}
          >
            <div className="text-4xl mb-4" align="center"><Guitar /></div>
            <h2 className="font-semibold mb-2" style={{ color: theme.text.primary }}>
              No shows found
            </h2>
            <p className="text-sm" style={{ color: theme.text.muted }}>
              {submittedArtist
                ? `No upcoming shows found for "${submittedArtist}"${genreId ? " in this genre" : ""}. Try a different name.`
                : submittedCity
                ? `No upcoming concerts in "${submittedCity}"${genreId ? " for this genre" : ""}. Try a different city or genre.`
                : `No upcoming concerts within 100 miles${genreId ? " for this genre" : ""}. Try a different genre.`}
            </p>
          </div>
        )}
    </div>
  );
}
