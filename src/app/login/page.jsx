"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import logo from "../../../logo.png";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus("Signing in...");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setStatus(error.message);
      return;
    }
    router.replace("/");
  };

  return (
    <div className="auth-page">
      <header className="auth-header">
        <div className="auth-logo">
          <Image src={logo} alt="Movie Tracker" width={160} height={36} priority className="auth-logo-img" />
        </div>
        <a className="auth-link" href="#feedback">Leave Feedback</a>
      </header>

      <main className="auth-main">
        <section className="auth-card">
          <div className="auth-title">Sign In to Get Started</div>
          <div className="auth-divider">
            <span>or</span>
          </div>
          <Link className="auth-link" href="/signup">Create a Account</Link>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

            <label htmlFor="password">Password</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />

            <button type="submit" className="primary">Sign In</button>
            <div className="status">{status}</div>
          </form>
        </section>
      </main>

      <footer className="auth-footer">
        <div className="auth-footer-links">
          <a href="#contact">Contact</a>
          <a href="#support">Support</a>
        </div>
        <div className="auth-footer-copy">© 2026 CineList</div>
      </footer>
    </div>
  );
}
