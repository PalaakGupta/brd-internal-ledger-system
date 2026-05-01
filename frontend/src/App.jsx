import { useState, useEffect } from "react"
import BalanceCard from "./components/BalanceCard"
import TransactionForm from "./components/TransactionForm"
import AuditTrail from "./components/AuditTrail"
import "./App.css"

const API = "http://localhost:8000"

function App() {
  const [userId, setUserId] = useState(1)
  const [user, setUser] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  // Fetch balance whenever userId changes
  useEffect(() => {
    fetchUser()
    fetchTransactions()
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  async function fetchUser() {
    try {
      const res = await fetch(`${API}/balance/${userId}`)
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
      const res = await fetch(`${API}/transactions/${userId}`)
      const data = await res.json()
      setTransactions(data)
    } catch (err) {
      console.error("Could not fetch transactions")
      setError(err.message)
    }
  }

  async function handleTransaction(type, amount, description) {
    setLoading(true)
    try {
      const res = await fetch(`${API}/transact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          type,
          amount: parseFloat(amount),
          description
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail)

      // Refresh both balance and transactions after successful transaction
      await fetchUser()
      await fetchTransactions()
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Internal Ledger System</h1>
        <div className="user-selector">
          <label>Select User: </label>
          <select value={userId} onChange={e => setUserId(Number(e.target.value))}>
            <option value={1}>Palak</option>
            <option value={2}>Rahul</option>
            <option value={3}>Sneha</option>
          </select>
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <main className="app-main">
        <BalanceCard user={user} />
        <TransactionForm onTransaction={handleTransaction} loading={loading} />
        <AuditTrail transactions={transactions} />
      </main>
    </div>
  )
}

export default App