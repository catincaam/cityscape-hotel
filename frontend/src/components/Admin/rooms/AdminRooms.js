import { useEffect, useState } from "react";
import "../AdminPanel.css";

export default function AdminRooms() {
  const [rooms, setRooms] = useState([]);
  const [themes, setThemes] = useState([]);
  const [form, setForm] = useState({
    floor: "",
    status: "disponibil",
    RoomThemeId: ""
  });

  async function loadData() {
    const r = await fetch("http://localhost:9001/api/rooms");
    const t = await fetch("http://localhost:9001/api/room-themes");
    setRooms(await r.json());
    setThemes(await t.json());
  }

  useEffect(() => {
    loadData();
  }, []);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    await fetch("http://localhost:9001/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, HotelId: 1 })
    });

    setForm({ floor: "", status: "disponibil", RoomThemeId: "" });
    loadData();
  }

  return (
    <>
      <div className="add-theme-form">
        <h3>Adaugă cameră nouă</h3>

        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group">
            <label>Etaj</label>
            <input name="floor" value={form.floor} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Status</label>
            <select name="status" value={form.status} onChange={handleChange}>
              <option value="disponibil">Disponibil</option>
              <option value="ocupat">Ocupat</option>
            </select>
          </div>

          <div className="form-group">
            <label>Temă</label>
            <select name="RoomThemeId" value={form.RoomThemeId} onChange={handleChange} required>
              <option value="">Selectează</option>
              {themes.map(t => (
                <option key={t.RoomThemeId} value={t.RoomThemeId}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <button className="add-btn">➕ Adaugă cameră</button>
        </form>
      </div>

      <div className="themes-list">
        <h3>Lista camere ({rooms.length})</h3>

        <table>
          <thead>
            <tr>
              <th>Cameră #</th>
              <th>Etaj</th>
              <th>Status</th>
              <th>Temă</th>
            </tr>
          </thead>
          <tbody>
            {rooms.map(r => {
              const theme = themes.find(t => t.RoomThemeId === r.RoomThemeId);
              return (
                <tr key={r.RoomId}>
                  <td>
                    <strong>#{r.RoomId}</strong>
                  </td>
                  <td>{r.floor || "—"}</td>
                  <td>
                    <span className={`status-badge ${r.status}`}>{r.status}</span>
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
