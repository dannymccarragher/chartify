"use client";

import { useEffect, useState } from "react";
import Login from "./login/Login";

type User = {
  display_name: string;
  email: string;
  avatar_url: string | null;
};

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("http://127.0.0.1:5000/auth/me", { credentials: "include" });
        const data = res.ok ? await res.json() : null;
        console.log(data);
        setUser(data);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h1 className="text-3xl font-bold">Welcome to Tourly</h1>
        <p className="text-gray-500">Log in to get started</p>
        <Login />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6">
      {user.avatar_url && (
        <img
          src={user.avatar_url}
          alt="Profile"
          className="w-24 h-24 rounded-full object-cover"
        />
      )}
      <div className="text-center">
        <h1 className="text-2xl font-bold">{user.display_name}</h1>
        <p className="text-gray-500">{user.email}</p>
      </div>
      <p className="text-green-500 font-medium">Logged in with Spotify</p>
    </div>
  );
}
