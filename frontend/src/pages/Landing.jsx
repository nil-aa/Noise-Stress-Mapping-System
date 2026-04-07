import React from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./Landing.css";

const features = [
  {
    title: "Live geospatial dashboard",
    description:
      "Watch your map refresh with personal readings, nearby reports, and heatmap overlays in one presentation-ready screen.",
  },
  {
    title: "Field-friendly check-ins",
    description:
      "Capture short microphone samples, estimate stress intensity, and save observations directly back to the mapping backend.",
  },
  {
    title: "Clear communication layer",
    description:
      "Landing, insights, and dashboard pages now give the project a stronger story for demos, viva reviews, and faculty evaluation.",
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
            <span className="section-label">Urban Sound Analytics</span>
            <h1>Noise stress mapping for smarter environmental storytelling.</h1>
            <p>
              Present a system that feels complete: a polished landing page, animated interface,
              protected live dashboard, and insight-driven design built around real spatial data.
            </p>

            <div className="landing-actions">
              <Link className="landing-primary" to={hasToken ? "/dashboard" : "/register"}>
                {hasToken ? "Open Dashboard" : "Launch Project"}
              </Link>
              <Link className="landing-secondary" to="/insights">
                Explore Insights
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
