import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="app">
      <header className="hero">
        <div>
          <div className="kicker">Movie tracking made simpler</div>
          <h1>About</h1>
          <p>CineList is a personal tracker for logging movies by country, with reviews and posters saved to your account.</p>
        </div>
        <div className="header-right">
          <nav className="top-nav" aria-label="Primary">
            <Link href="/" className="nav-link">Home</Link>
            <Link href="/movie-finder" className="nav-link">Movie Finder</Link>
            <Link href="/movie-list" className="nav-link">Movie List</Link>
            <Link href="/logout" className="nav-link">Logout</Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="side-panel">
          <div className="selected">
            <div className="selected-label">How it works</div>
            <div className="selected-name">Your movie map</div>
            <div className="selected-meta">
              Click a country on the map, add a movie title, optional poster, and review. Countries with at least one movie are highlighted. Your data stays in your account.
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
