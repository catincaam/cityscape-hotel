import fetch from "node-fetch";

(async () => {
  try {
    const res = await fetch("http://localhost:9001/api/booking/admin/bookings");
    const data = await res.json();
    
    console.log("Total bookings:", data.length);
    console.log("First booking:", JSON.stringify(data[0], null, 2));
    
    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
})();
