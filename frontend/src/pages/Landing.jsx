import React from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./Landing.css";

const features = [
  {
    title: "Integrated geospatial dashboard",
    description:
      "View personal readings, nearby activity, and heatmap layers in a single, decision-ready map.",
  },
  {
    title: "Structured field check-ins",
    description:
      "Record short audio samples, rate stress intensity, and store observations with time and location.",
  },
  {
    title: "Actionable locality reporting",
    description:
      "Generate locality summaries with evidence, trends, and recommendations to support formal complaints or planning.",
  },
];

function Landing() {
  const hasToken = Boolean(localStorage.getItem("token"));

  return (
    <div className="landing-page">
      <Navbar />

      <main className="landing-main">
        <section className="landing-hero">
          <div className="landing-copy">
            <span className="section-label">Environmental Noise Monitoring</span>
            <h1>Visualizing Noise to Improve Urban Living</h1>
            <p>
              Collect geotagged noise readings, analyze stress trends, and deliver localized insights
              for communities, researchers, and public authorities.
            </p>

            <div className="landing-actions">
              <Link className="landing-primary" to={hasToken ? "/dashboard" : "/register"}>
                {hasToken ? "Open Dashboard" : "Create Account"}
              </Link>
              <Link className="landing-secondary" to="/insights">
                View Insights
              </Link>
            </div>

          </div>

        </section>

        <section className="feature-grid">
          {features.map((feature, index) => (
            <article key={feature.title} className="feature-card" style={{ animationDelay: `${index * 120}ms` }}>
              <span className="feature-index">0{index + 1}</span>
              <h2>{feature.title}</h2>
              <p>{feature.description}</p>
            </article>
          ))}
        </section>

      </main>
    </div>
  );
}

export default Landing;
