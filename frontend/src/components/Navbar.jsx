import React, { useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import "./Navbar.css";

const publicLinks = [
  { to: "/", label: "Home" },
  { to: "/insights", label: "Insights" },
  { to: "/laws", label: "Laws & Rights" },
];

const privateLinks = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/insights", label: "Insights" },
  { to: "/laws", label: "Laws & Rights" },
];

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const hasToken = Boolean(localStorage.getItem("token"));
  const links = hasToken ? privateLinks : publicLinks;

  const closeMenu = () => setIsOpen(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    closeMenu();
    navigate("/login");
  };

  return (
    <header className="site-header">
      <nav className="navbar">
        <Link className="navbar-logo" to={hasToken ? "/dashboard" : "/"}>
          <span className="navbar-logo-mark">NS</span>
          <span>
            Noise Stress
            <small>Mapping System</small>
          </span>
        </Link>

        <button className="navbar-toggle" onClick={() => setIsOpen((value) => !value)} type="button">
          <span />
          <span />
          <span />
        </button>

        <div className={`navbar-links ${isOpen ? "active" : ""}`}>
          {links.map((link) => (
            <NavLink
              key={link.to}
              className={({ isActive }) => (isActive ? "nav-link active-link" : "nav-link")}
              onClick={closeMenu}
              to={link.to}
            >
              {link.label}
            </NavLink>
          ))}

          {hasToken ? (
            <button className="nav-action" onClick={handleLogout} type="button">
              Logout
            </button>
          ) : (
            <>
              {location.pathname !== "/login" && (
                <Link className="nav-link" onClick={closeMenu} to="/login">
                  Sign In
                </Link>
              )}
              {location.pathname !== "/register" && (
                <Link className="nav-action" onClick={closeMenu} to="/register">
                  Create Account
                </Link>
              )}
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

export default Navbar;
