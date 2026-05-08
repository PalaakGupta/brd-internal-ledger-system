import { useState, useEffect } from "react"

function AdminPanel({ resources, onRefresh, showMessage, API }) {
  const [users, setUsers] = useState([])
  const [newResource, setNewResource] = useState({
    name: "", price: "", icon: "📦", category: "consumable", total_units: ""
  })
  const [depositUserId, setDepositUserId] = useState("")
  const [depositAmount, setDepositAmount] = useState("")
  const [depositDesc, setDepositDesc] = useState("")

  useEffect(() => {
    fetch(`${API}/admin/users`)
      .then(r => r.json())
      .then(setUsers)
      .catch(console.error)
  }, [API])

  async function handleAddResource(e) {
    e.preventDefault()
    const body = {
      name: newResource.name,
      price: parseFloat(newResource.price),
      icon: newResource.icon,
      category: newResource.category,
      total_units: newResource.total_units ? parseInt(newResource.total_units) : null
    }
    const res = await fetch(`${API}/admin/resource`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    })
    if (res.ok) {
      showMessage("Resource added successfully")
      setNewResource({ name: "", price: "", icon: "📦", category: "consumable", total_units: "" })
      onRefresh()
    } else {
      const data = await res.json()
      showMessage(data.detail, "error")
    }
  }

  async function handleDeleteResource(id, name) {
    if (!window.confirm(`Delete "${name}"?`)) return
    const res = await fetch(`${API}/admin/resource/${id}`, { method: "DELETE" })
    if (res.ok) {
      showMessage(`${name} removed`)
      onRefresh()
    }
  }

  async function handleAdminDeposit(e) {
    e.preventDefault()
    const res = await fetch(
      `${API}/admin/deposit?user_id=${depositUserId}&amount=${depositAmount}&description=${encodeURIComponent(depositDesc)}`,
      { method: "POST" }
    )
    if (res.ok) {
      showMessage("Deposit successful")
      setDepositAmount("")
      setDepositDesc("")
      onRefresh()
      fetch(`${API}/admin/users`).then(r => r.json()).then(setUsers)
    } else {
      const data = await res.json()
      showMessage(data.detail, "error")
    }
  }

  return (
    <div className="admin-panel">

      <div className="card">
        <h2>All Users</h2>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
  <h2 style={{ margin: 0 }}>All Users</h2>
  <button
    onClick={() => window.open("http://localhost:8080/export/group", "_blank")}
    style={{
      padding: "6px 14px",
      background: "#fff8e1",
      border: "1.5px solid #f39c12",
      borderRadius: "8px",
      color: "#e67e22",
      fontSize: "0.82rem",
      fontWeight: 600,
      cursor: "pointer",
      width: "auto"
    }}
  >
    ⬇ Export All
  </button>
</div>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Balance</th>
              <th>Transactions</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td style={{ color: "#aaa", fontSize: "0.85rem" }}>{u.email}</td>
                <td style={{ fontWeight: 700, color: u.balance < 50 ? "#e74c3c" : "#27ae60" }}>
                  ₹{parseFloat(u.balance).toFixed(2)}
                </td>
                <td style={{ color: "#aaa" }}>{u.transaction_count}</td>
                <td>
                  {u.is_admin
                    ? <span className="role-badge admin">Admin</span>
                    : <span className="role-badge user">User</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>Top Up User Balance</h2>
        <form onSubmit={handleAdminDeposit} className="admin-form">
          <div className="form-group">
            <label>User</label>
            <select value={depositUserId} onChange={e => setDepositUserId(e.target.value)} required>
              <option value="">Select user</option>
              {users.filter(u => !u.is_admin).map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} (₹{parseFloat(u.balance).toFixed(2)})
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Amount (₹)</label>
            <input
              type="number"
              value={depositAmount}
              onChange={e => setDepositAmount(e.target.value)}
              placeholder="0.00" min="1" step="0.01" required
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <input
              type="text"
              value={depositDesc}
              onChange={e => setDepositDesc(e.target.value)}
              placeholder="e.g. Monthly top-up"
            />
          </div>
          <button type="submit" className="deposit">Top Up</button>
        </form>
      </div>

      <div className="card">
        <h2>Manage Resources</h2>
        <div className="resource-admin-list">
          {resources.map(r => (
            <div key={r.id} className="resource-admin-item">
              <span className="resource-admin-icon">{r.icon}</span>
              <div className="resource-admin-info">
                <span className="resource-admin-name">{r.name}</span>
                <span className="resource-admin-meta">
                  ₹{r.price} • {r.category}
                  {r.total_units && ` • ${r.available_units}/${r.total_units} available`}
                </span>
              </div>
              <button
                className="delete-btn"
                onClick={() => handleDeleteResource(r.id, r.name)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <h2 style={{ marginTop: "24px" }}>Add New Resource</h2>
        <form onSubmit={handleAddResource} className="admin-form">
          <div className="admin-form-row">
            <div className="form-group">
              <label>Icon</label>
              <input
                type="text"
                value={newResource.icon}
                onChange={e => setNewResource({ ...newResource, icon: e.target.value })}
                style={{ width: "60px", textAlign: "center", fontSize: "1.3rem" }}
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Name</label>
              <input
                type="text"
                value={newResource.name}
                onChange={e => setNewResource({ ...newResource, name: e.target.value })}
                placeholder="e.g. Green Tea" required
              />
            </div>
            <div className="form-group">
              <label>Price (₹)</label>
              <input
                type="number"
                value={newResource.price}
                onChange={e => setNewResource({ ...newResource, price: e.target.value })}
                placeholder="0" min="1" required style={{ width: "80px" }}
              />
            </div>
          </div>
          <div className="admin-form-row">
            <div className="form-group">
              <label>Category</label>
              <select
                value={newResource.category}
                onChange={e => setNewResource({ ...newResource, category: e.target.value })}
              >
                <option value="consumable">Consumable</option>
                <option value="bookable">Bookable</option>
              </select>
            </div>
            {newResource.category === "bookable" && (
              <div className="form-group">
                <label>Total Units</label>
                <input
                  type="number"
                  value={newResource.total_units}
                  onChange={e => setNewResource({ ...newResource, total_units: e.target.value })}
                  placeholder="e.g. 5" min="1"
                />
              </div>
            )}
          </div>
          <button type="submit" className="deposit">Add Resource</button>
        </form>
      </div>

    </div>
  )
}

export default AdminPanel