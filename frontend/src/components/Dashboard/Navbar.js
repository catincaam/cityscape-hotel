import { useNavigate, useLocation } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { User } from "lucide-react";
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

  const isActive = (paths) => paths.some((path) => location.pathname === path || location.pathname.startsWith(`${path}/`));

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
          className={isActive(["/dashboard"]) ? "active" : ""}
          onClick={() => navigate("/dashboard")}
        >
          My Dashboard
        </li>

        <li
          className={isActive(["/booking", "/room"]) ? "active" : ""}
          onClick={() => navigate("/booking")}
        >
          Book Room
        </li>

        <li
          className={isActive(["/services"]) ? "active" : ""}
          onClick={() => navigate("/services")}
        >
          Services
        </li>
      </ul>

      <div className="profile-menu" ref={dropdownRef}>
        <button
          type="button"
          className="avatar"
          aria-label="Open profile menu"
          onClick={() => setShowDropdown(!showDropdown)}
        >
          <User size={18} strokeWidth={2.35} />
        </button>
        
        {showDropdown && (
          <div className="dropdown-menu">
            <div className="dropdown-item" onClick={() => { navigate("/profile"); setShowDropdown(false); }}>
              {/* <span className="dropdown-icon">👤</span> */}
              My Profile
            </div>
            <div className="dropdown-divider"></div>
            <div className="dropdown-item logout" onClick={handleLogout}>
              {/* <span className="dropdown-icon">🚪</span> */}
              Logout
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
