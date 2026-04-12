
import React, { useEffect, useState, useMemo } from "react";
import "./AdminBookings.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const PAGE_SIZE = 5;

export default function AdminBookings() {
    console.log("AdminBookings mounted");
  const [bookings, setBookings] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Functie de fetch
  const fetchBookings = () => {
    setLoading(true);
    fetch("/api/booking/admin/bookings")
      .then(async res => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`HTTP ${res.status}: ${text}`);
        }
        return res.json();
      })
      .then(data => {
        console.log("[AdminBookings] Received data from backend:", JSON.stringify(data.slice(0, 2), null, 2));
        setBookings(data);
        setLoading(false);
      })
      .catch(err => {
        setLoading(false);
        setBookings([]);
        console.error("Eroare la fetch bookings:", err);
        alert("Eroare la preluarea rezervărilor: " + err.message);
      });
  };

  // Load la mount + auto-refresh la fiecare 30 secunde
  useEffect(() => {
    fetchBookings();
    const interval = setInterval(fetchBookings, 30000); // Refresh la fiecare 30 sec
    return () => clearInterval(interval);
  }, []);

  // Statistici
  const totalBookings = bookings.length;
  const activeBookings = bookings.filter(b => b.status.toLowerCase() === "active").length;
  const totalRevenue = bookings.reduce((sum, b) => sum + (parseFloat(b.totalPrice) || 0), 0);
  const totalCashReceived = bookings.reduce((sum, b) => sum + (b.totalPaid || 0), 0);

  // Filtrare și căutare
  const filtered = useMemo(() => {
    let f = bookings;
    if (search) {
      f = f.filter(b =>
        b.guestName.toLowerCase().includes(search.toLowerCase()) ||
        b.roomTheme.toLowerCase().includes(search.toLowerCase()) ||
        b.bookingId.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (status) {
      f = f.filter(b => b.status.toLowerCase() === status.toLowerCase());
    }
    return f;
  }, [search, status, bookings]);

  // Paginare
  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Export to PDF
  function handleExportPDF() {
    const dataToExport = filtered.map(b => ({
      "Booking ID": b.bookingId,
      "Guest Name": b.guestName,
      "Theme": b.roomTheme,
      "Dates": b.dates,
      "Total Price": `$${parseFloat(b.totalPrice).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}`,
      "Cash Received": `$${b.totalPaid.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}`,
      "Remaining Due": `$${b.remainingDue.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}`,
      "Status": b.status
    }));

    const doc = new jsPDF();
    doc.text("Hotel Bookings Report", 14, 10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 20);
    
    autoTable(doc, {
      head: [Object.keys(dataToExport[0])],
      body: dataToExport.map(row => Object.values(row)),
      startY: 30,
      theme: "grid",
      styles: { fontSize: 10 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 }
    });

    doc.save("bookings-report.pdf");
  }

  // Export to Excel
  function handleExportExcel() {
    const dataToExport = filtered.map(b => ({
      "Booking ID": b.bookingId,
      "Guest Name": b.guestName,
      "Theme": b.roomTheme,
      "Dates": b.dates,
      "Total Price": `$${parseFloat(b.totalPrice).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}`,
      "Cash Received": `$${b.totalPaid.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}`,
      "Remaining Due": `$${b.remainingDue.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}`,
      "Status": b.status
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bookings");
    XLSX.writeFile(wb, "bookings-report.xlsx");
  }

  return (
    <div className="admin-bookings-modern">
      <div className="admin-bookings-header-row">
        <div>
          <h2 className="admin-bookings-title">Manage Bookings</h2>
          <div className="admin-bookings-subtitle">Monitor and manage all guest hotel bookings in real-time.</div>
        </div>
        <div className="admin-bookings-search-export">
          <input
            className="admin-bookings-search"
            type="text"
            placeholder="Search client name..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
          <button className="admin-bookings-export-btn" onClick={() => fetchBookings()} style={{marginRight: '10px'}}>
            Refresh
          </button>
          <button className="admin-bookings-export-btn" onClick={handleExportPDF} style={{marginRight: '10px'}}>
            Export PDF
          </button>
          <button className="admin-bookings-export-btn" onClick={handleExportExcel}>
            Export Excel
          </button>
        </div>
      </div>
      <div className="admin-bookings-stats-row">
        <div className="admin-bookings-stat-card">
          <div className="admin-bookings-stat-label">Total Bookings</div>
          <div className="admin-bookings-stat-value">{totalBookings.toLocaleString()}</div>
        </div>
        <div className="admin-bookings-stat-card">
          <div className="admin-bookings-stat-label">Active Bookings</div>
          <div className="admin-bookings-stat-value">{activeBookings}</div>
        </div>

        <div className="admin-bookings-stat-card">
          <div className="admin-bookings-stat-label">Cash Received</div>
          <div className="admin-bookings-stat-value">${totalCashReceived.toLocaleString(undefined, {minimumFractionDigits:0, maximumFractionDigits:2})}</div>
        </div>
      </div>
      <div className="admin-bookings-table-card">
        <div className="admin-bookings-table-header-row">
          <div className="admin-bookings-table-title">Booking List</div>
          <div className="admin-bookings-table-filter">
            <span>FILTER STATUS:</span>
            <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
        <div className="admin-bookings-table-responsive">
          <table className="admin-bookings-modern-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Client Name</th>
                <th>Theme</th>
                <th>Dates</th>
                <th>Total Price</th>
                <th>Cash Received</th>
                <th>Payment Status</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{textAlign:'center',padding:'40px'}}>Loading...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={8} style={{textAlign:'center',padding:'40px'}}>No bookings found.</td></tr>
              ) : paginated.map(b => (
                <tr key={b.bookingId}>
                  <td className="admin-bookings-modern-id">{b.bookingId}</td>
                  <td className="admin-bookings-modern-client">
                    <img src={b.guestAvatar} alt={b.guestName} className="admin-bookings-modern-avatar" onError={(e) => { e.target.src = "https://api.dicebear.com/7.x/avataaars/svg?seed=" + b.guestName; }} />
                    <span>{b.guestName}</span>
                  </td>
                  <td>
                    <div style={{fontWeight:600}}>{b.roomTheme}</div>
                  </td>
                  <td style={{whiteSpace: 'nowrap'}}>{b.dates}</td>
                  <td style={{fontWeight:700}}>${parseFloat(b.totalPrice).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                  <td style={{fontWeight:700, color: b.totalPaid > 0 ? '#10b981' : '#999'}}>
                    ${b.totalPaid.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}
                    {b.remainingDue > 0 && <div style={{fontSize:'0.85rem', color:'#ef4444'}}>Owed: ${b.remainingDue.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</div>}
                  </td>
                  <td>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      backgroundColor: b.paymentStatus === 'full_payment' ? '#d1fae5' : b.paymentStatus === 'deposit_paid' ? '#fef3c7' : '#f3f4f6',
                      color: b.paymentStatus === 'full_payment' ? '#065f46' : b.paymentStatus === 'deposit_paid' ? '#92400e' : '#6b7280',
                      fontWeight: 600,
                      fontSize: '0.85rem'
                    }}>
                      {b.paymentStatus === 'full_payment' ? 'Fully Paid' : b.paymentStatus === 'deposit_paid' ? `Deposit Paid (${b.depositRequired ? '$' + b.depositRequired.toLocaleString() : 'N/A'})` : b.paymentStatus === 'partial_payment' ? 'Partial' : 'Pending'}
                    </span>
                  </td>
                  <td>
                    <span className={`admin-bookings-modern-status status-${b.status.toLowerCase()}`}>{b.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="admin-bookings-modern-pagination-row">
          <span className="admin-bookings-modern-pagination-info">
            Showing {filtered.length === 0 ? 0 : ((page-1)*PAGE_SIZE+1)} to {Math.min(page*PAGE_SIZE, filtered.length)} of {filtered.length} entries
          </span>
          <div className="admin-bookings-modern-pagination">
            {Array.from({length: pageCount}, (_, i) => i+1).slice(Math.max(0, page-2), Math.min(pageCount, page+2)).map(p => (
              <button
                key={p}
                className={p === page ? "active" : ""}
                onClick={() => setPage(p)}
              >{p}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
