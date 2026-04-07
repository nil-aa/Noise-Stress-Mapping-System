import React from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./Insights.css";

const sections = [
  {
    title: "Capture",
    text: "Collect short, geotagged audio samples and user observations to document noise events.",
  },
  {
    title: "Transform",
    text: "Normalize readings into a stress score to enable consistent aggregation across locations and time.",
  },
  {
    title: "Communicate",
    text: "Visualize trends through heatmaps, markers, and locality summaries for clear stakeholder briefing.",
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
          <h1>From sound samples to actionable noise insights.</h1>
          <p>
            Review how field recordings are converted into stress scores, mapped geographically,
            and summarized for formal reporting.
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
            <span className="section-label">Communication Focus</span>
            <h2>How results are communicated</h2>
          </div>
          <div className="insights-list">
            <p>A documented workflow from field capture to verified reporting.</p>
            <p>Locality summaries that translate readings into decision-ready evidence.</p>
            <p>Map views that support comparative review across time and location.</p>
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
