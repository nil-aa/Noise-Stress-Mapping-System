import React from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./Insights.css";

const sections = [
  {
    title: "Capture",
    text: "Record short, geotagged observations with audio and notes to document noise incidents.",
  },
  {
    title: "Analyze",
    text: "Convert each reading into a stress score so patterns can be compared across time and location.",
  },
  {
    title: "Report",
    text: "Present hotspots, trends, and locality summaries in a format suitable for review and action.",
  },
];

function Insights() {
  const hasToken = Boolean(localStorage.getItem("token"));

  return (
    <div className="insights-page">
      <Navbar />

      <main className="insights-main">
        <section className="insights-hero">
          <span className="section-label">System Overview</span>
          <h1>From field readings to usable noise insights.</h1>
          <p>
            See how the system captures observations, converts them into stress signals, and turns
            them into maps and summaries for decision-making.
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
            <span className="section-label">Outputs</span>
            <h2>What the platform delivers</h2>
          </div>
          <div className="insights-list">
            <p>A structured workflow from field capture to reporting.</p>
            <p>Locality summaries that support review, complaints, and planning.</p>
            <p>Map views for comparing conditions across time and place.</p>
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
