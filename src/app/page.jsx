"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SiteNav from "./components/SiteNav";
import { supabase } from "../lib/supabaseClient";
import movieQuotes from "./movieQuotes";

const HOME_IMAGES = [
  "/images/500daysofsummer.avif",
  "/images/everythingeverywhere.jpg",
  "/images/joker-2-poster-featured.avif",
  "/images/memoriesofmurder.jpg",
  "/images/miracleincellno7.jpg",
  "/images/pastlives.jpg",
  "/images/perks of being a wallflower.jpg",
  "/images/whiplash.jpg",
];

const HOME_GRADIENT = "linear-gradient(90deg, rgba(2, 17, 27, 0.79) 0%, rgba(48, 41, 47, 1) 50%, rgba(63, 64, 69, 0.84) 100%)";

export default function Home() {
  const [userName, setUserName] = useState("");
  const [randomQuote, setRandomQuote] = useState(null);
  const [backgroundImage, setBackgroundImage] = useState(HOME_IMAGES[0] || "");

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

  useEffect(() => {
    if (!movieQuotes.length) return;
    const pick = movieQuotes[Math.floor(Math.random() * movieQuotes.length)];
    setRandomQuote(pick || null);
  }, []);

  useEffect(() => {
    if (!HOME_IMAGES.length) return;
    const pick = HOME_IMAGES[Math.floor(Math.random() * HOME_IMAGES.length)];
    setBackgroundImage(pick || "");
  }, []);

  const heading = userName ? `Welcome back, ${userName}` : "Movie Tracking Made Simpler";
  const kicker = userName ? "Movie Tracking Made Simpler" : "Welcome to CineList";
  const ctaLabel = userName ? "Add Movies" : "Get Started";
  const homeBackground = backgroundImage
    ? `${HOME_GRADIENT}, url("${backgroundImage}") center / cover no-repeat fixed`
    : HOME_GRADIENT;

  return (
    <div className="app home-page home-dark" style={{ background: homeBackground }}>
      <header className="hero home-hero">
        <SiteNav />
      </header>

      <main className="home-content">
        <section className="home-main">
          <div className="home-hero-copy">
            <div className="home-hero-content">
              <div className="kicker">{kicker}</div>
              <h1>{heading}</h1>
              <p>Track the films you watch, Build your map, and keep everything organized.</p>
              <div className="home-cta-row">
                <Link href="/add-movies" className="btn-53" aria-label={ctaLabel}>
                  <span className="original">{ctaLabel}</span>
                  <span className="letters" aria-hidden="true">
                    {ctaLabel.split("").map((char, index) => (
                      <span key={`${char}-${index}`}>{char === " " ? "\u00A0" : char}</span>
                    ))}
                  </span>
                </Link>
                <Link href="/about" className="btn-53 btn-ghost" aria-label="Learn More">
                  <span className="original">Learn More</span>
                  <span className="letters" aria-hidden="true">
                    {"Learn More".split("").map((char, index) => (
                      <span key={`${char}-${index}`}>{char === " " ? "\u00A0" : char}</span>
                    ))}
                  </span>
                </Link>
              </div>
            </div>
            {randomQuote ? (
              <div className="home-quote">
                <span className="home-quote-text">"{randomQuote.quote}"</span>
                <span className="home-quote-source">— {randomQuote.movie}, {randomQuote.year}</span>
              </div>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}
