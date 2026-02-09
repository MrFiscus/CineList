"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as d3 from "d3";
import { feature } from "topojson-client";
import { supabase } from "../../lib/supabaseClient";
import SiteNav from "../components/SiteNav";

const topoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const OMDB_BASE = "https://www.omdbapi.com/";

const normalize = (value) => value.toLowerCase().replace(/\./g, "").trim();

const aliases = new Map([
  ["usa", "united states of america"],
  ["united states", "united states of america"],
  ["uk", "united kingdom"],
  ["russia", "russian federation"],
  ["south korea", "korea, republic of"],
  ["north korea", "korea, democratic people's republic of"],
  ["iran", "iran, islamic republic of"],
  ["vietnam", "viet nam"],
  ["venezuela", "venezuela, bolivarian republic of"],
]);

export default function MovieListPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [movies, setMovies] = useState([]);
  const [status, setStatus] = useState("Loading...");
  const [importStatus, setImportStatus] = useState("");
  const [importing, setImporting] = useState(false);
  const [countries, setCountries] = useState([]);
  const [countryIndex, setCountryIndex] = useState(new Map());
  const [countryNameByKey, setCountryNameByKey] = useState(new Map());
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    title: "",
    review: "",
    rating: "",
    poster_url: "",
    created_at: "",
  });
  const [editStatus, setEditStatus] = useState("");

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

  const loadCountries = async () => {
    const world = await d3.json(topoUrl);
    const features = feature(world, world.objects.countries).features;
    const list = features
      .map((feat, index) => {
        const name = feat.properties?.name || `Country ${index + 1}`;
        const key = String(feat.id ?? name ?? index);
        return { key, name };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
    const indexMap = new Map();
    const nameMap = new Map();
    for (const c of list) {
      indexMap.set(normalize(c.name), c.key);
      nameMap.set(c.key, c.name);
    }
    return { list, indexMap, nameMap };
  };

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const { list, indexMap, nameMap } = await loadCountries();
      if (!mounted) return;
      setCountries(list);
      setCountryIndex(indexMap);
      setCountryNameByKey(nameMap);
    };
    init();
    return () => {
      mounted = false;
    };
  }, []);

  const loadMovies = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("movies")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      setStatus(error.message || "Unable to load movies.");
      return;
    }
    setMovies(data || []);
    setStatus("");
  };

  useEffect(() => {
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

  const startEdit = (movie) => {
    const dateValue = movie.created_at ? new Date(movie.created_at).toISOString().split("T")[0] : "";
    setEditingId(movie.id);
    setEditStatus("");
    setEditForm({
      title: movie.title || "",
      review: movie.review || "",
      rating: movie.rating ? String(movie.rating) : "",
      poster_url: movie.poster_url || "",
      created_at: dateValue,
    });
  };

  const saveEdit = async (event, movieId) => {
    event.preventDefault();
    if (!user) return;
    setEditStatus("Saving...");
    const ratingNumber = editForm.rating ? Number.parseInt(editForm.rating, 10) : null;
    const updated = {
      title: editForm.title.trim(),
      review: editForm.review.trim(),
      rating: Number.isFinite(ratingNumber) ? ratingNumber : null,
      poster_url: editForm.poster_url.trim() || null,
    };
    if (editForm.created_at) {
      updated.created_at = new Date(`${editForm.created_at}T00:00:00Z`).toISOString();
    }

    const { data, error } = await supabase
      .from("movies")
      .update(updated)
      .eq("id", movieId)
      .eq("user_id", user.id)
      .select("*");
    if (error) {
      setEditStatus(error.message || "Unable to update movie.");
      return;
    }
    const updatedRow = Array.isArray(data) ? data[0] : data;
    if (!updatedRow) {
      setEditStatus("No rows updated. Check permissions or try again.");
      await loadMovies();
      setEditingId(null);
      return;
    }
    setMovies((prev) => prev.map((m) => (m.id === movieId ? updatedRow : m)));
    setEditStatus("Saved ✓");
    setEditingId(null);
    setStatus("");
  };

  const sortedMovies = useMemo(() => {
    return [...movies].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [movies]);

  const matchCountryKey = (name, indexMap) => {
    const norm = normalize(name);
    if (indexMap.has(norm)) return indexMap.get(norm);
    if (aliases.has(norm)) {
      const alias = aliases.get(norm);
      if (indexMap.has(alias)) return indexMap.get(alias);
    }
    return null;
  };

  const fetchOmdb = async (params) => {
    const query = new URLSearchParams({ apikey: process.env.NEXT_PUBLIC_OMDB_KEY });
    Object.entries(params).forEach(([key, value]) => {
      if (value) query.set(key, value);
    });
    const resp = await fetch(`${OMDB_BASE}?${query.toString()}`);
    return resp.json();
  };

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
      let localCountries = countries;
      let localIndex = countryIndex;
      let localNameMap = countryNameByKey;
      if (localCountries.length === 0) {
        setImportStatus("Loading country data...");
        const loaded = await loadCountries();
        localCountries = loaded.list;
        localIndex = loaded.indexMap;
        localNameMap = loaded.nameMap;
        setCountries(localCountries);
        setCountryIndex(localIndex);
        setCountryNameByKey(localNameMap);
      }

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

      const payload = [];
      const rowsToImport = rows.slice(1);
      for (let i = 0; i < rowsToImport.length; i += 1) {
        const row = rowsToImport[i];
        const title = getAny(row, ["title", "name"]);
        if (!title) continue;
        const ratingRaw = getCell(row, "rating");
        const ratingFloat = Number.parseFloat(ratingRaw);
        const ratingNum = Number.isFinite(ratingFloat) ? Math.round(ratingFloat) : NaN;
        const createdAtRaw = getAny(row, ["created_at", "watched date", "date"]);
        const createdAt = createdAtRaw ? new Date(createdAtRaw).toISOString() : new Date().toISOString();
        const yearForLookup = getAny(row, ["year", "release year"]);

        let countryKey = getCell(row, "country_key");
        let countryName = getCell(row, "country_name");
        let posterUrl = getCell(row, "poster_url");

        if (countryKey && !countryName) {
          countryName = localNameMap.get(countryKey) || "";
        }

        if (!countryKey && countryName) {
          const matchedKey = matchCountryKey(countryName, localIndex);
          if (matchedKey) {
            countryKey = matchedKey;
            countryName = localNameMap.get(matchedKey) || countryName;
          }
        }

        if ((!countryKey && !countryName) && process.env.NEXT_PUBLIC_OMDB_KEY) {
          try {
            const detail = await fetchOmdb({ t: title, y: yearForLookup || undefined, type: "movie" });
            if (detail.Response === "True" && detail.Country) {
              const parts = detail.Country.split(",").map((c) => c.trim()).filter(Boolean);
              for (const part of parts) {
                const matchedKey = matchCountryKey(part, localIndex);
                if (matchedKey) {
                  countryKey = matchedKey;
                  countryName = localNameMap.get(matchedKey) || part;
                  break;
                }
              }
            }
            if (!posterUrl && detail.Response === "True" && detail.Poster && detail.Poster !== "N/A") {
              posterUrl = detail.Poster.replace("http://", "https://");
            }
          } catch (error) {
            // ignore lookup errors
          }
        }

        payload.push({
          user_id: user.id,
          title,
          review: getCell(row, "review") || null,
          rating: Number.isFinite(ratingNum) ? ratingNum : null,
          poster_url: posterUrl || null,
          poster_data: getCell(row, "poster_data") || null,
          country_key: countryKey || null,
          country_name: countryName || null,
          created_at: createdAt,
        });
      }

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
            <p>All movies you have added, sorted by watch date.</p>
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
                    
                
                    <div className="movie-actions">
                      <button className="secondary" type="button" onClick={() => startEdit(movie)}>Edit</button>
                      <button className="secondary" type="button" onClick={() => deleteMovie(movie.id)}>Delete</button>
                    </div>
                  </div>
                  {editingId === movie.id ? (
                    <form className="movie-form edit-form" onSubmit={(event) => saveEdit(event, movie.id)}>
                      <label htmlFor={`edit-title-${movie.id}`}>Title</label>
                      <input
                        id={`edit-title-${movie.id}`}
                        type="text"
                        value={editForm.title}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                        required
                      />

                      <label htmlFor={`edit-review-${movie.id}`}>Review</label>
                      <textarea
                        id={`edit-review-${movie.id}`}
                        rows={3}
                        value={editForm.review}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, review: e.target.value }))}
                      ></textarea>

                      <label htmlFor={`edit-rating-${movie.id}`}>Rating (1-5)</label>
                      <input
                        id={`edit-rating-${movie.id}`}
                        type="number"
                        min="1"
                        max="5"
                        value={editForm.rating}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, rating: e.target.value }))}
                      />

                      <label htmlFor={`edit-poster-${movie.id}`}>Poster URL</label>
                      <input
                        id={`edit-poster-${movie.id}`}
                        type="url"
                        value={editForm.poster_url}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, poster_url: e.target.value }))}
                      />

                      <label htmlFor={`edit-date-${movie.id}`}>Watched Date</label>
                      <input
                        id={`edit-date-${movie.id}`}
                        type="date"
                        value={editForm.created_at}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, created_at: e.target.value }))}
                      />

                      <div className="controls">
                        <button className="primary" type="submit">Save</button>
                        <button className="secondary" type="button" onClick={() => setEditingId(null)}>Cancel</button>
                      </div>
                      {editStatus ? <div className="status">{editStatus}</div> : null}
                    </form>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
