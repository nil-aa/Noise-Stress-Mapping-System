import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { login } from "../api/authApi";
import Navbar from "../components/Navbar";
import "./Auth.css";

function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    try {
      const response = await login(form);
      localStorage.setItem("token", response.data.access_token);
      localStorage.setItem("refresh_token", response.data.refresh_token);
      navigate(location.state?.from || "/dashboard");
    } catch {
      setError("Invalid credentials. Please verify your email and password.");
    }
  };

  return (
    <div className="auth-page">
      <Navbar />
      <main className="auth-main">
        <section className="auth-panel auth-panel-info">
          <span className="section-label">Secure Access</span>
          <h1>Access the monitoring dashboard.</h1>
          <p>
            Sign in to review your readings, nearby reports, and current stress maps.
          </p>
        </section>

        <section className="auth-panel auth-panel-form">
          <form className="auth-form" onSubmit={handleSubmit}>
            <div>
              <span className="section-label">Sign In</span>
              <h2>Access your account</h2>
            </div>

            <label className="auth-field">
              <span>Email</span>
              <input
                required
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </label>

            <label className="auth-field">
              <span>Password</span>
              <input
                required
                type="password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
              />
            </label>

            {error && <p className="auth-error">{error}</p>}

            <button className="auth-submit" type="submit">
              Sign In
            </button>

            <p className="auth-switch">
              Need an account? <Link to="/register">Create one</Link>
            </p>
          </form>
        </section>
      </main>
    </div>
  );
}

export default Login;
