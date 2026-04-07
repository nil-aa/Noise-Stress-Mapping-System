import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../api/authApi";
import Navbar from "../components/Navbar";
import "./Auth.css";

function Register() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    try {
      await register(form);
      navigate("/login");
    } catch {
      setError("Registration failed. Try a different email or verify the backend is running.");
    }
  };

  return (
    <div className="auth-page">
      <Navbar />
      <main className="auth-main auth-main-register">
        <section className="auth-panel auth-panel-info">
          <span className="section-label">Account Setup</span>
          <h1 className="auth-headline-wide">Create an account to submit and track noise readings.</h1>
          <p>
            Registration enables dashboard access, saved submissions, and formal reporting views.
          </p>
        </section>

        <section className="auth-panel auth-panel-form">
          <form className="auth-form" onSubmit={handleSubmit}>
            <div>
              <span className="section-label">Register</span>
              <h2>Create your account</h2>
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
                minLength={6}
                type="password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
              />
            </label>

            {error && <p className="auth-error">{error}</p>}

            <button className="auth-submit" type="submit">
              Create Account
            </button>

            <p className="auth-switch">
              Already registered? <Link to="/login">Sign in</Link>
            </p>
          </form>
        </section>
      </main>
    </div>
  );
}

export default Register;
