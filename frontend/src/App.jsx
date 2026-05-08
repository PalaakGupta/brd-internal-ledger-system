import { useState, useEffect } from "react"
import Login from "./components/Login"
import BalanceCard from "./components/BalanceCard"
import TransactionForm from "./components/TransactionForm"
import AuditTrail from "./components/AuditTrail"
import SummaryBar from "./components/SummaryBar"
import GroupDashboard from "./components/GroupDashboard"
import AdminPanel from "./components/AdminPanel"
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
  const [loading, setLoading] = useState(false)
  const [loadingTimeout, setLoadingTimeout] = useState(false)
  const [lastTransactionType, setLastTransactionType] = useState(null)
  const [globalMessage, setGlobalMessage] = useState(null)
  const [auditOpen, setAuditOpen] = useState(false)

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

  function headers() {
    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${auth?.token || ""}`
    }
  }

  async function fetchAll() {
    await Promise.all([
      fetchUser(), fetchTransactions(), fetchSummary(),
      fetchGroup(), fetchActivity(), fetchOwing(), fetchResources()
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

  function showMessage(text, type = "success") {
    setGlobalMessage({ text, type })
    setTimeout(() => setGlobalMessage(null), 4000)
  }

  async function handleTransaction(type, amount, description) {
    setLoading(true)
    try {
      const res = await fetch(`${API}/transact`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          user_id: auth.user_id, type,
          amount: parseFloat(amount), description
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
      if (data.low_balance_warning) {
        showMessage(`⚠️ Low balance! ₹${data.new_balance.toFixed(2)} remaining. Please top up.`, "warning")
      }
      await fetchAll()
      return { success: true, message: data.message }
    } catch (err) {
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  function handleLogout() {
    setAuth(null)
    setUser(null)
    setTransactions([])
    setSummary(null)
    setGroup(null)
    setActivity([])
    setOwing([])
  }

  if (!auth) return <Login onLogin={setAuth} />

  const tabs = [
    { id: "personal", label: "My Account" },
    { id: "group", label: "Group Fund", badge: owing.length > 0 ? owing.length : null },
    ...(auth.is_admin ? [{ id: "admin", label: "⚙️ Admin" }] : [])
  ]

  return (
    <div className="app">
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
            {user && <span className="header-balance">₹{parseFloat(user.balance).toFixed(2)}</span>}
          </div>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      {globalMessage && (
        <div className={`global-message ${globalMessage.type}`}>
          {globalMessage.text}
        </div>
      )}

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

      {activeTab === "personal" && (
        <>
          <SummaryBar summary={summary} />
          <div className="two-col">
            <div className="col-left">
              <BalanceCard
                user={user}
                loadingTimeout={loadingTimeout}
                flashType={lastTransactionType}
              />
              <button className="audit-toggle-btn" onClick={() => setAuditOpen(true)}>
                📋 View Audit Trail ({transactions.length})
              </button>
            </div>
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

      {activeTab === "group" && (
        <GroupDashboard
          group={group}
          activity={activity}
          owing={owing}
          currentUserId={auth.user_id}
        />
      )}

      {activeTab === "admin" && auth.is_admin && (
        <AdminPanel
          resources={resources}
          onRefresh={fetchAll}
          showMessage={showMessage}
          API={API}
        />
      )}

      {auditOpen && (
        <div className="drawer-overlay" onClick={() => setAuditOpen(false)}>
          <div className="drawer" onClick={e => e.stopPropagation()}>
            <div className="drawer-header">
              <h2>Audit Trail</h2>
              <button className="drawer-close" onClick={() => setAuditOpen(false)}>✕</button>
            </div>
            <AuditTrail transactions={transactions} userId={auth.user_id}/>
          </div>
        </div>
      )}
    </div>
  )
}

export default App