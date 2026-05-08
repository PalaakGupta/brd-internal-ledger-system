import { useState } from "react"

function TransactionForm({ onTransaction, onConsume, resources, loading }) {
  const [type, setType] = useState("deposit")
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [message, setMessage] = useState(null)

  const consumables = resources.filter(r => r.category === "consumable")
  const bookables = resources.filter(r => r.category === "bookable")

  async function handleSubmit(e) {
    e.preventDefault()
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
    setTimeout(() => setMessage(null), 3000)
  }

  async function handleConsume(resourceId) {
    const result = await onConsume(resourceId)
    if (result.success) {
      setMessage({ success: true, text: result.message })
    } else {
      setMessage({ success: false, error: result.error })
    }
    setTimeout(() => setMessage(null), 4000)
  }

  return (
    <div className="card transaction-form">

      {consumables.length > 0 && (
        <>
          <h2>Quick Consume</h2>
          <div className="resource-grid">
            {consumables.map(r => (
              <button
                key={r.id}
                className="resource-btn"
                onClick={() => handleConsume(r.id)}
                disabled={loading}
              >
                <span className="resource-icon">{r.icon}</span>
                <span className="resource-name">{r.name}</span>
                <span className="resource-price">₹{r.price}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {bookables.length > 0 && (
        <>
          <h2 style={{ marginTop: "20px" }}>Book a Resource</h2>
          <div className="resource-grid">
            {bookables.map(r => {
              const unavailable = r.available_units !== null && r.available_units <= 0
              return (
                <button
                  key={r.id}
                  className={`resource-btn bookable ${unavailable ? "unavailable" : ""}`}
                  onClick={() => handleConsume(r.id)}
                  disabled={loading || unavailable}
                >
                  <span className="resource-icon">{r.icon}</span>
                  <span className="resource-name">{r.name}</span>
                  <span className="resource-price">₹{r.price}</span>
                  {r.available_units !== null && (
                    <span className={`resource-avail ${unavailable ? "none" : ""}`}>
                      {unavailable ? "Fully booked" : `${r.available_units}/${r.total_units} free`}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}

      <h2 style={{ marginTop: "20px" }}>Manual Transaction</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="type">Type</label>
          <select id="type" value={type} onChange={e => setType(e.target.value)}>
            <option value="deposit">Deposit</option>
            <option value="deduct">Deduct</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="amount">Amount (₹)</label>
          <input
            id="amount"
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            min="0.01"
            step="0.01"
          />
        </div>
        <div className="form-group">
          <label htmlFor="description">Description (optional)</label>
          <input
            id="description"
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="e.g. Monthly top-up"
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