function SummaryBar({ summary }) {
  if (!summary) return null

  const net = parseFloat(summary.total_deposited) - parseFloat(summary.total_spent)

  return (
    <div className="summary-bar">
      <div className="summary-item">
        <span className="summary-label">This Month Deposited</span>
        <span className="summary-value deposit">₹{parseFloat(summary.total_deposited).toFixed(2)}</span>
      </div>
      <div className="summary-divider" />
      <div className="summary-item">
        <span className="summary-label">This Month Spent</span>
        <span className="summary-value deduct">₹{parseFloat(summary.total_spent).toFixed(2)}</span>
      </div>
      <div className="summary-divider" />
      <div className="summary-item">
        <span className="summary-label">Net This Month</span>
        <span className={`summary-value ${net >= 0 ? "deposit" : "deduct"}`}>
          ₹{net.toFixed(2)}
        </span>
      </div>
      <div className="summary-divider" />
      <div className="summary-item">
        <span className="summary-label">Transactions</span>
        <span className="summary-value">{summary.transaction_count}</span>
      </div>
    </div>
  )
}

export default SummaryBar