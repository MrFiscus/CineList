"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

export default function SiteNav() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setUser(data.user ?? null);
    };
    init();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe?.();
    };
  }, []);

  const primaryHref = user ? "/profile" : "/login";
  const primaryLabel = user ? "Profile" : "Login";

  return (
    <div className="site-nav">
      <div className="nav-brand">CineList</div>
      <nav className="nav-links" aria-label="Primary">
        <Link href="/" className="nav-link">Home</Link>
        <Link href="/add-movies" className="nav-link">Add Movies</Link>
        <Link href="/movie-list" className="nav-link">My List</Link>
        <Link href="/about" className="nav-link">About</Link>
      </nav>
      <div className="nav-actions">
        <Link href={primaryHref} className="nav-button primary">{primaryLabel}</Link>
        {user ? <Link href="/logout" className="nav-button ghost">Logout</Link> : null}
      </div>
    </div>
  );
}
