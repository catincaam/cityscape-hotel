import { useEffect, useState, useMemo } from "react";
import { deleteRoom } from "../../../services/roomService";
import { API_BASE_URL } from "../../../config/runtimeUrls";
import "./AdminRooms.css";
import "../rewards/AdminRewards.css";

function imageUrl(path) {
  if (!path) return "";
  return path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
}

export default function AdminRooms() {
  const [rooms, setRooms] = useState([]);
  const [themes, setThemes] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteConfirmInfo, setDeleteConfirmInfo] = useState("");

  const [form, setForm] = useState({
    floor: "",
    status: "available",
    RoomThemeId: ""
  });

  // Auto-hide notifications
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Load data
  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [roomRes, themeRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/rooms`),
        fetch(`${API_BASE_URL}/api/room-themes`)
      ]);
      
      const roomsData = await roomRes.json();
      const themesData = await themeRes.json();
      
      setRooms(Array.isArray(roomsData) ? roomsData : []);
      setThemes(Array.isArray(themesData) ? themesData : []);
    } catch (err) {
      console.error("Loading error:", err);
      setError("Error loading data");
      setRooms([]);
      setThemes([]);
    }
    setLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!form.floor || !form.RoomThemeId) {
      setError("All fields are required!");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          floor: form.floor.trim(),
          status: form.status,
          RoomThemeId: parseInt(form.RoomThemeId),
          HotelId: 1
        })
      });

      if (!response.ok) throw new Error("Failed to create room");

      setSuccess("Room created successfully!");
      setForm({
        floor: "",
        status: "available",
        RoomThemeId: ""
      });
      await fetchData();
    } catch (err) {
      setError(err.message || "Error creating room!");
    } finally {
      setLoading(false);
    }
  }

  const filteredRooms = useMemo(() => {
    if (!Array.isArray(rooms)) return [];
    return rooms.filter(r => {
      const theme = themes.find(t => t.RoomThemeId === r.RoomThemeId);
      const searchLower = search.toLowerCase();
      
      return (
        String(r.RoomId).includes(search) ||
        String(r.floor).includes(search) ||
        r.status.toLowerCase().includes(searchLower) ||
        (theme &&
          (
            theme.name?.toLowerCase().includes(searchLower) ||
            theme.city?.toLowerCase().includes(searchLower)
          ))
      );
    });
  }, [rooms, themes, search]);

  function handleDelete(roomId) {
    const room = rooms.find(r => r.RoomId === roomId);
    const theme = themes.find(t => t.RoomThemeId === room?.RoomThemeId);
    setDeleteConfirmInfo(`Room #${roomId} (${theme?.name || 'Theme'})`);
    setDeleteConfirm(roomId);
  }

  async function confirmDelete() {
    if (!deleteConfirm) return;
    
    try {
      setRooms(Array.isArray(rooms) ? rooms.filter(r => r.RoomId !== deleteConfirm) : []);
      await deleteRoom(deleteConfirm);
      setSuccess("Room deleted successfully!");
      setDeleteConfirm(null);
      setDeleteConfirmInfo("");
    } catch (err) {
      await fetchData();
      setError(err.message || "Error deleting room");
      setDeleteConfirm(null);
      setDeleteConfirmInfo("");
    }
  }

  function cancelDelete() {
    setDeleteConfirm(null);
    setDeleteConfirmInfo("");
  }

  const selectedTheme = themes.find(t => t.RoomThemeId === parseInt(form.RoomThemeId));
  const statusBadgeClass = form.status === "available" 
    ? "status-available" 
    : form.status === "occupied" 
      ? "status-occupied" 
      : "status-maintenance";

  return (
    <div className="admin-rewards-container">
      {/* HERO SECTION */}
      <div className="rewards-hero">
        <h1>Inventory Architecture</h1>
        <p>Room Curation & Strategy</p>
      </div>

      {/* FORM + PREVIEW SECTION */}
      <div className="rewards-creation-section">
        {/* LEFT: FORM */}
        <div className="rewards-form-wrapper">
          <div className="form-header">
            <h2>Register Room</h2>
          </div>

          <form onSubmit={handleSubmit} className="rewards-form">
            {/* FLOOR */}
            <div className="form-field">
              <label>Floor</label>
              <input
                type="text"
                placeholder="e.g., 04"
                value={form.floor}
                onChange={e => setForm({ ...form, floor: e.target.value })}
                required
                className="form-input"
              />
            </div>

            {/* STATUS */}
            <div className="form-field">
              <label>Status</label>
              <select
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value })}
                className="form-select"
              >
                <option value="available">Available</option>
                <option value="occupied">Occupied</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>

            {/* THEME */}
            <div className="form-field">
              <label>Theme</label>
              <select
                value={form.RoomThemeId}
                onChange={e => setForm({ ...form, RoomThemeId: e.target.value })}
                required
                className="form-select"
              >
                <option value="">Select theme</option>
                {themes.map(t => (
                  <option key={t.RoomThemeId} value={t.RoomThemeId}>
                    {t.name} – {t.city}
                  </option>
                ))}
              </select>
            </div>

            {/* ERROR MESSAGE */}
            {error && <div className="error-message">{error}</div>}

            {/* BUTTON */}
            <div className="form-actions">
              <button type="submit" disabled={loading} className="btn-primary">
                Register Room
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT: PREVIEW */}
        <div className="rewards-preview-wrapper">
          <div className="preview-header">
            <span className="preview-label">Instant Preview</span>
            {selectedTheme && <span className="preview-dot">● Visualizing live data</span>}
          </div>

          {selectedTheme ? (
            <div className="preview-card premium-preview-card">
              <div className="preview-image-wrapper">
                {selectedTheme.showcaseImage ? (
                  <img 
                    src={imageUrl(selectedTheme.showcaseImage)}
                    alt={selectedTheme.name} 
                    className="preview-image" 
                  />
                ) : selectedTheme.images && selectedTheme.images.length > 0 ? (
                  <img 
                    src={imageUrl(selectedTheme.images[0])}
                    alt={selectedTheme.name} 
                    className="preview-image" 
                  />
                ) : (
                  <div className="no-image-preview premium-image-fallback">
                    <span>Room Visual</span>
                  </div>
                )}
                <div className={`preview-badge ${statusBadgeClass}`}>{form.status}</div>
              </div>

              <div className="preview-content">
                <div className="preview-live-strip">
                  <span>Room floor {form.floor || "--"}</span>
                  <span>Configured preview</span>
                </div>
                <div className="preview-category">{selectedTheme.city}</div>
                <h3 className="preview-title">{selectedTheme.name}</h3>
                <p className="preview-description">{selectedTheme.description}</p>
                
                <div className="preview-meta">
                  <span className="meta-item">
                    <span className="meta-label">Floor:</span>
                    <span className="meta-value">{form.floor || "—"}</span>
                  </span>
                  <span className="meta-item">
                    <span className="meta-label">Capacity:</span>
                    <span className="meta-value">{selectedTheme.maxGuests} guests</span>
                  </span>
                  <span className="meta-item">
                    <span className="meta-label">Size:</span>
                    <span className="meta-value">{selectedTheme.size} m²</span>
                  </span>
                </div>

                <button className="preview-btn" disabled>Room Details</button>
              </div>
            </div>
          ) : (
            <div className="preview-empty premium-preview-empty">
              <div className="empty-icon">🏨</div>
              <div className="preview-blueprint">
                <span />
                <span />
                <span />
              </div>
              <strong>Room preview awaits a theme</strong>
              <p>Select a theme and the card will render the room as guests will experience it.</p>
            </div>
          )}
        </div>
      </div>

      {/* EXISTING ROOMS */}
      <div className="existing-inventory">
        <div className="inventory-header">
          <h2>Managed Assets: In-Rotation Total</h2>
          <p>{filteredRooms.length} rooms</p>
        </div>

        {/* SEARCH */}
        <div className="inventory-controls">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search rooms..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        {/* ROOMS GRID */}
        {loading ? (
          <div className="loading-state">Loading...</div>
        ) : filteredRooms.length === 0 ? (
          <div className="empty-state">No rooms yet. Register your first one above!</div>
        ) : (
          <div className="rewards-grid">
            {filteredRooms.map(r => {
              const theme = themes.find(t => t.RoomThemeId === r.RoomThemeId);
              const statusClass = r.status === "available" 
                ? "status-available" 
                : r.status === "occupied" 
                  ? "status-occupied" 
                  : "status-maintenance";

              return (
                <div key={r.RoomId} className="reward-card">
                  <div className="reward-card-image">
                    {theme?.showcaseImage ? (
                      <img src={imageUrl(theme.showcaseImage)} alt={theme.name} />
                    ) : theme?.images && theme.images.length > 0 ? (
                      <img src={imageUrl(theme.images[0])} alt={theme.name} />
                    ) : (
                      <div className="no-image">[No Image]</div>
                    )}
                    <div className={`reward-card-badge ${statusClass}`}>{r.status}</div>
                  </div>

                  <div className="reward-card-content">
                    <div className="reward-card-category">Floor {r.floor}</div>
                    <h4 className="reward-card-title">Room #{r.RoomId}</h4>
                    <p className="reward-card-desc">{theme?.name}</p>

                    <div className="reward-card-meta">
                      <span className={`type-badge`} style={{ background: '#dbeafe', color: '#1e40af' }}>
                        {theme?.city}
                      </span>
                    </div>
                  </div>

                  <div className="reward-card-actions">
                    <button 
                      className="action-btn delete" 
                      onClick={() => handleDelete(r.RoomId)} 
                      title="Delete"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-content delete-modal">
            <div className="modal-header">
              <h3>Delete Room?</h3>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete <strong>"{deleteConfirmInfo}"</strong>?</p>
              <p className="modal-warning">This action cannot be undone.</p>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={cancelDelete}>
                Cancel
              </button>
              <button className="btn-delete" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS TOAST */}
      {success && (
        <div className="toast toast-success">
          <div className="toast-icon">✓</div>
          <div className="toast-message">{success}</div>
        </div>
      )}

      {/* ERROR TOAST */}
      {error && (
        <div className="toast toast-error">
          <div className="toast-icon">⚠</div>
          <div className="toast-message">{error}</div>
        </div>
      )}
    </div>
  );
}
