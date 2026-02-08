import SiteNav from "../components/SiteNav";

export default function AboutPage() {
  return (
    <div className="app">
      <header className="hero">
        <SiteNav />
        <div className="hero-body">
          <div>
            <div className="kicker">CineList lets you...</div>
            <h1>About</h1>
            <p>CineList is a personal tracker for logging movies by country, with reviews and posters saved to your account.</p>
          </div>
        </div>
      </header>

      <div className="sub-main">
        <section className="about-grid">
          <article className="about-card">
            <div className="about-icon">👁️</div>
            <div className="about-text">Keep track of every film you have watched and organize it by country on the map.</div>
          </article>
          <article className="about-card">
            <div className="about-icon">❤️</div>
            <div className="about-text">Save favorites with ratings and quick notes so the movies you love stand out.</div>
          </article>
          <article className="about-card">
            <div className="about-icon">📝</div>
            <div className="about-text">Write and save short reviews for each movie so you remember what you felt.</div>
          </article>
          <article className="about-card">
            <div className="about-icon">⭐</div>
            <div className="about-text">Rate every film on a five‑star scale and see your library grow over time.</div>
          </article>
          <article className="about-card">
            <div className="about-icon">📅</div>
            <div className="about-text">Keep a diary with dates and import your history using CSV when needed.</div>
          </article>
          <article className="about-card">
            <div className="about-icon">🗂️</div>
            <div className="about-text">Browse everything in My List and manage your collection in one place.</div>
          </article>
        </section>
      </div>
    </div>
  );
}
