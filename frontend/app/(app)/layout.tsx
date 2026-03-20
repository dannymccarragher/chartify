"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { theme } from "@/constants/theme";

const API = "http://127.0.0.1:5000";

function HomeIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function TrophyIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2z" />
    </svg>
  );
}

function CalendarIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function MusicIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

function UsersIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function LogOutIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", Icon: HomeIcon },
  { href: "/leaderboard", label: "Leaderboard", Icon: TrophyIcon },
  { href: "/shows", label: "Shows", Icon: CalendarIcon },
  { href: "/artists", label: "Artists", Icon: MusicIcon },
  { href: "/friends", label: "Friends", Icon: UsersIcon },
];

type User = {
  id: number;
  display_name: string;
  avatar_url: string | null;
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    fetch(`${API}/auth/me`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) router.replace("/");
        else setUser(data);
      })
      .catch(() => router.replace("/"))
      .finally(() => setLoading(false));
  }, [router]);

  async function logout() {
    await fetch(`${API}/auth/logout`, { method: "POST", credentials: "include" });
    window.location.href = "/";
  }

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: theme.bg.base }}
      >
        <div style={{ color: theme.text.muted, fontSize: 14 }}>Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div style={{ background: theme.bg.base, minHeight: "100vh" }}>
      {/* ── Desktop sidebar ─────────────────────────────── */}
      <aside
        className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-30"
        style={{
          width: 240,
          background: theme.bg.surface,
          borderRight: `1px solid ${theme.border.subtle}`,
        }}
      >
        {/* Logo */}
        <div className="px-5 pt-7 pb-7">
          <span
            className="text-2xl font-black tracking-tight"
            style={{
              background: "linear-gradient(135deg, #a259ff 0%, #1ed760 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Chartify
          </span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 flex flex-col gap-0.5">
          <p
            className="text-[10px] uppercase tracking-widest font-semibold px-3 mb-2"
            style={{ color: theme.text.muted }}
          >
            Menu
          </p>
          {navItems.map(({ href, label, Icon }) => {
            const active =
              href === "/dashboard"
                ? pathname === "/dashboard" || pathname === `/profile/${user.id}`
                : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150"
                style={{
                  background: active ? "rgba(162,89,255,0.1)" : "transparent",
                  color: active ? theme.accent.purple : theme.text.secondary,
                  textDecoration: "none",
                  fontWeight: active ? 600 : 400,
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = theme.bg.elevated;
                    (e.currentTarget as HTMLElement).style.color = theme.text.primary;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.color = theme.text.secondary;
                  }
                }}
              >
                {/* Left accent bar */}
                {active && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full"
                    style={{
                      width: 3,
                      height: 20,
                      background: theme.accent.purple,
                    }}
                  />
                )}
                <span style={{ color: active ? theme.accent.purple : "inherit" }}>
                  <Icon />
                </span>
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User card + logout */}
        <div
          className="px-3 py-4"
          style={{ borderTop: `1px solid ${theme.border.subtle}` }}
        >
          {/* Clickable profile card */}
          <Link
            href={`/profile/${user.id}`}
            className="flex items-center gap-3 p-3 rounded-xl mb-1 transition-all duration-150"
            style={{
              textDecoration: "none",
              background: "transparent",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = theme.bg.elevated;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
          >
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.display_name}
                className="w-9 h-9 rounded-full object-cover flex-shrink-0ring-2"
                style={{ boxShadow: `0 0 0 2px rgba(162,89,255,0.3)` }}
              />
            ) : (
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{
                  background: "rgba(162,89,255,0.15)",
                  color: theme.accent.purple,
                  boxShadow: `0 0 0 2px rgba(162,89,255,0.3)`,
                }}
              >
                {user.display_name?.[0]?.toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: theme.text.primary }}>
                {user.display_name}
              </p>
              <p className="text-xs" style={{ color: theme.text.muted }}>
                View profile →
              </p>
            </div>
          </Link>

          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all duration-150"
            style={{
              background: "transparent",
              color: theme.text.muted,
              border: "none",
              cursor: "pointer",
              textAlign: "left",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(255,80,80,0.08)";
              (e.currentTarget as HTMLElement).style.color = "#ff5050";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color = theme.text.muted;
            }}
          >
            <LogOutIcon />
            Log out
          </button>
        </div>
      </aside>

      {/* ── Mobile top bar ────────────────────────────────── */}
      <header
        className="lg:hidden fixed top-0 inset-x-0 z-30 flex items-center px-5 h-14"
        style={{
          background: "rgba(13,13,13,0.92)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          borderBottom: `1px solid ${theme.border.subtle}`,
        }}
      >
        <span
          className="font-bold text-lg"
          style={{ color: theme.text.primary, letterSpacing: "-0.5px" }}
        >
          Chartify
        </span>
        <div className="ml-auto">
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.display_name}
              className="w-7 h-7 rounded-full object-cover"
            />
          ) : (
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: theme.bg.highlight, color: theme.text.secondary }}
            >
              {user.display_name?.[0]?.toUpperCase()}
            </div>
          )}
        </div>
      </header>

      {/* ── Main content ─────────────────────────────────── */}
      <div className="lg:ml-[240px]">
        <div className="pt-14 pb-20 lg:pt-0 lg:pb-0">{children}</div>
      </div>

      {/* ── Mobile bottom nav ─────────────────────────────── */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 flex"
        style={{
          background: "rgba(22,22,22,0.95)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          borderTop: `1px solid ${theme.border.subtle}`,
        }}
      >
        {navItems.map(({ href, label, Icon }) => {
          const active =
            href === "/dashboard"
              ? pathname === "/dashboard" || pathname === `/profile/${user.id}`
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center py-2.5 gap-1"
              style={{
                color: active ? theme.accent.purple : theme.text.muted,
                textDecoration: "none",
                fontSize: 10,
                fontWeight: active ? 600 : 400,
                transition: "color 0.15s",
              }}
            >
              <Icon size={20} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
