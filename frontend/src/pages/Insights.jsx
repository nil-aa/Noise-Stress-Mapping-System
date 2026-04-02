import React from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./Insights.css";

const sections = [
  {
    title: "Capture",
    text: "The check-in flow records a short microphone sample and extracts RMS and peak values to estimate acoustic intensity.",
  },
  {
    title: "Transform",
    text: "Readings are normalized into a stress score so the backend can aggregate multiple reports into an interpretable surface.",
  },
  {
    title: "Communicate",
    text: "Markers, heatmaps, and supporting UI panels make the system easier to present to faculty, teammates, and reviewers.",
  },
];

function Insights() {
  const hasToken = Boolean(localStorage.getItem("token"));

  return (
    <div className="insights-page">
      <Navbar />

      <main className="insights-main">
        <section className="insights-hero">
          <span className="section-label">System Narrative</span>
          <h1>From raw sound samples to readable environmental stress maps.</h1>
          <p>
            This page gives your professor a cleaner explanation of what the system does, why the
            map matters, and how each interface layer supports the project story.
          </p>
        </section>

        <section className="insight-cards">
          {sections.map((section) => (
            <article className="insight-card" key={section.title}>
              <h2>{section.title}</h2>
              <p>{section.text}</p>
            </article>
          ))}
        </section>

        <section className="insights-band">
          <div>
            <span className="section-label">Design Upgrade</span>
            <h2>Why the interface now feels more complete</h2>
          </div>
          <div className="insights-list">
            <p>Landing, dashboard, and insights screens create a stronger project structure.</p>
            <p>Animated cards and gradients add motion without making the app feel noisy.</p>
            <p>Leaflet marker sizing now stays stable when users zoom out and back in.</p>
          </div>
        </section>

        <div className="insights-actions">
          <Link className="insights-cta" to={hasToken ? "/dashboard" : "/login"}>
            {hasToken ? "Open Dashboard" : "Sign In to Continue"}
          </Link>
        </div>
      </main>
    </div>
  );
}

export default Insights;
