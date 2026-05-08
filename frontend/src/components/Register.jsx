import { useState } from "react"

const API = "http://localhost:8080"

function Register({ onBack }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  })
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setForm({ ...form, [e.target.id]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    // Frontend validation before hitting API
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match")
      return
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail)
      setSuccess(true)
      // Redirect back to login after 2 seconds
      setTimeout(() => onBack(), 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="login-page">
        <div className="login-card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "16px" }}>✅</div>
          <h2 style={{ color: "#27ae60", fontSize: "1.4rem" }}>
            Account Created!
          </h2>
          <p style={{ color: "#888", marginTop: "8px" }}>
            Redirecting to login...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1>Create Account</h1>
          <p>Join the shared resource fund</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              placeholder="Your name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@office.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Minimum 6 characters"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="Repeat your password"
              required
            />
          </div>

          {error && <div className="error-msg">{error}</div>}

          <button
            type="submit"
            className="login-btn"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p
          className="login-hint"
          style={{ cursor: "pointer", color: "#3498db", marginTop: "16px" }}
          onClick={onBack}
        >
          ← Back to login
        </p>
      </div>
    </div>
  )
}

export default Register