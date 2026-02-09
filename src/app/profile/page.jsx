"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@mantine/core";
import { supabase } from "../../lib/supabaseClient";
import SiteNav from "../components/SiteNav";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("Loading...");
  const [displayName, setDisplayName] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [stats, setStats] = useState({
    totalMovies: 0,
    countriesWithMovies: 0,
    latestTitle: "-",
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
      const initialName =
        data.user.user_metadata?.display_name ||
        data.user.user_metadata?.full_name ||
        data.user.user_metadata?.name ||
        data.user.email ||
        "";
      setDisplayName(initialName);
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
        latestTitle: list[0]?.title || "-",
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
            <div className="selected-label">User Name</div>
            <div className="selected-meta">Shown on your home page when you log in.</div>
            <div className="movie-form">
              <label htmlFor="displayName"></label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  setSaveStatus("");
                }}
              />
              <Button
                className="primary"
                variant="unstyled"
                type="button"
                onClick={async () => {
                  setSaveStatus("Saving...");
                  const { data, error } = await supabase.auth.updateUser({
                    data: { display_name: displayName.trim() },
                  });
                  if (error) {
                    setSaveStatus(error.message || "Unable to update name.");
                    return;
                  }
                  setUser(data.user);
                  setSaveStatus("Saved.");
                }}
              >
                Save Name
              </Button>
              {saveStatus ? <div className="status">{saveStatus}</div> : null}
            </div>
          </div>

          <div className="selected profile-card">
            <div className="selected-label">Library Stats</div>
            <div className="selected-name">{stats.totalMovies} movies logged</div>
            <div className="selected-meta">{stats.countriesWithMovies} countries with movies</div>
            <div className="selected-meta">
              Latest: {stats.latestTitle} {stats.latestDate ? `(${new Date(stats.latestDate).toLocaleDateString()})` : ""}
            </div>
          </div>

          <div className="selected profile-card">
            <div className="selected-label">Email</div>
            <div className="selected-name">{user.email || "-"}</div>
            <div className="selected-meta">User ID: {user.id}</div>
          </div>

          <div className="selected profile-card">
            <div className="selected-label">Account Details</div>
            <div className="selected-name">
              {user.user_metadata?.display_name || user.user_metadata?.full_name || "CineList Member"}
            </div>
            <div className="selected-meta">
              Created: {user.created_at ? new Date(user.created_at).toLocaleString() : "-"}
            </div>
            <div className="selected-meta">
              Last Sign In: {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : "-"}
            </div>
          </div>

        </section>
      </div>
    </div>
  );
}
