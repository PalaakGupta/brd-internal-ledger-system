import { useState } from "react"

const API = "http://localhost:8080"

function Register({ onBack }) {
  // Three fields: name, email, password
  const [form, setForm] = useState({ name: "", email: "", password: "" })
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    // Update only the field that changed, keep others
    setForm({ ...form, [e.target.id]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`${API}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail)
      setSuccess(true)
      // Go back to login after 2 seconds
      setTimeout(() => onBack(), 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Success state — show confirmation before redirecting
  if (success) {
    return (
      <div className="login-page">
        <div className="login-card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "16px" }}>✅</div>
          <h2 style={{ color: "#27ae60" }}>Account Created!</h2>
          <p style={{ color: "#888", marginTop: "8px" }}>Redirecting to login...</p>
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
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          {error && <div className="error-msg">{error}</div>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="login-hint" style={{ cursor: "pointer" }} onClick={onBack}>
          Already have an account? Sign in
        </p>
      </div>
    </div>
  )
}

export default Register