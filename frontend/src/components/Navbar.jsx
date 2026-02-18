import React, { useState } from "react";
import "./Navbar.css"; // optional if you want styling separated

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="navbar">
      <div className="navbar-logo">Noise Stress Mapping System</div>

      <div className={`navbar-links ${isOpen ? "active" : ""}`}>
        <a href="/">Home</a>
        <a href="/about">Noise Map</a>
      </div>

      <div
        className="hamburger"
        onClick={() => setIsOpen(!isOpen)}
      >
        ☰
      </div>
    </nav>
  );
};

export default Navbar;
