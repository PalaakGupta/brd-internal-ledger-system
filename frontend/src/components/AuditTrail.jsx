function formatDate(dateStr) {
  const date = new Date(dateStr)
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  })
}

function AuditTrail({ transactions }) {
  if (!transactions.length) {
    return (
      <div className="card audit-trail">
        <h2>Audit Trail</h2>
        <p className="empty-state">No transactions yet. Make a deposit to get started.</p>
      </div>
    )
  }

  return (
    <div className="card audit-trail">
      <h2>Audit Trail <span className="subtitle">(last 20 transactions)</span></h2>
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Amount</th>
            <th>Description</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map(tx => (
            <tr key={tx.id} className={tx.type}>
              <td>
                <span className={`badge ${tx.type}`}>
                  {tx.type === "deposit" ? "↑ Deposit" : "↓ Deduct"}
                </span>
              </td>
              <td>₹{parseFloat(tx.amount).toFixed(2)}</td>
              <td>{tx.description || "—"}</td>
              <td>{formatDate(tx.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default AuditTrail