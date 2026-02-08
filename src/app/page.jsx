export default function Home() {
  return (
    <div className="app home-page home-dark">
      <header className="hero home-hero">
        <div className="site-nav">
          <div className="nav-brand">CineList</div>
          <nav className="nav-links" aria-label="Primary">
            <a href="/" className="nav-link">Home</a>
            <a href="/add-movies" className="nav-link">Add Movies</a>
            <a href="/movie-list" className="nav-link">My List</a>
            <a href="/about" className="nav-link">About</a>
          </nav>
          <div className="nav-actions">
            <a href="/profile" className="nav-button primary">Profile</a>
            <a href="/logout" className="nav-button ghost">Logout</a>
          </div>
        </div>
      </header>

      
        <section className=" home-content home-main">
          <div className="home-hero-copy">
            <div className="kicker">Movie tracking made simpler</div>
            <h1>Movie Tracking Made Simple</h1>
            <p>Build your map, log the films you watch, and keep everything organized.</p>
            <a className="primary-cta" href="/add-movies">Get Started</a>
          </div>
        </section>

  
    </div>
  );
}
