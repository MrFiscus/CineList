"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import SiteNav from "../components/SiteNav";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("Loading...");
  const [stats, setStats] = useState({
    totalMovies: 0,
    countriesWithMovies: 0,
    latestTitle: "—",
    latestDate: null,
  });

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      if (!data.user) {
        router.replace("/login");
        return;
      }
      setUser(data.user);
      setStatus("");
    };
    init();
    return () => {
      mounted = false;
    };
  }, [router]);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    const loadStats = async () => {
      const { data, error } = await supabase
        .from("movies")
        .select("title,country_key,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (!mounted || error) return;
      const list = data || [];
      const countries = new Set(list.map((m) => m.country_key).filter(Boolean));
      setStats({
        totalMovies: list.length,
        countriesWithMovies: countries.size,
        latestTitle: list[0]?.title || "—",
        latestDate: list[0]?.created_at || null,
      });
    };
    loadStats();
    return () => {
      mounted = false;
    };
  }, [user]);

  if (!user) {
    return (
      <div className="app">
        <header className="hero">
          <SiteNav />
        </header>
        <main>
          <section className="side-panel">
            <div className="status">{status}</div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="hero">
        <SiteNav />
        <div className="hero-body">
          <div>
            <div className="kicker">Account</div>
            <h1>Profile</h1>
            <p>Manage your account details and view your saved data.</p>
          </div>
        </div>
      </header>

      <div className="sub-main">
        <section className="side-panel">
          <div className="selected">
            <div className="selected-label">Library Stats</div>
            <div className="selected-name">{stats.totalMovies} movies logged</div>
            <div className="selected-meta">{stats.countriesWithMovies} countries with movies</div>
            <div className="selected-meta">
              Latest: {stats.latestTitle} {stats.latestDate ? `(${new Date(stats.latestDate).toLocaleDateString()})` : ""}
            </div>
          </div>

          <div className="selected">
            <div className="selected-label">Email</div>
            <div className="selected-name">{user.email || "—"}</div>
            <div className="selected-meta">User ID: {user.id}</div>
          </div>

          <div className="selected">
            <div className="selected-label">Account Details</div>
            <div className="selected-name">{user.user_metadata?.full_name || "CineList Member"}</div>
            <div className="selected-meta">
              Created: {user.created_at ? new Date(user.created_at).toLocaleString() : "—"}
            </div>
            <div className="selected-meta">
              Last Sign In: {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : "—"}
            </div>
          </div>

          <div className="selected">
            <div className="selected-label">Provider</div>
            <div className="selected-name">{user.app_metadata?.provider || "email"}</div>
            <div className="selected-meta">Role: {user.role || "authenticated"}</div>
          </div>
        </section>
      </div>
    </div>
  );
}
