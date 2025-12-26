import nodemailer from "nodemailer";

// 🔧 CONFIGURARE SMTP
// Pentru Gmail:
// 1. Intră pe https://myaccount.google.com/apppasswords
// 2. Generează "App Password" (16 caractere)
// 3. Pune-l în .env ca EMAIL_PASSWORD

const transporter = nodemailer.createTransport({
  service: "gmail", // sau "yahoo", "outlook"
  auth: {
    user: process.env.EMAIL_USER || "cityscape.hotel@gmail.com",
    pass: process.env.EMAIL_PASSWORD || "your-app-password-here"
  }
});

// 📧 Trimite email de confirmare rezervare
export async function sendReservationConfirmation(client, reservation, room) {
  const emailHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #1e40af, #1d4ed8); color: white; padding: 32px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; }
        .content { padding: 32px; }
        .detail { background: #f8fafc; padding: 16px; border-radius: 12px; margin: 16px 0; }
        .detail-row { display: flex; justify-content: space-between; margin: 8px 0; }
        .label { color: #64748b; font-weight: 600; }
        .value { color: #1e293b; font-weight: 700; }
        .footer { background: #f8fafc; padding: 24px; text-align: center; color: #64748b; font-size: 14px; }
        .btn { display: inline-block; background: #1d4ed8; color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; margin-top: 16px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Rezervare Confirmată</h1>
          <p>Bine ai venit la Cityscape Hotel!</p>
        </div>
        
        <div class="content">
          <h2>Bună ${client.FirstName}! 👋</h2>
          <p>Rezervarea ta a fost confirmată cu succes. Ne bucurăm să te vedem!</p>
          
          <div class="detail">
            <h3>Detalii Rezervare</h3>
            <div class="detail-row">
              <span class="label">Cod Rezervare:</span>
              <span class="value">#${reservation.ReservationId}</span>
            </div>
            <div class="detail-row">
              <span class="label">Camera:</span>
              <span class="value">${room.name || 'Standard Room'}</span>
            </div>
            <div class="detail-row">
              <span class="label">Check-in:</span>
              <span class="value">${reservation.CheckInDate}</span>
            </div>
            <div class="detail-row">
              <span class="label">Check-out:</span>
              <span class="value">${reservation.CheckOutDate}</span>
            </div>
            <div class="detail-row">
              <span class="label">Oaspeți:</span>
              <span class="value">${reservation.NumberOfGuests}</span>
            </div>
          </div>

          <p>Îți vom trimite un reminder cu 24h înainte de check-in.</p>
          
          <center>
            <a href="http://localhost:3000/dashboard" class="btn">Vezi Rezervarea</a>
          </center>
        </div>
        
        <div class="footer">
          © 2025 Cityscape Hotel. Toate drepturile rezervate.<br>
          Dacă nu ai făcut această rezervare, te rugăm să ne contactezi imediat.
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `Cityscape Hotel <${process.env.EMAIL_USER}>`,
    to: client.Email,
    subject: "✅ Rezervare Confirmată - Cityscape Hotel",
    html: emailHTML
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`📧 Email trimis către ${client.Email}`);
    return { success: true };
  } catch (error) {
    console.error("❌ Eroare trimitere email:", error);
    return { success: false, error: error.message };
  }
}

// 📧 Trimite reminder check-in (24h înainte)
export async function sendCheckInReminder(client, reservation, room) {
  const emailHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 32px; text-align: center; }
        .content { padding: 32px; }
        .highlight { background: #fef3c7; padding: 16px; border-radius: 12px; border-left: 4px solid #f59e0b; margin: 16px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⏰ Check-in Mâine!</h1>
        </div>
        
        <div class="content">
          <h2>Bună ${client.FirstName}!</h2>
          <p>Doar un reminder prietenos: check-in-ul tău este mâine!</p>
          
          <div class="highlight">
            <strong>📅 Check-in:</strong> ${reservation.CheckInDate}<br>
            <strong>🏨 Camera:</strong> ${room.name}<br>
            <strong>🕒 Ora:</strong> După 14:00
          </div>

          <p>Ne pregătim camera pentru tine. Ne vedem mâine! 🎉</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `Cityscape Hotel <${process.env.EMAIL_USER}>`,
    to: client.Email,
    subject: "⏰ Reminder: Check-in Mâine - Cityscape Hotel",
    html: emailHTML
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`📧 Reminder trimis către ${client.Email}`);
    return { success: true };
  } catch (error) {
    console.error("❌ Eroare trimitere reminder:", error);
    return { success: false, error: error.message };
  }
}

// 🧪 Test email (pentru verificare configurare)
export async function sendTestEmail(toEmail) {
  const mailOptions = {
    from: `Cityscape Hotel <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "🧪 Test Email - Cityscape Hotel",
    html: `
      <h1>✅ Email Configuration Working!</h1>
      <p>Dacă vezi acest mesaj, sistemul de email funcționează perfect!</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true, message: "Email trimis cu succes!" };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

