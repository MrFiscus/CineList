"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

export default function SiteNav() {
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);

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
  const handleNavClick = () => setOpen(false);

  return (
    <div className={`site-nav${open ? " nav-open" : ""}`}>
      <div className="nav-brand">CineList</div>
      <nav className="nav-links" aria-label="Primary">
        <Link href="/" className="nav-link" onClick={handleNavClick}>Home</Link>
        <Link href="/add-movies" className="nav-link" onClick={handleNavClick}>Add Movies</Link>
        <Link href="/movie-list" className="nav-link" onClick={handleNavClick}>My List</Link>
        <Link href="/about" className="nav-link" onClick={handleNavClick}>About</Link>
      </nav>
      <div className="nav-actions">
        <Link href={primaryHref} className="nav-button primary" onClick={handleNavClick}>{primaryLabel}</Link>
        {user ? <Link href="/logout" className="nav-button ghost" onClick={handleNavClick}>Logout</Link> : null}
      </div>
      <button
        className="nav-toggle"
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span />
        <span />
        <span />
      </button>
    </div>
  );
}
