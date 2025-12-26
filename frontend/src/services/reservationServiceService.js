import axios from "axios";

const API = "http://localhost:9001/api/reservation-services";

// Adaugă un serviciu la rezervare
export async function addServiceToReservation(data) {
  const res = await axios.post(API, data, { withCredentials: true });
  return res.data;
}

// Obține toate serviciile pentru o rezervare
export async function getReservationServices(reservationId) {
  const res = await axios.get(`${API}/reservation/${reservationId}`, { 
    withCredentials: true 
  });
  return res.data;
}

// Obține totalul serviciilor pentru o rezervare
export async function getServicesTotal(reservationId) {
  const res = await axios.get(`${API}/reservation/${reservationId}/total`, { 
    withCredentials: true 
  });
  return res.data.total;
}

// Actualizează cantitatea unui serviciu
export async function updateServiceQuantity(reservationId, serviceId, quantity) {
  const res = await axios.put(`${API}/${reservationId}/${serviceId}`, 
    { quantity }, 
    { withCredentials: true }
  );
  return res.data;
}

// Șterge un serviciu din rezervare
export async function removeServiceFromReservation(reservationId, serviceId) {
  const res = await axios.delete(`${API}/${reservationId}/${serviceId}`, { 
    withCredentials: true 
  });
  return res.data;
}

// Șterge toate serviciile unei rezervări
export async function clearReservationServices(reservationId) {
  const res = await axios.delete(`${API}/reservation/${reservationId}`, { 
    withCredentials: true 
  });
  return res.data;
}
