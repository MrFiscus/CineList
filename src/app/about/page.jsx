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
            <div className="about-text">Keep track of every film you have watched, organize it by country on the map, and see how your movie journey grows as you log more titles, genres, and eras over time.</div>
          </article>
          <article className="about-card">
            <div className="about-icon">❤️</div>
            <div className="about-text">Save favorites with ratings, quick notes, and highlights so the movies you love stand out at a glance, and so you can quickly revisit the films that mean the most to you.</div>
          </article>
          <article className="about-card">
            <div className="about-icon">📝</div>
            <div className="about-text">Write and save short reviews for each movie so you remember what you felt, what worked, and what you would recommend, even months later when details fade.</div>
          </article>
          <article className="about-card">
            <div className="about-icon">⭐</div>
            <div className="about-text">Rate every film on a five-star scale and see your library grow over time, with top-rated films easy to spot and quick comparisons across your watch history.</div>
          </article>
          <article className="about-card">
            <div className="about-icon">📅</div>
            <div className="about-text">Keep a diary with watch dates and import your history using CSV when needed, so past entries are never lost and your full viewing timeline stays intact.</div>
          </article>
          <article className="about-card">
            <div className="about-icon">🗂️</div>
            <div className="about-text">Browse everything in My List and manage your collection in one place, including edits, posters, ratings, and any notes you want to keep with each film.</div>
          </article>
        </section>
      </div>
    </div>
  );
}



