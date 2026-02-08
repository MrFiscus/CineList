"use client";

import { useEffect, useState } from "react";
import SiteNav from "./components/SiteNav";
import { supabase } from "../lib/supabaseClient";

export default function Home() {
  const [userName, setUserName] = useState("");

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      const user = data.user;
      if (!user) {
        setUserName("");
        return;
      }
      const nameFromMeta = user.user_metadata?.display_name || user.user_metadata?.full_name || user.user_metadata?.name;
      const nameFromEmail = user.email ? user.email.split("@")[0] : "";
      setUserName(nameFromMeta || nameFromEmail || "there");
    };
    init();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      if (!user) {
        setUserName("");
        return;
      }
      const nameFromMeta = user.user_metadata?.display_name || user.user_metadata?.full_name || user.user_metadata?.name;
      const nameFromEmail = user.email ? user.email.split("@")[0] : "";
      setUserName(nameFromMeta || nameFromEmail || "there");
    });

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe?.();
    };
  }, []);

  const heading = userName ? `Welcome back, ${userName}` : "Movie Tracking Made Simpler";
  const kicker = userName ? "Movie Tracking Made Simpler" : "Welcome to CineList";
  const ctaLabel = userName ? "Add Movies" : "Get Started";

  return (
    <div className="app home-page home-dark">
      <header className="hero home-hero">
        <SiteNav />
      </header>

      <main className="home-content">
        <section className="home-main">
          <div className="home-hero-copy">
            <div className="kicker">{kicker}</div>
            <h1>{heading}</h1>
            <p>Build your map, log the films you watch, and keep everything organized.</p>
            <a className="primary-cta" href="/add-movies">{ctaLabel}</a>
          </div>
        </section>
      </main>
    </div>
  );
}
