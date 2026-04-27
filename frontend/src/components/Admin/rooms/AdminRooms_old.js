import { useEffect, useState } from "react";
import "../AdminPanel.css";
import "../rewards/AdminRewards.css";
import "../services/AdminServices.css";

export default function AdminRooms() {
  const [rooms, setRooms] = useState([]);
  const [themes, setThemes] = useState([]);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    floor: "",
    status: "available",
    RoomThemeId: ""
  });

  /* ======================
     LOAD DATA
  ====================== */
  async function loadData() {
    try {
      const r = await fetch("http://localhost:9001/api/rooms");
      const t = await fetch("http://localhost:9001/api/room-themes");

      setRooms(await r.json());
      setThemes(await t.json());
    } catch (err) {
      console.error("Loading error:", err);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  /* ======================
     FORM HANDLERS
  ====================== */
  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    await fetch("http://localhost:9001/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        HotelId: 1
      })
    });

    setForm({
      floor: "",
      status: "available",
      RoomThemeId: ""
    });

    loadData();
  }

  /* ======================
     FILTER
  ====================== */
  const filteredRooms = rooms.filter(r => {
    const theme = themes.find(t => t.RoomThemeId === r.RoomThemeId);

    return (
      String(r.RoomId).includes(search) ||
      String(r.floor).includes(search) ||
      (theme &&
        (
          theme.name?.toLowerCase().includes(search.toLowerCase()) ||
          theme.city?.toLowerCase().includes(search.toLowerCase())
        ))
    );
  });

  /* ======================
     JSX
  ====================== */
  return (
    <>
      {/* ADD ROOM - MODERN CARD DESIGN */}
      <div className="service-form-container">
        <div className="service-form-card">
          <h3>Add New Room</h3>

          <form onSubmit={handleSubmit}>
            {/* ROOM DETAILS CARD */}
            <div className="form-section">
              <div className="section-title">Room Details</div>
              <div className="form-grid-2col">
                <div className="form-group">
                  <label>Floor</label>
                  <input
                    name="floor"
                    value={form.floor}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                  >
                    <option value="available">Available</option>
                    <option value="occupied">Occupied</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Theme</label>
                  <select
                    name="RoomThemeId"
                    value={form.RoomThemeId}
                    onChange={handleChange}
                    required
                    style={{ gridColumn: 'span 2' }}
                  >
                    <option value="">Select theme</option>
                    {themes.map(t => (
                      <option key={t.RoomThemeId} value={t.RoomThemeId}>
                        {t.name} – {t.city}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <button type="submit" className="btn-submit">Add Room</button>
          </form>
        </div>
      </div>

      {/* ROOM LIST */}
      <div className="admin-rewards-list-card">
        <h3>Room List ({filteredRooms.length})</h3>

        <div className="admin-rewards-list-header">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search room or theme..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Room #</th>
              <th>Floor</th>
              <th>Status</th>
              <th>Theme</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {filteredRooms.map(r => {
              const theme = themes.find(
                t => t.RoomThemeId === r.RoomThemeId
              );

              return (
                <tr key={r.RoomId}>
                  <td>
                    <strong>#{r.RoomId}</strong>
                  </td>

                  <td>{r.floor || "—"}</td>

                  <td>
                    <span className={`status-badge ${r.status}`}>
                      {r.status}
                    </span>
                  </td>

                  <td>
                    {theme ? (
                      <div>
                        <strong>{theme.name}</strong>
                        <div className="muted">{theme.city}</div>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>

                  <td className="actions-cell">
                    <button
                      className="delete-action-btn"
                      title="Delete room"
                      onClick={async () => {
                        if (!window.confirm("Delete this room?")) return;

                        try {
                          await import("../../../services/roomService")
                            .then(m => m.deleteRoom(r.RoomId));
                          await loadData();
                        } catch {
                          alert("Delete error!");
                        }
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}