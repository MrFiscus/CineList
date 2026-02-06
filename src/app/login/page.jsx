"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

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
    <div className="app">
      <header className="hero">
        <div>
          <div className="kicker">Movie Tracker</div>
          <h1>Login</h1>
          <p>Sign in to access your movie map.</p>
        </div>
      </header>

      <main>
        <section className="side-panel">
          <form className="movie-form" onSubmit={handleSubmit}>
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

            <label htmlFor="password">Password</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />

            <button type="submit" className="primary">Login</button>
            <div className="status">{status}</div>
            <div className="selected-meta">
              Need an account? <Link href="/signup">Create one</Link>.
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
