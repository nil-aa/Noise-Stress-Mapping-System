import React from "react";
import Navbar from "../components/Navbar";
import "./Laws.css";

const legalCards = [
  {
    title: "Core Rule",
    detail:
      "The Noise Pollution (Regulation and Control) Rules, 2000 provide the national framework for ambient-noise limits, zoning categories, and loudspeaker restrictions.",
  },
  {
    title: "Where It Applies",
    detail:
      "In Tamil Nadu, the central framework is enforced through the Tamil Nadu Pollution Control Board, district administration, and local police under applicable notifications.",
  },
  {
    title: "Why It Matters",
    detail:
      "Consistent documentation of night-time construction, events, or amplified sound helps establish patterns against time and zone limits.",
  },
];

const limitRows = [
  { zone: "Industrial", day: "75 dB(A)", night: "70 dB(A)" },
  { zone: "Commercial", day: "65 dB(A)", night: "55 dB(A)" },
  { zone: "Residential", day: "55 dB(A)", night: "45 dB(A)" },
  { zone: "Silence zone", day: "50 dB(A)", night: "40 dB(A)" },
];

const complaintSteps = [
  "Document the exact locality, date, start time, and type of disturbance.",
  "If possible, attach repeated readings, notes, and saved audio clips from this app.",
  "For immediate local disturbance, approach the local police station or emergency complaint channel.",
  "For pollution-control escalation, use the Tamil Nadu Pollution Control Board complaint system.",
  "If the issue is recurring, carry a printed report showing dates, night-time pattern, and attached evidence.",
];

const officialSources = [
  {
    label: "CPCB ambient noise standards",
    href: "https://cpcb.nic.in/noise-pollution/",
    note: "Central Pollution Control Board source for area-category ambient noise limits.",
  },
  {
    label: "Tamil Nadu Pollution Control Board complaint status / complaint system",
    href: "https://tnpcb.gov.in/olgprs/login/complaintstatus",
    note: "State pollution-control route for complaint follow-up.",
  },
  {
    label: "MoEFCC annual report section referring to Noise Pollution Rules, 2000",
    href: "https://moef.gov.in/annual-report",
    note: "Official ministry source referring to the governing central rules framework.",
  },
];

function Laws() {
  return (
    <div className="laws-page">
      <Navbar />

      <main className="laws-main">
        <section className="laws-hero">
          <span className="section-label">Laws & Rights</span>
          <h1>Noise-law guidance for Chennai and Tamil Nadu users.</h1>
          <p>
            This page is a practical overview and not personal legal advice. The summaries below
            are based on official or primary public sources reviewed on April 2, 2026, and are
            intended to guide what to document and where to escalate a complaint.
          </p>
        </section>

        <section className="laws-card-grid">
          {legalCards.map((card) => (
            <article className="laws-card" key={card.title}>
              <h2>{card.title}</h2>
              <p>{card.detail}</p>
            </article>
          ))}
        </section>

        <section className="laws-panel">
          <div className="laws-panel-copy">
            <span className="section-label">Ambient Limits</span>
            <h2>Common ambient noise limits used in India</h2>
            <p>
              CPCB publishes day and night limits by land-use category. Day is generally 6:00 AM to
              10:00 PM and night is 10:00 PM to 6:00 AM, subject to local notifications.
            </p>
          </div>

          <div className="laws-table-wrap">
            <table className="laws-table">
              <thead>
                <tr>
                  <th>Zone</th>
                  <th>Day</th>
                  <th>Night</th>
                </tr>
              </thead>
              <tbody>
                {limitRows.map((row) => (
                  <tr key={row.zone}>
                    <td>{row.zone}</td>
                    <td>{row.day}</td>
                    <td>{row.night}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="laws-panel">
          <div className="laws-panel-copy">
            <span className="section-label">Practical Rules</span>
            <h2>Key practical points</h2>
          </div>

          <div className="laws-list">
            <p>Loudspeakers and public-address systems are generally restricted at night, unless a lawful exception applies.</p>
            <p>Silence zones around hospitals and educational institutions carry stricter limits.</p>
            <p>Recurring construction, event, traffic, or party noise is stronger evidence when timing, repetition, and night-time impact are documented.</p>
            <p>Police or pollution-control authorities may be relevant depending on urgency and the nature of the disturbance.</p>
          </div>
        </section>

        <section className="laws-panel">
          <div className="laws-panel-copy">
            <span className="section-label">Complaint Flow</span>
            <h2>Suggested evidence-to-complaint path</h2>
          </div>

          <div className="laws-steps">
            {complaintSteps.map((step, index) => (
              <div className="laws-step" key={step}>
                <strong>{index + 1}</strong>
                <p>{step}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="laws-panel">
          <div className="laws-panel-copy">
            <span className="section-label">Official Sources</span>
            <h2>Primary sources</h2>
          </div>

          <div className="source-list">
            {officialSources.map((source) => (
              <a className="source-card" href={source.href} key={source.href} rel="noreferrer" target="_blank">
                <strong>{source.label}</strong>
                <p>{source.note}</p>
                <span>{source.href}</span>
              </a>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default Laws;
