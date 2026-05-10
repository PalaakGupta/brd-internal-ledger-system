import { useState, useEffect } from "react"
import Login from "./components/Login"
import BalanceCard from "./components/BalanceCard"
import TransactionForm from "./components/TransactionForm"
import AuditTrail from "./components/AuditTrail"
import SummaryBar from "./components/SummaryBar"
import GroupDashboard from "./components/GroupDashboard"
import AdminPanel from "./components/AdminPanel"
import MyBookings from "./components/MyBookings"
import "./App.css"

const API = "http://localhost:8080"

function App() {
  const [auth, setAuth] = useState(null)
  const [activeTab, setActiveTab] = useState("personal")
  const [user, setUser] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [summary, setSummary] = useState(null)
  const [group, setGroup] = useState(null)
  const [activity, setActivity] = useState([])
  const [owing, setOwing] = useState([])
  const [resources, setResources] = useState([])
  const [fundData, setFundData] = useState(null)
  const [myBookings, setMyBookings] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingTimeout, setLoadingTimeout] = useState(false)
  const [lastTransactionType, setLastTransactionType] = useState(null)
  const [globalMessage, setGlobalMessage] = useState(null)
  const [auditOpen, setAuditOpen] = useState(false)

  // Runs every time auth changes — on login and logout
  useEffect(() => {
    if (!auth) return
    const timer = setTimeout(() => setLoadingTimeout(true), 5000)
    fetchAll()
    return () => {
      clearTimeout(timer)
      setLoadingTimeout(false)
      setUser(null)
    }
  }, [auth]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auth header sent with every protected API call
  function headers() {
    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${auth?.token || ""}`
    }
  }

  // Fetches all data in parallel — called after every action
  async function fetchAll() {
    await Promise.all([
      fetchUser(),
      fetchTransactions(),
      fetchSummary(),
      fetchFund(),
      fetchMyBookings(),
      fetchGroup(),
      fetchActivity(),
      fetchOwing(),
      fetchResources()
    ])
  }

  async function fetchUser() {
    try {
      const res = await fetch(`${API}/balance/${auth.user_id}`, { headers: headers() })
      if (res.status === 401) { setAuth(null); return }
      if (!res.ok) throw new Error()
      setUser(await res.json())
    } catch { setUser(null) }
  }

  async function fetchTransactions() {
    try {
      const res = await fetch(`${API}/transactions/${auth.user_id}`, { headers: headers() })
      setTransactions(await res.json())
    } catch { console.error("transactions failed") }
  }

  async function fetchSummary() {
    try {
      const res = await fetch(`${API}/summary/${auth.user_id}`, { headers: headers() })
      setSummary(await res.json())
    } catch { console.error("summary failed") }
  }

  // Fetches shared jar balance and member accountability
  async function fetchFund() {
    try {
      const res = await fetch(`${API}/fund`)
      setFundData(await res.json())
    } catch { console.error("fund fetch failed") }
  }

  // Fetches only active bookings for current user
  async function fetchMyBookings() {
    try {
      const res = await fetch(`${API}/bookings/active/${auth.user_id}`)
      setMyBookings(await res.json())
    } catch { console.error("bookings fetch failed") }
  }

  async function fetchGroup() {
    try {
      const res = await fetch(`${API}/group`)
      setGroup(await res.json())
    } catch { console.error("group failed") }
  }

  async function fetchActivity() {
    try {
      const res = await fetch(`${API}/activity`)
      setActivity(await res.json())
    } catch { console.error("activity failed") }
  }

  async function fetchOwing() {
    try {
      const res = await fetch(`${API}/owing`)
      setOwing(await res.json())
    } catch { console.error("owing failed") }
  }

  async function fetchResources() {
    try {
      const res = await fetch(`${API}/resources`)
      setResources(await res.json())
    } catch { console.error("resources failed") }
  }

  // Global toast message — auto dismisses after 4 seconds
  function showMessage(text, type = "success") {
    setGlobalMessage({ text, type })
    setTimeout(() => setGlobalMessage(null), 4000)
  }

  // Manual deposit or deduct — uses shared fund logic
  async function handleTransaction(type, amount, description) {
    setLoading(true)
    try {
      const res = await fetch(`${API}/transact`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          user_id: auth.user_id,
          type,
          amount: parseFloat(amount),
          description
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail)
      setLastTransactionType(type)
      setTimeout(() => setLastTransactionType(null), 1500)
      await fetchAll()
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  // Quick consume — taps a resource, auto deducts from shared fund
  async function handleConsume(resourceId) {
    setLoading(true)
    try {
      const res = await fetch(
        `${API}/consume?user_id=${auth.user_id}&resource_id=${resourceId}`,
        { method: "POST", headers: headers() }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail)

      setLastTransactionType("deduct")
      setTimeout(() => setLastTransactionType(null), 1500)

      // Show warning if jar is getting low
      if (data.low_balance_warning) {
        showMessage(
          `⚠️ Jar is running low! ₹${parseFloat(data.fund_balance).toFixed(2)} remaining.`,
          "warning"
        )
      }

      await fetchAll()
      return { success: true, message: data.message }
    } catch (err) {
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  // Releases a booked resource — makes it available again
  async function handleRelease(bookingId) {
    setLoading(true)
    try {
      const res = await fetch(`${API}/release/${bookingId}`, { method: "POST" })
      if (!res.ok) throw new Error("Release failed")
      showMessage("Resource released successfully")
      await fetchAll()
    } catch (err) {
      showMessage(err.message, "error")
    } finally {
      setLoading(false)
    }
  }

  // Clears all state on logout
  function handleLogout() {
    setAuth(null)
    setUser(null)
    setTransactions([])
    setSummary(null)
    setGroup(null)
    setActivity([])
    setOwing([])
    setFundData(null)
    setMyBookings([])
  }

  // Show login page if not authenticated
  if (!auth) return <Login onLogin={setAuth} />

  // Admin tab only visible to admin users
  const tabs = [
    { id: "personal", label: "My Account" },
    { id: "group", label: "Group Fund", badge: owing.length > 0 ? owing.length : null },
    ...(auth.is_admin ? [{ id: "admin", label: "⚙️ Admin" }] : [])
  ]

  return (
    <div className="app">

      {/* ── Header ── */}
      <header className="app-header">
        <div className="header-logo">
          <span className="header-logo-icon">⚖️</span>
          <div>
            <h1>Internal Ledger</h1>
            <span className="header-subtitle">Shared Resource Manager</span>
          </div>
        </div>
        <div className="header-right">
          <div className="header-user-info">
            <span className="header-user-name">👤 {auth.name}</span>
            {user && (
              <span className="header-balance">
                ₹{parseFloat(user.balance).toFixed(2)}
              </span>
            )}
          </div>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      {/* ── Global toast message ── */}
      {globalMessage && (
        <div className={`global-message ${globalMessage.type}`}>
          {globalMessage.text}
        </div>
      )}

      {/* ── Tab navigation ── */}
      <div className="tab-bar">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`tab-btn ${activeTab === t.id ? "active" : ""}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
            {t.badge && <span className="badge-alert">{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* ── Personal tab ── */}
      {activeTab === "personal" && (
        <>
          {/* Shared jar balance — always visible at top */}
          {fundData && (
            <div className="jar-balance-bar">
              <div className="jar-info">
                <span className="jar-label">🏺 Shared Jar Balance</span>
                <span className={`jar-amount ${fundData.total_balance < 100 ? "low" : ""}`}>
                  ₹{parseFloat(fundData.total_balance).toFixed(2)}
                </span>
              </div>
              {fundData.total_balance < 100 && (
                <span className="jar-warning">⚠️ Running low — please top up</span>
              )}
            </div>
          )}

          {/* Monthly summary stats */}
          <SummaryBar summary={summary} />

          {/* Two column layout */}
          <div className="two-col">

            {/* Left column — balance, audit, bookings */}
            <div className="col-left">
              <BalanceCard
                user={user}
                loadingTimeout={loadingTimeout}
                flashType={lastTransactionType}
              />
              <button
                className="audit-toggle-btn"
                onClick={() => setAuditOpen(true)}
              >
                📋 View Audit Trail ({transactions.length})
              </button>
              {myBookings.length > 0 && (
                <MyBookings
                  bookings={myBookings}
                  onRelease={handleRelease}
                  loading={loading}
                />
              )}
            </div>

            {/* Right column — transaction form */}
            <div className="col-right">
              <TransactionForm
                onTransaction={handleTransaction}
                onConsume={handleConsume}
                resources={resources}
                loading={loading}
              />
            </div>

          </div>
        </>
      )}

      {/* ── Group tab ── */}
      {activeTab === "group" && (
        <GroupDashboard
          group={group}
          activity={activity}
          owing={owing}
          currentUserId={auth.user_id}
        />
      )}

      {/* ── Admin tab ── */}
      {activeTab === "admin" && auth.is_admin && (
        <AdminPanel
          resources={resources}
          onRefresh={fetchAll}
          showMessage={showMessage}
          API={API}
        />
      )}

      {/* ── Audit trail drawer ── */}
      {auditOpen && (
        <div className="drawer-overlay" onClick={() => setAuditOpen(false)}>
          <div className="drawer" onClick={e => e.stopPropagation()}>
            <div className="drawer-header">
              <h2>Audit Trail</h2>
              <button
                className="drawer-close"
                onClick={() => setAuditOpen(false)}
              >
                ✕
              </button>
            </div>
            <AuditTrail
              transactions={transactions}
              userId={auth.user_id}
            />
          </div>
        </div>
      )}

    </div>
  )
}

export default App