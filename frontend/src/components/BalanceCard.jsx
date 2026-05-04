function BalanceCard({ user, loadingTimeout, flashType }) {
  if (!user && loadingTimeout) {
    return (
      <div className="card error-card">
        <p>Cannot connect to server.</p>
        <p className="error-hint">Is the backend running on port 8080?</p>
      </div>
    )
  }

  if (!user) return <div className="card">Loading user...</div>

  return (
    <div className={`card balance-card ${flashType ? `flash-${flashType}` : ""}`}>
      <h2>Account Balance</h2>
      <p className="user-name">{user.name}</p>
      <p className="balance-amount">
        ₹{parseFloat(user.balance).toFixed(2)}
      </p>
      <p className="user-email">{user.email}</p>
    </div>
  )
}

export default BalanceCard