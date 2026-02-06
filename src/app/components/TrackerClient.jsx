"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import * as d3 from "d3";
import { feature } from "topojson-client";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

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

export default function TrackerClient() {
  const router = useRouter();
  const mapRef = useRef(null);
  const tooltipRef = useRef(null);
  const svgRef = useRef(null);
  const zoomRef = useRef(null);
  const mapGroupRef = useRef(null);
  const mapSizeRef = useRef({ width: 0, height: 0 });
  const resizeObserverRef = useRef(null);
  const suggestTimerRef = useRef(null);

  const [user, setUser] = useState(null);
  const [countries, setCountries] = useState([]);
  const [countryIndex, setCountryIndex] = useState(new Map());
  const [movies, setMovies] = useState([]);
  const [selectedKey, setSelectedKey] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [status, setStatus] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [mapMax, setMapMax] = useState(false);

  const moviesByCountry = useMemo(() => {
    const by = new Map();
    for (const movie of movies) {
      const key = movie.country_key;
      if (!by.has(key)) by.set(key, []);
      by.get(key).push(movie);
    }
    return by;
  }, [movies]);

  const filteredCountries = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return countries;
    return countries.filter((c) => c.name.toLowerCase().includes(query));
  }, [countries, searchTerm]);

  const checkedCount = useMemo(() => {
    let count = 0;
    for (const c of countries) {
      if ((moviesByCountry.get(c.key) || []).length > 0) count += 1;
    }
    return count;
  }, [countries, moviesByCountry]);

  const selectedCountry = useMemo(
    () => countries.find((c) => c.key === selectedKey) || null,
    [countries, selectedKey]
  );

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
    const loadCountries = async () => {
      const world = await d3.json(topoUrl);
      const features = feature(world, world.objects.countries).features;
      const list = features
        .map((feat, index) => {
          const name = feat.properties?.name || `Country ${index + 1}`;
          const key = String(feat.id ?? name ?? index);
          feat.properties = feat.properties || {};
          feat.properties.__key = key;
          return { key, name, feature: feat };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
      const indexMap = new Map();
      for (const c of list) indexMap.set(normalize(c.name), c.key);
      setCountries(list);
      setCountryIndex(indexMap);
    };
    loadCountries();
  }, []);

  useEffect(() => {
    if (!user) return;
    const loadMovies = async () => {
      const { data, error } = await supabase
        .from("movies")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (!error && data) setMovies(data);
    };
    loadMovies();
  }, [user]);

  const matchCountryKey = (name) => {
    const norm = normalize(name);
    if (countryIndex.has(norm)) return countryIndex.get(norm);
    if (aliases.has(norm)) {
      const alias = aliases.get(norm);
      if (countryIndex.has(alias)) return countryIndex.get(alias);
    }
    return null;
  };

  const updateMapClasses = () => {
    const svg = svgRef.current;
    if (!svg) return;
    d3.select(svg)
      .selectAll("path.country")
      .classed("checked", (d) => (moviesByCountry.get(d.properties?.__key) || []).length > 0)
      .classed("active", (d) => d.properties?.__key === selectedKey);
  };

  useEffect(() => {
    updateMapClasses();
  }, [moviesByCountry, selectedKey]);

  const zoomToCountry = (key) => {
    const svg = svgRef.current;
    const zoom = zoomRef.current;
    const mapGroup = mapGroupRef.current;
    if (!svg || !zoom || !mapGroup) return;
    const country = countries.find((c) => c.key === key);
    if (!country) return;

    const path = d3.geoPath(d3.geoNaturalEarth1().fitSize(
      [mapSizeRef.current.width, mapSizeRef.current.height],
      { type: "FeatureCollection", features: countries.map((c) => c.feature) }
    ));

    const bounds = path.bounds(country.feature);
    const dx = bounds[1][0] - bounds[0][0];
    const dy = bounds[1][1] - bounds[0][1];
    const x = (bounds[0][0] + bounds[1][0]) / 2;
    const y = (bounds[0][1] + bounds[1][1]) / 2;
    const padding = 0.12;
    const scale = Math.max(
      1,
      Math.min(8, (1 - padding) / Math.max(dx / mapSizeRef.current.width, dy / mapSizeRef.current.height))
    );
    const translate = [
      mapSizeRef.current.width / 2 - scale * x,
      mapSizeRef.current.height / 2 - scale * y,
    ];

    d3.select(svg)
      .transition()
      .duration(700)
      .call(zoom.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));
  };

  const renderMap = () => {
    if (!mapRef.current) return;
    mapRef.current.innerHTML = "";
    const width = mapRef.current.clientWidth;
    const height = mapRef.current.clientHeight;
    if (!width || !height) return;
    mapSizeRef.current = { width, height };

    const projection = d3.geoNaturalEarth1().fitSize([width, height], {
      type: "FeatureCollection",
      features: countries.map((c) => c.feature),
    });
    const path = d3.geoPath(projection);

    const svg = d3.select(mapRef.current).append("svg").attr("viewBox", `0 0 ${width} ${height}`);
    const mapGroup = svg.append("g");

    const zoom = d3.zoom().scaleExtent([1, 8]).on("zoom", (event) => {
      mapGroup.attr("transform", event.transform);
    });

    svg.call(zoom).on("dblclick.zoom", null);

    mapGroup
      .selectAll("path")
      .data(countries.map((c) => c.feature))
      .join("path")
      .attr("class", "country")
      .attr("d", path)
      .on("click", (event, d) => {
        const key = d.properties?.__key;
        if (key) setSelectedKey(key);
      })
      .on("mousemove", (event, d) => {
        if (!tooltipRef.current || !mapRef.current) return;
        const name = d.properties?.name || "Unknown";
        const rect = mapRef.current.getBoundingClientRect();
        tooltipRef.current.textContent = name;
        tooltipRef.current.style.left = `${event.clientX - rect.left}px`;
        tooltipRef.current.style.top = `${event.clientY - rect.top}px`;
        tooltipRef.current.style.opacity = "1";
      })
      .on("mouseout", () => {
        if (tooltipRef.current) tooltipRef.current.style.opacity = "0";
      })
      .append("title")
      .text((d) => d.properties?.name || "Unknown");

    svgRef.current = svg.node();
    mapGroupRef.current = mapGroup.node();
    zoomRef.current = zoom;
    updateMapClasses();
  };

  useEffect(() => {
    if (!user) return;
    if (countries.length === 0) return;
    const node = mapRef.current;
    if (!node) return;

    // Render once the container has a measurable size.
    const renderIfReady = () => {
      if (node.clientWidth && node.clientHeight) {
        renderMap();
      }
    };

    renderIfReady();
    requestAnimationFrame(renderIfReady);

    resizeObserverRef.current?.disconnect?.();
    resizeObserverRef.current = new ResizeObserver(() => {
      renderIfReady();
    });
    resizeObserverRef.current.observe(node);

    return () => {
      resizeObserverRef.current?.disconnect?.();
    };
  }, [countries, mapMax, user]);

  const fetchOmdb = async (params) => {
    const query = new URLSearchParams({ ...params, apikey: process.env.NEXT_PUBLIC_OMDB_KEY });
    const resp = await fetch(`${OMDB_BASE}?${query.toString()}`);
    return resp.json();
  };

  const selectCountryFromMovie = (movie) => {
    const parts = (movie.Country || "")
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    for (const part of parts) {
      const key = matchCountryKey(part);
      if (key) {
        setSelectedKey(key);
        zoomToCountry(key);
        return key;
      }
    }
    return null;
  };

  const handleSuggestionClick = async (item, setPosterUrl) => {
    setSuggestions([]);
    if (item.imdbID) {
      const detail = await fetchOmdb({ i: item.imdbID });
      if (detail.Response === "True") {
        selectCountryFromMovie(detail);
        if (detail.Poster && detail.Poster !== "N/A") {
          setPosterUrl(detail.Poster.replace("http://", "https://"));
        }
      }
    }
  };

  const addMovie = async ({ title, review, rating, posterUrl, posterData, countryKey, countryName }) => {
    const finalKey = countryKey || selectedKey;
    const finalCountry = countryName || selectedCountry?.name;
    if (!user || !finalKey || !finalCountry) return;
    const { data, error } = await supabase.from("movies").insert({
      user_id: user.id,
      title,
      rating: rating || null,
      review,
      poster_url: posterUrl || null,
      poster_data: posterData || null,
      country_key: finalKey,
      country_name: finalCountry,
    }).select("*").single();

    if (!error && data) {
      setMovies((prev) => [data, ...prev]);
      setStatus("Movie added.");
    } else {
      setStatus(error?.message || "Unable to save movie.");
    }
  };

  const deleteMovie = async (movieId) => {
    if (!user) return;
    const { error } = await supabase
      .from("movies")
      .delete()
      .eq("id", movieId)
      .eq("user_id", user.id);
    if (!error) {
      setMovies((prev) => prev.filter((m) => m.id !== movieId));
    }
  };

  const clearSelected = async () => {
    if (!selectedKey || !user) return;
    const ok = window.confirm(`Clear all movies for ${selectedCountry?.name || "this country"}?`);
    if (!ok) return;
    const { error } = await supabase
      .from("movies")
      .delete()
      .eq("user_id", user.id)
      .eq("country_key", selectedKey);
    if (!error) {
      setMovies((prev) => prev.filter((m) => m.country_key !== selectedKey));
    }
  };

  const clearAll = async () => {
    if (!user) return;
    const ok = window.confirm("Clear all movies for every country?");
    if (!ok) return;
    const { error } = await supabase.from("movies").delete().eq("user_id", user.id);
    if (!error) {
      setMovies([]);
      setSelectedKey(null);
    }
  };

  if (!user) return null;

  const selectedMovies = selectedKey ? (moviesByCountry.get(selectedKey) || []) : [];

  return (
    <div className={`app ${mapMax ? "map-max" : ""}`}>
      <header className="hero">
        <div>
          <div className="kicker">Movie tracking made simpler</div>
          <h1>CineList</h1>
          <p>Click a country to log movies, reviews, and posters. Everything saves in your account.</p>
        </div>
        <div className="header-right">
          <nav className="top-nav" aria-label="Primary">
            <Link href="/about" className="nav-link">About</Link>
            <Link href="/movie-list" className="nav-link">Movie List</Link>
            <Link href="/movie-finder" className="nav-link">Movie Finder</Link>
            <Link href="/logout" className="nav-link">Logout</Link>
          </nav>
          <div className="stats">
            <div className="stat">
              <div className="stat-label">Countries With Movies</div>
              <div className="stat-value">{checkedCount}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Total Countries</div>
              <div className="stat-value">{countries.length}</div>
            </div>
          </div>
        </div>
      </header>

      <main>
        <section className="map-panel">
          <button
            className="map-toggle"
            type="button"
            onClick={() => {
              document.body.classList.toggle("map-maximized");
              setMapMax((v) => !v);
            }}
          >
            {mapMax ? "Restore Map" : "Maximize Map"}
          </button>
          <button
            className="map-reset"
            type="button"
            onClick={() => {
              if (!svgRef.current || !zoomRef.current) return;
              d3.select(svgRef.current).transition().duration(500).call(zoomRef.current.transform, d3.zoomIdentity);
            }}
          >
            Reset Zoom
          </button>
          <div id="map" ref={mapRef} aria-label="Interactive world map"></div>
          <div id="mapTooltip" ref={tooltipRef} className="map-tooltip" role="status" aria-live="polite"></div>
          <div className="legend">
            <div className="legend-item"><span className="swatch checked"></span>Has movies</div>
            <div className="legend-item"><span className="swatch"></span>No movies</div>
          </div>
        </section>

        <section className="side-panel">
          <div className="controls">
            <button className="secondary" type="button" onClick={clearSelected}>Clear Selected</button>
          </div>

          <div className="selected">
            <div className="selected-label">Selected Country</div>
            <div className="selected-name">{selectedCountry ? selectedCountry.name : "Select a country"}</div>
            <div className="selected-meta">{selectedCountry ? `${selectedMovies.length} movie(s) logged` : "No country selected"}</div>
          </div>

          <MovieForm
            status={status}
            setStatus={setStatus}
            onSuggest={async (title, setSuggestionsState) => {
              if (title.trim().length < 2) {
                setSuggestionsState([]);
                return;
              }
              const data = await fetchOmdb({ s: title, type: "movie" });
              if (data.Response === "True" && Array.isArray(data.Search)) {
                setSuggestionsState(data.Search.slice(0, 6));
              } else {
                setSuggestionsState([]);
              }
            }}
            onSuggestionClick={handleSuggestionClick}
            onSubmit={addMovie}
            selectedKey={selectedKey}
            selectCountryFromMovie={selectCountryFromMovie}
            fetchOmdb={fetchOmdb}
            setSuggestions={setSuggestions}
            suggestions={suggestions}
            countries={countries}
          />

          <div className="movie-list">
            {selectedMovies.length === 0 ? (
              <div className="selected-meta">No movies yet. Add the first one below.</div>
            ) : (
              selectedMovies.map((movie) => (
                <div className="movie-card" key={movie.id}>
                  <img
                    src={movie.poster_url || movie.poster_data || "data:image/svg+xml;charset=UTF-8," + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='72' height='104'><rect width='100%' height='100%' fill='#f4efe1'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='10' fill='#7a6b4f'>No Poster</text></svg>")}
                    alt={movie.title}
                  />
                  <div>
                    <h3>{movie.title}</h3>
                    <p>{movie.review || "No review yet."}</p>
            <div className="meta">
              <span>{movie.rating ? `${movie.rating}/5` : "No rating"}</span>
              <span>{new Date(movie.created_at).toLocaleDateString()}</span>
              <button className="secondary" type="button" onClick={() => deleteMovie(movie.id)}>Delete</button>
            </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="search">
            <label htmlFor="searchInput">Find a country</label>
            <input
              id="searchInput"
              type="text"
              placeholder="Type a country name"
              value={searchTerm}
              onChange={(e) => {
                const value = e.target.value;
                setSearchTerm(value);
                const match = countries.find((c) => c.name.toLowerCase().startsWith(value.toLowerCase())) ||
                  countries.find((c) => c.name.toLowerCase().includes(value.toLowerCase()));
                if (match) {
                  setSelectedKey(match.key);
                  zoomToCountry(match.key);
                }
              }}
            />
          </div>
          <div className="list">
            {filteredCountries.map((c) => {
              const count = (moviesByCountry.get(c.key) || []).length;
              return (
                <div
                  key={c.key}
                  className={`country-item${count ? " checked" : ""}${selectedKey === c.key ? " active" : ""}`}
                  onClick={() => setSelectedKey(c.key)}
                >
                  <span>{c.name}</span>
                  <div className="mark">
                    <div className="dot">{count ? "✓" : ""}</div>
                    <span>{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}

function MovieForm({
  status,
  setStatus,
  onSuggest,
  onSuggestionClick,
  onSubmit,
  selectedKey,
  selectCountryFromMovie,
  fetchOmdb,
  suggestions,
  setSuggestions,
  countries,
}) {
  const titleRef = useRef(null);
  const posterUrlRef = useRef(null);
  const posterFileRef = useRef(null);
  const reviewRef = useRef(null);
  const suggestTimerRef = useRef(null);
  const [ratingValue, setRatingValue] = useState(0);

  const handleInput = () => {
    if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
    suggestTimerRef.current = setTimeout(async () => {
      const title = titleRef.current?.value || "";
      await onSuggest(title, setSuggestions);
    }, 250);
  };

  const handleBlur = () => {
    setTimeout(() => setSuggestions([]), 150);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus("");
    const title = titleRef.current?.value?.trim() || "";
    if (!title) {
      setStatus("Movie title is required.");
      return;
    }

    let keyFromMovie = null;
    const detail = await fetchOmdb({ t: title, type: "movie" });
    if (detail.Response === "True") {
      keyFromMovie = selectCountryFromMovie(detail);
      if (detail.Poster && detail.Poster !== "N/A" && posterUrlRef.current) {
        posterUrlRef.current.value = detail.Poster.replace("http://", "https://");
      }
    }

    const finalKey = selectedKey || keyFromMovie;
    if (!finalKey) {
      setStatus("Select a country on the map first.");
      return;
    }

    const finalCountry = countries.find((c) => c.key === finalKey)?.name || "";
    const ratingNumber = ratingValue > 0 ? ratingValue : null;

    let posterData = "";
    const file = posterFileRef.current?.files?.[0];
    if (file) {
      posterData = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => resolve("");
        reader.readAsDataURL(file);
      });
    }

    await onSubmit({
      title,
      review: reviewRef.current?.value?.trim() || "",
      rating: ratingNumber,
      posterUrl: posterUrlRef.current?.value?.trim() || "",
      posterData,
      countryKey: finalKey,
      countryName: finalCountry,
    });

    event.target.reset();
    setRatingValue(0);
    setSuggestions([]);
  };

  return (
    <form className="movie-form" onSubmit={handleSubmit}>
      <label htmlFor="movieTitle">Movie title</label>
      <input id="movieTitle" ref={titleRef} type="text" placeholder="Enter a movie title" required autoComplete="off" onInput={handleInput} onBlur={handleBlur} />
      <div className="suggestions">
        {suggestions.map((item) => (
          <div
            key={item.imdbID}
            className="suggestion-item"
            onMouseDown={() => onSuggestionClick(item, (url) => {
              if (posterUrlRef.current) posterUrlRef.current.value = url;
            })}
          >
            {item.Title} ({item.Year})
          </div>
        ))}
      </div>

      <div className="rating-header">
        <label>Rating</label>
        <div className="rating-value">
          {ratingValue ? `${ratingValue} out of 5` : "Not rated"}
        </div>
      </div>
      <div className="rating-picker" role="radiogroup" aria-label="Movie rating">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            className={`rating-star${value <= ratingValue ? " filled" : ""}`}
            aria-pressed={value <= ratingValue}
            aria-label={`${value} star${value === 1 ? "" : "s"}`}
            onClick={() => setRatingValue(value)}
          >
            ★
          </button>
        ))}
      </div>

      <label htmlFor="movieReview">Review</label>
      <textarea id="movieReview" ref={reviewRef} rows={4} placeholder="Write your thoughts..."></textarea>

      <label htmlFor="posterUrl">Poster (optional)</label>
      <div className="poster-row">
        <input id="posterUrl" ref={posterUrlRef} type="url" placeholder="https://..." />
        <input id="posterFile" ref={posterFileRef} type="file" accept="image/*" />
      </div>

      <button type="submit" className="primary">Add Movie</button>
      <div className="status">{status}</div>
    </form>
  );
}
