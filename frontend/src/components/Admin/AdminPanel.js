import { useState } from "react";
import "./AdminPanel.css";

import AdminRooms from "./rooms/AdminRooms";
import AdminThemes from "./themes/AdminThemes";
import AdminServices from "./services/AdminServices";

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState("rooms");

  function handleLogout() {
    localStorage.removeItem("token");
    window.location.href = "/";
  }

  return (
    <div className="admin-panel">
      {/* SIDEBAR */}
      <aside className="admin-sidebar">
        <div className="admin-header">
          <h2>🔧 Admin Panel</h2>
          <p className="admin-subtitle">Cityscape Hotel</p>
        </div>

        <nav className="admin-nav">
          <button
            className={activeTab === "rooms" ? "active" : ""}
            onClick={() => setActiveTab("rooms")}
          >
            🏨 Camere
          </button>

          <button
            className={activeTab === "themes" ? "active" : ""}
            onClick={() => setActiveTab("themes")}
          >
            🎨 Teme
          </button>

          <button
            className={activeTab === "services" ? "active" : ""}
            onClick={() => setActiveTab("services")}
          >
            ⚡ Servicii
          </button>
        </nav>

        <button className="logout-btn" onClick={handleLogout}>
          🚪 Deconectare
        </button>
      </aside>

      {/* CONTENT */}
      <main className="admin-content">
        {/* Admin Header with Avatar */}
        <div className="admin-content-header">
          <h1>
            {activeTab === "rooms" && "Gestionare Camere"}
            {activeTab === "themes" && "Gestionare Teme"}
            {activeTab === "services" && "Gestionare Servicii"}
          </h1>
          <div className="admin-profile">
            <div className="admin-info">
              <p className="admin-name">Marinescu Catinca</p>
              <p className="admin-email">admin@cityscape.com</p>
            </div>
            <div className="admin-avatar">
              <img src={require("../../assets/pozaAdmin.jpg")} alt="Admin" />
            </div>
          </div>
        </div>

        {/* Content Tabs */}
        {activeTab === "rooms" && <AdminRooms />}
        {activeTab === "themes" && <AdminThemes />}
        {activeTab === "services" && <AdminServices />}
      </main>
    </div>
  );
}
