import { useEffect, useState } from "react";
import { getApiHealth } from "./api.js";

function App() {
  const [health, setHealth] = useState({ state: "loading", details: null });

  useEffect(() => {
    let isMounted = true;

    getApiHealth()
      .then((details) => {
        if (isMounted) setHealth({ state: "online", details });
      })
      .catch((error) => {
        if (isMounted) setHealth({ state: "offline", error: error.message });
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="page-shell">
      <header className="topbar">
        <a className="wordmark" href="/" aria-label="SPCS home">
          <span className="wordmark-icon" aria-hidden="true">N</span>
          <span>Nativity Girls’ School</span>
        </a>
        <span className="topbar-label">Parent–Teacher Communication</span>
      </header>

      <section className="welcome-card" aria-labelledby="welcome-title">
        <div className="welcome-copy">
          <p className="eyebrow">School communication, in one place</p>
          <h1 id="welcome-title">Welcome to SPCS</h1>
          <p className="intro">
            A secure place for families and school staff to stay connected about
            learning, attendance, and school life.
          </p>
          <div className={"service-status service-status--" + health.state} role="status" aria-live="polite">
            <span className="status-dot" aria-hidden="true" />
            {health.state === "loading" && "Connecting to the school service…"}
            {health.state === "online" && "School service is connected"}
            {health.state === "offline" && "School service is not available"}
          </div>
          {health.state === "offline" && <p className="status-detail">{health.error}</p>}
          {health.state === "online" && health.details?.database !== "connected" && (
            <p className="status-detail">The API is running. MongoDB will be connected during the database setup phase.</p>
          )}
        </div>

        <aside className="welcome-note" aria-label="System information">
          <span className="note-mark" aria-hidden="true">✦</span>
          <p className="note-label">Built for the school community</p>
          <p>Parents, teachers, and administrators will each have tools suited to their role.</p>
          <span className="note-school">Nativity Girls’ School · Addis Ababa</span>
        </aside>
      </section>

      <footer className="page-footer">
        <span>School–Parent Communication System</span>
        <span>Development foundation</span>
      </footer>
    </main>
  );
}

export default App;