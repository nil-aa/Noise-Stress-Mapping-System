import { useNavigate } from "react-router-dom";
import React, { useState } from "react";
import "./Navbar.css"; // optional if you want styling separated

const Navbar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="navbar">
      <div className="navbar-logo">Noise Stress Mapping System</div>

      <div className={`navbar-links ${isOpen ? "active" : ""}`}>
        <a href="/">Home</a>
        <a href="/about">Noise Map</a>
        <button onClick={handleLogout} style={{ background: "none", border: "none", cursor: "pointer" }}>
        Logout
        </button>
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
