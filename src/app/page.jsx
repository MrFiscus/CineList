import SiteNav from "./components/SiteNav";

export default function Home() {
  return (
    <div className="app home-page home-dark">
      <header className="hero home-hero">
        <SiteNav />
      </header>

      
        <section className=" home-content home-main">
          <div className="home-hero-copy">
            <div className="kicker">Welcome to CineList.</div>
            <h1>Movie Tracking Made Simpler</h1>
            <p>Build your map, log the films you watch, and keep everything organized.</p>
            <a className="primary-cta" href="/add-movies">Get Started</a>
          </div>
        </section>

  
    </div>
  );
}
