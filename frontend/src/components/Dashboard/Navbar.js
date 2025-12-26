import { useNavigate, useLocation } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import "./Navbar.css";
import logo from "../../assets/logo.svg";
import { logout } from "../../services/authService";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="navbar">
      <div className="brand" onClick={() => navigate("/dashboard")}>
        <img src={logo} alt="Cityscape Hotel" />
        <span>CityscapeHotel</span>
      </div>

      <ul className="nav-links">
        <li
          className={location.pathname === "/dashboard" ? "active" : ""}
          onClick={() => navigate("/dashboard")}
        >
          My Dashboard
        </li>

        <li
          className={location.pathname === "/booking" ? "active" : ""}
          onClick={() => navigate("/booking")}
        >
          Book Room
        </li>

        <li
          className={location.pathname === "/services" ? "active" : ""}
          onClick={() => navigate("/services")}
        >
          Services
        </li>
      </ul>

      <div className="profile-menu" ref={dropdownRef}>
        <div className="avatar" onClick={() => setShowDropdown(!showDropdown)}>👤</div>
        
        {showDropdown && (
          <div className="dropdown-menu">
            <div className="dropdown-item" onClick={() => { navigate("/profile"); setShowDropdown(false); }}>
              <span className="dropdown-icon">👤</span>
              Profilul meu
            </div>
            <div className="dropdown-divider"></div>
            <div className="dropdown-item logout" onClick={handleLogout}>
              <span className="dropdown-icon">🚪</span>
              Deconectare
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
