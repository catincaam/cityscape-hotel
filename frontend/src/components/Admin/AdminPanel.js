import { useState } from "react";
import "./AdminPanel.css";

import AdminRooms from "./rooms/AdminRooms";
import AdminThemes from "./themes/AdminThemes";
import AdminServices from "./services/AdminServices";
import AdminRewards from "./rewards/AdminRewards";
import AdminBookings from "./bookings";
import AdminFeedback from "./feedback/AdminFeedback";

// Noul dashboard premium
import AdminDashboardV2 from "./Dashboard/AdminDashboardV2";

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState("dashboard");

  function handleLogout() {
    localStorage.removeItem("token");
    window.location.href = "/";
  }

  return (
    <div className="admin-panel">
      {/* SIDEBAR */}
      <aside className="admin-sidebar">
        <div className="admin-header">
          <h2>Admin Panel</h2>
          <p className="admin-subtitle">Cityscape Hotel</p>
        </div>

        <nav className="admin-nav">
          <button
            className={activeTab === "dashboard" ? "active" : ""}
            onClick={() => setActiveTab("dashboard")}
          >
            Dashboard
          </button>
          <button
            className={activeTab === "rooms" ? "active" : ""}
            onClick={() => setActiveTab("rooms")}
          >
            Rooms
          </button>
          <button
            className={activeTab === "themes" ? "active" : ""}
            onClick={() => setActiveTab("themes")}
          >
            Themes
          </button>
          <button
            className={activeTab === "services" ? "active" : ""}
            onClick={() => setActiveTab("services")}
          >
            Services
          </button>
          <button
            className={activeTab === "bookings" ? "active" : ""}
            onClick={() => setActiveTab("bookings")}
          >
            Bookings
          </button>
          <button
            className={activeTab === "rewards" ? "active" : ""}
            onClick={() => setActiveTab("rewards")}
          >
            Rewards
          </button>
          <button
            className={activeTab === "feedback" ? "active" : ""}
            onClick={() => setActiveTab("feedback")}
          >
            Feedback
          </button>
        </nav>

        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </aside>

      {/* CONTENT */}
      <main className="admin-content">
        {/* Admin Header with Avatar */}
        <div className="admin-content-header">
          <h1>
            {activeTab === "dashboard" && "Reports & Analytics"}
            {activeTab === "rooms" && "Manage Rooms"}
            {activeTab === "themes" && "Manage Themes"}
            {activeTab === "services" && "Manage Services"}
            {activeTab === "bookings" && "Manage Bookings"}
            {activeTab === "rewards" && "Manage Rewards"}
            {activeTab === "feedback" && "Guest Feedback"}
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
        {activeTab === "dashboard" && <AdminDashboardV2 onViewAllFeedback={() => setActiveTab("feedback")} />}
        {activeTab === "rooms" && <AdminRooms />}
        {activeTab === "themes" && <AdminThemes />}
        {activeTab === "services" && <AdminServices />}
        {activeTab === "bookings" && <AdminBookings />}
        {activeTab === "rewards" && <AdminRewards />}
        {activeTab === "feedback" && <AdminFeedback />}
      </main>
    </div>
  );
}
