import { useState, useEffect } from "react"
import Login from "./components/Login"
import BalanceCard from "./components/BalanceCard"
import TransactionForm from "./components/TransactionForm"
import AuditTrail from "./components/AuditTrail"
import SummaryBar from "./components/SummaryBar"
import "./App.css"
const API = "http://localhost:8080"

function App() {
  const [auth, setAuth] = useState(null)
  const [user, setUser] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingTimeout, setLoadingTimeout] = useState(false)
  const [lastTransactionType, setLastTransactionType] = useState(null)

  // Fetch balance whenever userId changes
  useEffect(() => {
    if (!auth) return
    const timer = setTimeout(() => setLoadingTimeout(true), 5000)
    fetchUser()
    fetchTransactions()
    fetchSummary()
    return () => {
      clearTimeout(timer)
      setLoadingTimeout(false)
      setUser(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth])


  function getHeaders() {
    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${auth?.token}`
    }
  }

  async function fetchUser() {
    try {
      const res = await fetch(`${API}/balance/${auth.user_id}`, { headers: getHeaders() })
      if (!res.ok) throw new Error("User not found")
      const data = await res.json()
      setUser(data)
      setError(null)
    } catch (err) {
      setError(err.message)
      setUser(null)
    }
  }

  async function fetchTransactions() {
    try {
      const res = await fetch(`${API}/transactions/${auth.user_id}`, { headers: getHeaders() })
      const data = await res.json()
      setTransactions(data)
    } catch (err) {
      console.error("Could not fetch transactions", err)
    }
  }

  async function fetchSummary() {
    try {
      const res = await fetch(`${API}/summary/${auth.user_id}`, { headers: getHeaders() })
      const data = await res.json()
      setSummary(data)
    } catch (err) {
      console.error("Could not fetch summary", err)
    }
  }

  async function handleTransaction(type, amount, description) {
    setLoading(true)
    try {
      const res = await fetch(`${API}/transact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

      setLastTransactionType(type)
      setTimeout(() => setLastTransactionType(null), 1500)

      // Refresh both balance and transactions after successful transaction
      await fetchUser()
      await fetchTransactions()
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  function handleLogin(data) {
    setAuth(data)
  }

  function handleLogout() {
    setAuth(null)
    setUser(null)
    setTransactions([])
    setSummary(null)
  }

  if (!auth) return <Login onLogin={handleLogin} />

   return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1>Internal Ledger</h1>
          <span className="header-subtitle">Office Resource Manager</span>
        </div>
        <div className="header-right">
          <span className="header-user">👤 {auth.name}</span>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <SummaryBar summary={summary} />
       <main className="app-main">
        <BalanceCard
          user={user}
          loadingTimeout={loadingTimeout}
          flashType={lastTransactionType}
        />
        <TransactionForm onTransaction={handleTransaction} loading={loading} />
        <AuditTrail transactions={transactions} />
      </main>
    </div>
  )
}

export default App