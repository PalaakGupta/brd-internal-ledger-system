import { useState } from "react"

function TransactionForm({ onTransaction, loading }) {
  const [type, setType] = useState("deposit")
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [message, setMessage] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()

    // Frontend validation — basic check before hitting API
    if (!amount || parseFloat(amount) <= 0) {
      setMessage({ success: false, error: "Enter a valid amount" })
      return
    }

    const result = await onTransaction(type, amount, description)

    if (result.success) {
      setMessage({ success: true, text: "Transaction successful!" })
      setAmount("")
      setDescription("")
    } else {
      setMessage({ success: false, error: result.error })
    }

    // Clear message after 3 seconds
    setTimeout(() => setMessage(null), 3000)
  }

  return (
    <div className="card transaction-form">
      <h2>New Transaction</h2>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Type</label>
          <select value={type} onChange={e => setType(e.target.value)}>
            <option value="deposit">Deposit</option>
            <option value="deduct">Deduct (Purchase)</option>
          </select>
        </div>

        <div className="form-group">
          <label>Amount (₹)</label>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            min="0.01"
            step="0.01"
          />
        </div>

        <div className="form-group">
          <label>Description (optional)</label>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="e.g. Coffee, Snack"
          />
        </div>

        <button type="submit" disabled={loading} className={type}>
          {loading ? "Processing..." : type === "deposit" ? "Deposit" : "Deduct"}
        </button>
      </form>

      {message && (
        <div className={message.success ? "success-msg" : "error-msg"}>
          {message.success ? message.text : message.error}
        </div>
      )}
    </div>
  )
}

export default TransactionForm