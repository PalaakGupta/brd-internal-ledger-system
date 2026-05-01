function AuditTrail({ transactions }) {
  if (!transactions.length) {
    return <div className="card">No transactions yet.</div>
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
              <td>{new Date(tx.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default AuditTrail