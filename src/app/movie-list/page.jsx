"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import SiteNav from "../components/SiteNav";

export default function MovieListPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [movies, setMovies] = useState([]);
  const [status, setStatus] = useState("Loading...");
  const [importStatus, setImportStatus] = useState("");
  const [importing, setImporting] = useState(false);

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

  const parseCsv = (text) => {
    const rows = [];
    let current = [];
    let value = "";
    let inQuotes = false;
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      const next = text[i + 1];
      if (char === "\"") {
        if (inQuotes && next === "\"") {
          value += "\"";
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }
      if (!inQuotes && (char === "," || char === "\n" || char === "\r")) {
        if (char === "\r" && next === "\n") i += 1;
        current.push(value);
        value = "";
        if (char === "\n" || char === "\r") {
          rows.push(current);
          current = [];
        }
        continue;
      }
      value += char;
    }
    if (value.length || current.length) {
      current.push(value);
      rows.push(current);
    }
    return rows.filter((row) => row.some((cell) => String(cell || "").trim().length));
  };

  const handleCsvImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    setImportStatus("");
    setImporting(true);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (rows.length < 2) {
        setImportStatus("CSV needs a header row and at least one movie row.");
        return;
      }

      const headers = rows[0].map((h) => String(h || "").trim().toLowerCase());
      const getCell = (row, name) => {
        const idx = headers.indexOf(name);
        return idx >= 0 ? String(row[idx] || "").trim() : "";
      };
      const getAny = (row, names) => {
        for (const name of names) {
          const value = getCell(row, name);
          if (value) return value;
        }
        return "";
      };

      const payload = rows.slice(1).map((row) => {
        const title = getAny(row, ["title", "name"]);
        const ratingRaw = getCell(row, "rating");
        const ratingFloat = Number.parseFloat(ratingRaw);
        const ratingNum = Number.isFinite(ratingFloat) ? Math.round(ratingFloat) : NaN;
        const createdAtRaw = getAny(row, ["created_at", "watched date", "date"]);
        const createdAt = createdAtRaw ? new Date(createdAtRaw).toISOString() : new Date().toISOString();

        return {
          user_id: user.id,
          title,
          review: getCell(row, "review") || null,
          rating: Number.isFinite(ratingNum) ? ratingNum : null,
          poster_url: getCell(row, "poster_url") || null,
          poster_data: getCell(row, "poster_data") || null,
          country_key: getCell(row, "country_key") || null,
          country_name: getCell(row, "country_name") || null,
          created_at: createdAt,
        };
      }).filter((movie) => movie.title);

      if (payload.length === 0) {
        setImportStatus("No valid rows found. Make sure the CSV has a title column.");
        return;
      }

      const inserted = [];
      const batchSize = 50;
      for (let i = 0; i < payload.length; i += batchSize) {
        const chunk = payload.slice(i, i + batchSize);
        const { data, error } = await supabase.from("movies").insert(chunk).select("*");
        if (error) {
          setImportStatus(error.message || "Unable to import movies.");
          return;
        }
        if (data) inserted.push(...data);
      }

      setMovies((prev) => [...inserted, ...prev]);
      setImportStatus(`Imported ${inserted.length} movie(s).`);
      event.target.value = "";
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const template = [
      "title,review,rating,poster_url,poster_data,country_key,country_name,release_year,year,created_at",
      "\"Spirited Away\",\"Beautiful animation\",5,https://example.com/poster.jpg,,JPN,Japan,2001,2001,2023-11-05",
    ].join("\n");
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "my-list-template.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app movie-list-page">
      <header className="hero">
        <SiteNav />
        <div className="hero-body">
          <div>
            <h1>My List</h1>
            <p>All movies you have added, sorted alphabetically.</p>
          </div>
        </div>
      </header>

      <main className="movie-list-main">
        <section className="side-panel movie-list-panel">
          <div className="import-panel">
            <div className="import-title">Import CSV</div>
            <div className="import-help">Headers supported: title/name (required), review, rating, poster_url, country_key, country_name, created_at/watched date/date.</div>
            <div className="import-actions">
              <button className="secondary" type="button" onClick={downloadTemplate}>Download Template</button>
              <label className="import-file">
                <input type="file" accept=".csv,text/csv" onChange={handleCsvImport} disabled={importing} />
                {importing ? "Importing..." : "Choose CSV"}
              </label>
            </div>
            {importStatus ? <div className="status">{importStatus}</div> : null}
          </div>
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
