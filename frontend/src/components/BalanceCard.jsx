function BalanceCard({ user }) {
  if (!user) return <div className="card">Loading user...</div>

  return (
    <div className="card balance-card">
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