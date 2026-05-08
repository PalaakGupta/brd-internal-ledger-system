function formatDate(dateStr) {
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "2-digit", month: "short",
    hour: "2-digit", minute: "2-digit", hour12: true
  })
}

function GroupDashboard({ group, activity, owing, currentUserId }) {
  if (!group) return <div className="card">Loading group data...</div>

  const { users, total_fund, member_count, avg_balance } = group

  return (
    <div className="group-dashboard">

      <div className="fund-hero">
        <div className="fund-hero-item">
          <span className="fund-hero-label">Total Fund</span>
          <span className="fund-hero-value">₹{total_fund.toFixed(2)}</span>
        </div>
        <div className="fund-hero-divider" />
        <div className="fund-hero-item">
          <span className="fund-hero-label">Members</span>
          <span className="fund-hero-value">{member_count}</span>
        </div>
        <div className="fund-hero-divider" />
        <div className="fund-hero-item">
          <span className="fund-hero-label">Fair Share Each</span>
          <span className="fund-hero-value">₹{avg_balance.toFixed(2)}</span>
        </div>
      </div>

      {owing.length > 0 && (
        <div className="card owing-card">
          <h2>Who Owes What</h2>
          <p className="owing-explainer">
            Based on equal fair share of ₹{owing[0]?.avg_balance?.toFixed(2)} per member
          </p>
          <div className="owing-list">
            {owing.map(u => (
              <div key={u.id} className="owing-item">
                <div className="owing-left">
                  <span className="owing-name">{u.name}</span>
                  <span className="owing-balance-small">
                    Balance: ₹{u.balance.toFixed(2)}
                  </span>
                </div>
                <div className="owing-right">
                  <span className="owing-amount">Owes ₹{u.owes.toFixed(2)}</span>
                  <div className="owing-bar-wrap">
                    <div
                      className="owing-bar"
                      style={{
                        width: `${Math.min(100, (u.owes / u.avg_balance) * 100)}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {owing.length === 0 && (
        <div className="card balanced-card">
          <span className="balanced-icon">✅</span>
          <p>Everyone is balanced! No one owes anything.</p>
        </div>
      )}

      <div className="card">
        <h2>All Members</h2>
        <div className="group-list">
          {users.map((u, i) => (
            <div
              key={u.id}
              className={`group-item ${u.id === currentUserId ? "current-user" : ""}`}
            >
              <div className="group-rank">#{i + 1}</div>
              <div className="group-info">
                <span className="group-name">
                  {u.name}
                  {u.id === currentUserId && (
                    <span className="you-badge">You</span>
                  )}
                </span>
                <span className="group-meta">
                  Deposited: ₹{parseFloat(u.total_deposited).toFixed(2)} •
                  Spent: ₹{parseFloat(u.total_spent).toFixed(2)}
                </span>
              </div>
              <div className="group-right">
                <span className={`group-balance ${parseFloat(u.balance) < avg_balance ? "low" : "healthy"}`}>
                  ₹{parseFloat(u.balance).toFixed(2)}
                </span>
                {parseFloat(u.owes) > 0 ? (
                  <span className="owes-tag">owes ₹{parseFloat(u.owes).toFixed(2)}</span>
                ) : (
                  <span className="surplus-tag">+₹{parseFloat(u.surplus).toFixed(2)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>
          Activity Feed
          <span className="subtitle"> — all members</span>
        </h2>
        {activity.length === 0 ? (
          <p className="empty-state">No activity yet.</p>
        ) : (
          <div className="activity-list">
            {activity.map(tx => (
              <div key={tx.id} className={`activity-item ${tx.type}`}>
                <span className={`badge ${tx.type}`}>
                  {tx.type === "deposit" ? "↑" : "↓"}
                </span>
                <div className="activity-info">
                  <span className="activity-user">{tx.user_name}</span>
                  <span className="activity-desc">{tx.description || "—"}</span>
                </div>
                <div className="activity-right">
                  <span className={`activity-amount ${tx.type}`}>
                    {tx.type === "deposit" ? "+" : "-"}₹{parseFloat(tx.amount).toFixed(2)}
                  </span>
                  <span className="activity-time">{formatDate(tx.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default GroupDashboard