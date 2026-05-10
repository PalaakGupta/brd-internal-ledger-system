function formatTime(dateStr) {
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "2-digit", month: "short",
    hour: "2-digit", minute: "2-digit", hour12: true
  })
}

function MyBookings({ bookings, onRelease, loading }) {
  if (!bookings.length) {
    return (
      <div className="card">
        <h2>My Active Bookings</h2>
        <p className="empty-state">No active bookings.</p>
      </div>
    )
  }

  return (
    <div className="card">
      <h2>My Active Bookings</h2>
      <div className="bookings-list">
        {bookings.map(b => {
          const endsAt = new Date(b.ends_at)
          const now = new Date()
          const minutesLeft = Math.max(0, Math.round((endsAt - now) / 60000))
          const isExpired = minutesLeft === 0

          return (
            <div key={b.id} className={`booking-item ${isExpired ? "expired" : "active"}`}>
              <div className="booking-icon">{b.icon}</div>
              <div className="booking-info">
                <span className="booking-name">{b.resource_name}</span>
                <span className="booking-time">
                  Booked: {formatTime(b.booked_at)}
                </span>
                <span className="booking-ends">
                  {isExpired
                    ? "⚠️ Time expired — please release"
                    : `Ends: ${formatTime(b.ends_at)} (${minutesLeft} min left)`
                  }
                </span>
              </div>
              <button
                className={`release-btn ${isExpired ? "urgent" : ""}`}
                onClick={() => onRelease(b.id)}
                disabled={loading}
              >
                Release
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default MyBookings