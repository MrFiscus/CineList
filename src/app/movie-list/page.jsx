"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function MovieListPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [movies, setMovies] = useState([]);
  const [status, setStatus] = useState("Loading...");

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
    };
    init();
    return () => {
      mounted = false;
    };
  }, [router]);

  useEffect(() => {
    if (!user) return;
    const loadMovies = async () => {
      const { data, error } = await supabase
        .from("movies")
        .select("*")
        .eq("user_id", user.id)
        .order("title", { ascending: true });
      if (error) {
        setStatus(error.message || "Unable to load movies.");
        return;
      }
      setMovies(data || []);
      setStatus("");
    };
    loadMovies();
  }, [user]);

  const deleteMovie = async (movieId) => {
    if (!user) return;
    const { error } = await supabase
      .from("movies")
      .delete()
      .eq("id", movieId)
      .eq("user_id", user.id);
    if (error) {
      setStatus(error.message || "Unable to delete movie.");
      return;
    }
    setMovies((prev) => prev.filter((m) => m.id !== movieId));
  };

  const sortedMovies = useMemo(() => {
    return [...movies].sort((a, b) => (a.title || "").localeCompare(b.title || "", undefined, { sensitivity: "base" }));
  }, [movies]);

  return (
    <div className="app movie-list-page">
      <header className="hero">
        <div>
          <div className="kicker">Movie tracking made simpler</div>
          <h1>Movie List</h1>
          <p>All movies you have added, sorted alphabetically.</p>
        </div>
        <div className="header-right">
          <nav className="top-nav" aria-label="Primary">
            <Link href="/" className="nav-link">Home</Link>
            <Link href="/about" className="nav-link">About</Link>
            <Link href="/movie-list" className="nav-link">Movie List</Link>
            <Link href="/movie-finder" className="nav-link">Movie Finder</Link>
            <Link href="/logout" className="nav-link">Logout</Link>
          </nav>
        </div>
      </header>

      <main className="movie-list-main">
        <section className="side-panel movie-list-panel">
          {status ? <div className="status">{status}</div> : null}
          <div className="movie-list-header">
          
            <div className="movie-list-col day">Date</div>
            <div className="movie-list-col film">Movie</div>
         
          
            <div className="movie-list-col edit">Edit</div>
          </div>
          <div className="movie-list movie-list-grid">
            {sortedMovies.length === 0 && !status ? (
              <div className="selected-meta">No movies yet. Add your first movie on the map.</div>
            ) : (
              sortedMovies.map((movie) => (
                <div className="movie-card movie-row" key={movie.id}>
                  <div className="movie-date">
                    <div className="movie-date-month">
                      {new Date(movie.created_at).toLocaleString(undefined, { month: "short" }).toUpperCase()}
                    </div>
                    <div className="movie-date-day">
                      {new Date(movie.created_at).toLocaleString(undefined, { day: "2-digit" })}
                    </div>
                    <div className="movie-date-year">
                      {new Date(movie.created_at).toLocaleString(undefined, { year: "numeric" })}
                    </div>
                  </div>
                  <img
                    src={
                      movie.poster_url ||
                      movie.poster_data ||
                      "data:image/svg+xml;charset=UTF-8," +
                        encodeURIComponent(
                          "<svg xmlns='http://www.w3.org/2000/svg' width='72' height='104'><rect width='100%' height='100%' fill='#f4efe1'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='10' fill='#7a6b4f'>No Poster</text></svg>"
                        )
                    }
                    alt={movie.title}
                  />
                  <div className="movie-body">
                    <h3>{movie.title}</h3>
                    <p>{movie.review || "No review yet."}</p>
                  </div>
                  <div className="movie-right">
                    <div className="movie-released">
                      {movie.release_year || movie.year || "—"}
                    </div>
                    <div className="movie-rating">
                      {movie.rating ? "★".repeat(movie.rating) : "—"}
                      {movie.rating && movie.rating < 5 ? <span className="rating-muted">{"★".repeat(5 - movie.rating)}</span> : null}
                    </div>
                    <div className="movie-like">♡</div>
                    <div className="movie-rewatch">—</div>
                    <div className="movie-review">—</div>
                    <div className="movie-actions">
                      <button className="secondary" type="button" onClick={() => deleteMovie(movie.id)}>Delete</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
