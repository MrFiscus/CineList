"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as d3 from "d3";
import { feature } from "topojson-client";
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

export default function MovieFinderPage() {
  const router = useRouter();
  const mapRef = useRef(null);
  const tooltipRef = useRef(null);
  const svgRef = useRef(null);
  const zoomRef = useRef(null);
  const mapGroupRef = useRef(null);
  const mapSizeRef = useRef({ width: 0, height: 0 });
  const suggestTimerRef = useRef(null);

  const [user, setUser] = useState(null);
  const [countries, setCountries] = useState([]);
  const [countryIndex, setCountryIndex] = useState(new Map());
  const [status, setStatus] = useState("");
  const [results, setResults] = useState([]);
  const [foundKeys, setFoundKeys] = useState(new Set());
  const [posterUrl, setPosterUrl] = useState("");
  const [suggestions, setSuggestions] = useState([]);

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

  const matchCountryKey = (name) => {
    const norm = normalize(name);
    if (countryIndex.has(norm)) return countryIndex.get(norm);
    if (aliases.has(norm)) {
      const alias = aliases.get(norm);
      if (countryIndex.has(alias)) return countryIndex.get(alias);
    }
    return null;
  };

  const updateMapClasses = (keys) => {
    const svg = svgRef.current;
    if (!svg) return;
    d3.select(svg)
      .selectAll("path.country")
      .classed("found", (d) => keys.has(d.properties?.__key));
  };

  const zoomToCountry = (key) => {
    const svg = svgRef.current;
    const zoom = zoomRef.current;
    if (!svg || !zoom) return;
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
      .classed("found", (d) => foundKeys.has(d.properties?.__key))
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
  };

  useEffect(() => {
    if (countries.length === 0) return;
    renderMap();
    const handleResize = () => renderMap();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [countries]);

  useEffect(() => {
    updateMapClasses(foundKeys);
  }, [foundKeys]);

  const fetchOmdb = async (params) => {
    const query = new URLSearchParams({ ...params, apikey: process.env.NEXT_PUBLIC_OMDB_KEY });
    const resp = await fetch(`${OMDB_BASE}?${query.toString()}`);
    return resp.json();
  };

  const applyCountries = (items) => {
    const keys = new Set();
    let firstKey = null;
    for (const item of items) {
      const parts = (item.Country || "")
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
      for (const part of parts) {
        const key = matchCountryKey(part);
        if (key) {
          keys.add(key);
          if (!firstKey) firstKey = key;
        }
      }
    }
    setFoundKeys(keys);
    if (firstKey) zoomToCountry(firstKey);
  };

  const findMovie = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const title = form.finderTitle.value.trim();
    const year = form.finderYear.value.trim();
    const director = form.finderDirector.value.trim().toLowerCase();

    setStatus("Searching...");
    setResults([]);
    setPosterUrl("");
    setFoundKeys(new Set());

    if (!title) {
      setStatus("Movie title is required.");
      return;
    }

    let data = await fetchOmdb({ t: title, y: year, type: "movie" });
    let resultsList = [];

    if (data.Response === "True") {
      if (!director || (data.Director || "").toLowerCase().includes(director)) {
        resultsList = [data];
      }
    }

    if (resultsList.length === 0) {
      const search = await fetchOmdb({ s: title, y: year, type: "movie" });
      if (search.Response === "True" && Array.isArray(search.Search)) {
        const candidates = search.Search.slice(0, 5);
        const details = [];
        for (const item of candidates) {
          const detail = await fetchOmdb({ i: item.imdbID });
          if (detail.Response === "True") {
            if (!director || (detail.Director || "").toLowerCase().includes(director)) {
              details.push(detail);
            }
          }
        }
        resultsList = details;
      }
    }

    if (resultsList.length === 0) {
      setStatus("No matching movie found.");
      return;
    }

    setStatus(`Found ${resultsList.length} result(s).`);
    setResults(resultsList);
    applyCountries(resultsList);

    const first = resultsList[0];
    if (first?.Poster && first.Poster !== "N/A") {
      setPosterUrl(first.Poster.replace("http://", "https://"));
    } else {
      setPosterUrl("");
    }
  };

  const handleSuggest = async (value) => {
    const title = value.trim();
    if (title.length < 2) {
      setSuggestions([]);
      return;
    }
    const data = await fetchOmdb({ s: title, type: "movie" });
    if (data.Response === "True" && Array.isArray(data.Search)) {
      setSuggestions(data.Search.slice(0, 6));
    } else {
      setSuggestions([]);
    }
  };

  if (!user) return null;

  return (
    <div className="app">
      <header className="hero">
        <div>
          <div className="kicker">Movie Tracker</div>
          <h1>Movie Finder</h1>
          <p>Search and curate titles you want to watch, then add them to a country on the main map.</p>
        </div>
        <div className="header-right">
          <nav className="top-nav" aria-label="Primary">
            <Link href="/" className="nav-link">Home</Link>
            <Link href="/about" className="nav-link">About</Link>
            <Link href="/logout" className="nav-link">Logout</Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="map-panel">
          <div id="finderMap" ref={mapRef} aria-label="Movie finder world map"></div>
          <div id="finderTooltip" ref={tooltipRef} className="map-tooltip" role="status" aria-live="polite"></div>
        </section>
        <section className="side-panel">
          <form id="finderForm" className="finder-form" onSubmit={findMovie}>
            <label htmlFor="finderTitle">Movie title</label>
            <input
              id="finderTitle"
              name="finderTitle"
              type="text"
              placeholder="Enter a movie title"
              autoComplete="off"
              onInput={(e) => {
                if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
                suggestTimerRef.current = setTimeout(() => handleSuggest(e.target.value), 250);
              }}
              onBlur={() => setTimeout(() => setSuggestions([]), 150)}
              required
            />
            <div className="suggestions">
              {suggestions.map((item) => (
                <div
                  key={item.imdbID}
                  className="suggestion-item"
                  onMouseDown={() => {
                    const input = document.getElementById("finderTitle");
                    const yearInput = document.getElementById("finderYear");
                    if (input) input.value = item.Title;
                    if (yearInput && item.Year) yearInput.value = item.Year;
                    setSuggestions([]);
                  }}
                >
                  {item.Title} ({item.Year})
                </div>
              ))}
            </div>

            <label htmlFor="finderYear">Release year (optional)</label>
            <input id="finderYear" name="finderYear" type="number" min="1888" max="2100" placeholder="e.g. 2019" />

            <label htmlFor="finderDirector">Director (optional)</label>
            <input id="finderDirector" name="finderDirector" type="text" placeholder="e.g. Bong Joon-ho" />

            <button type="submit" className="primary">Find Movie</button>
            <div className="status">{status}</div>
            <div className="finder-poster">
              {posterUrl ? <img src={posterUrl} alt="Movie poster" /> : null}
            </div>
          </form>

          <div className="result-list">
            {results.length === 0 ? null : (
              results.map((item) => (
                <div className="result-card" key={item.imdbID || item.Title}>
                  <h3>{item.Title} ({item.Year})</h3>
                  <p>Director: {item.Director || "Unknown"}</p>
                  <p>Country: {item.Country || "Unknown"}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
