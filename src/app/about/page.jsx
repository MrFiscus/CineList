import SiteNav from "../components/SiteNav";

export default function AboutPage() {
  return (
    <div className="app">
      <header className="hero">
        <SiteNav />
        <div className="hero-body">
          <div>
            <div className="kicker">Movie tracking made simpler</div>
            <h1>About</h1>
            <p>CineList is a personal tracker for logging movies by country, with reviews and posters saved to your account.</p>
          </div>
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
