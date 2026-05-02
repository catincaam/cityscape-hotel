import nodemailer from "nodemailer";

const APP_URL = process.env.APP_URL || "http://localhost:3000";

const hasSmtpConfig = () => Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD);
const hasBrevoConfig = () => Boolean(process.env.BREVO_API_KEY);

const normalizeRecipients = (to) => {
  const recipients = Array.isArray(to) ? to : [to];
  return recipients
    .filter(Boolean)
    .map((email) => (typeof email === "string" ? { email } : email));
};

const sendWithBrevo = async (mailOptions) => {
  const senderEmail = process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER;

  if (!senderEmail) {
    return {
      success: false,
      error: "Brevo sender is not configured. Add EMAIL_FROM_ADDRESS or EMAIL_USER."
    };
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      sender: {
        name: process.env.EMAIL_FROM_NAME || "Cityscape Hotel",
        email: senderEmail
      },
      to: normalizeRecipients(mailOptions.to),
      subject: mailOptions.subject,
      htmlContent: mailOptions.html,
      textContent: mailOptions.text
    })
  });

  const body = await response.text();

  if (!response.ok) {
    throw new Error(`Brevo email error ${response.status}: ${body}`);
  }

  const parsed = body ? JSON.parse(body) : {};
  return { success: true, messageId: parsed.messageId || parsed.messageIds?.[0] };
};

const createTransporter = () => {
  if (!hasSmtpConfig()) {
    return null;
  }

  const emailPort = Number(process.env.EMAIL_PORT || 587);
  const emailSecure =
    String(process.env.EMAIL_SECURE || "").toLowerCase() === "true" || emailPort === 465;

  const gmailTransport = {
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: emailPort,
    secure: emailSecure,
    auth: {
      user: process.env.EMAIL_USER,
      pass: String(process.env.EMAIL_PASSWORD || "").replace(/\s/g, "")
    },
    requireTLS: !emailSecure,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    tls: {
      minVersion: "TLSv1.2"
    }
  };

  if ((process.env.EMAIL_SERVICE || "gmail").toLowerCase() === "gmail") {
    return nodemailer.createTransport(gmailTransport);
  }

  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    auth: gmailTransport.auth,
    connectionTimeout: gmailTransport.connectionTimeout,
    greetingTimeout: gmailTransport.greetingTimeout,
    socketTimeout: gmailTransport.socketTimeout
  });
};

const formatDate = (value) => {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
};

const formatMoney = (value) => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR"
  }).format(amount);
};

const fullName = (client) => {
  const name = [client?.FirstName, client?.LastName].filter(Boolean).join(" ").trim();
  return name || "Guest";
};

const roomName = (room) => {
  const theme = room?.RoomTheme || room?.dataValues?.RoomTheme;
  return theme?.name || room?.name || "Selected room";
};

const sendMail = async (mailOptions) => {
  if (!hasBrevoConfig() && !hasSmtpConfig()) {
    return {
      success: false,
      error: "Email credentials are not configured. Add BREVO_API_KEY or EMAIL_USER and EMAIL_PASSWORD."
    };
  }

  try {
    if (hasBrevoConfig()) {
      return await sendWithBrevo(mailOptions);
    }

    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: `"Cityscape Hotel" <${process.env.EMAIL_USER}>`,
      ...mailOptions
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("[EMAIL ERROR]", error);
    return { success: false, error: error.message };
  }
};

export const sendReservationConfirmation = async ({
  client,
  reservation,
  room,
  invoice,
  payment,
  remainingAmount
}) => {
  if (!client?.Email) {
    return { success: false, error: "Client email is missing." };
  }

  const guestName = fullName(client);
  const reservationId = reservation?.ReservationId;
  const reservationCode = `#RES-${String(reservationId || "").padStart(4, "0")}`;
  const detailsUrl = `${APP_URL}/reservation/${reservationId}`;
  const paidAmount = payment?.amount || 0;
  const totalAmount = invoice?.totalAmount || 0;
  const balance = Number(remainingAmount || 0);

  const html = `
    <div style="margin:0;padding:32px;background:#f6f2ec;font-family:Georgia,serif;color:#122033;">
      <div style="max-width:640px;margin:0 auto;background:#fffaf4;border:1px solid #e4d5c2;border-radius:18px;overflow:hidden;">
        <div style="padding:30px 34px;border-bottom:1px solid #eadfce;">
          <div style="font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#b8894a;font-weight:700;">Cityscape Hotel</div>
          <h1 style="margin:12px 0 8px;font-size:34px;line-height:1.1;color:#111827;">Your stay is confirmed</h1>
          <p style="margin:0;color:#5d6a7a;font-size:15px;">Hello ${guestName}, thank you for booking with us.</p>
        </div>

        <div style="padding:28px 34px;">
          <p style="margin:0 0 22px;color:#26364a;font-size:16px;">Reservation ${reservationCode} has been created successfully.</p>

          <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #eadfce;color:#9a7b55;text-transform:uppercase;font-size:11px;letter-spacing:1.5px;">Room</td>
              <td style="padding:12px 0;border-bottom:1px solid #eadfce;text-align:right;font-weight:700;">${roomName(room)}</td>
            </tr>
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #eadfce;color:#9a7b55;text-transform:uppercase;font-size:11px;letter-spacing:1.5px;">Check-in</td>
              <td style="padding:12px 0;border-bottom:1px solid #eadfce;text-align:right;font-weight:700;">${formatDate(reservation?.requestedCheckin)}</td>
            </tr>
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #eadfce;color:#9a7b55;text-transform:uppercase;font-size:11px;letter-spacing:1.5px;">Check-out</td>
              <td style="padding:12px 0;border-bottom:1px solid #eadfce;text-align:right;font-weight:700;">${formatDate(reservation?.requestedCheckout)}</td>
            </tr>
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #eadfce;color:#9a7b55;text-transform:uppercase;font-size:11px;letter-spacing:1.5px;">Guests</td>
              <td style="padding:12px 0;border-bottom:1px solid #eadfce;text-align:right;font-weight:700;">${reservation?.nrPeople || 1}</td>
            </tr>
          </table>

          <div style="padding:18px 20px;border:1px solid #eadfce;border-radius:14px;background:#fff;">
            <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
              <span style="color:#5d6a7a;">Total amount</span>
              <strong>${formatMoney(totalAmount)}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
              <span style="color:#5d6a7a;">Paid now</span>
              <strong>${formatMoney(paidAmount)}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;">
              <span style="color:#5d6a7a;">Remaining balance</span>
              <strong>${formatMoney(balance)}</strong>
            </div>
          </div>

          <a href="${detailsUrl}" style="display:block;margin-top:24px;padding:14px 18px;border-radius:999px;background:#111827;color:#fff;text-align:center;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">View reservation</a>
        </div>
      </div>
    </div>
  `;

  const text = [
    `Your Cityscape Hotel stay is confirmed.`,
    `Reservation: ${reservationCode}`,
    `Room: ${roomName(room)}`,
    `Check-in: ${formatDate(reservation?.requestedCheckin)}`,
    `Check-out: ${formatDate(reservation?.requestedCheckout)}`,
    `Guests: ${reservation?.nrPeople || 1}`,
    `Total: ${formatMoney(totalAmount)}`,
    `Paid now: ${formatMoney(paidAmount)}`,
    `Remaining balance: ${formatMoney(balance)}`,
    `Details: ${detailsUrl}`
  ].join("\n");

  return sendMail({
    to: client.Email,
    subject: `Booking confirmed - Cityscape Hotel ${reservationCode}`,
    html,
    text
  });
};

export const sendCheckInReminder = async ({ client, reservation, room }) => {
  if (!client?.Email) {
    return { success: false, error: "Client email is missing." };
  }

  const reservationCode = `#RES-${String(reservation?.ReservationId || "").padStart(4, "0")}`;

  return sendMail({
    to: client.Email,
    subject: `Your Cityscape stay starts soon ${reservationCode}`,
    text: `Hello ${fullName(client)}, your stay in ${roomName(room)} starts on ${formatDate(reservation?.requestedCheckin)}.`
  });
};

export const sendPasswordResetEmail = async ({ client, resetUrl, expiresInMinutes = 60 }) => {
  if (!client?.Email) {
    return { success: false, error: "Client email is missing." };
  }

  const guestName = fullName(client);

  const html = `
    <div style="margin:0;padding:32px;background:#f6f2ec;font-family:Georgia,serif;color:#122033;">
      <div style="max-width:620px;margin:0 auto;background:#fffaf4;border:1px solid #e4d5c2;border-radius:18px;overflow:hidden;">
        <div style="padding:30px 34px;border-bottom:1px solid #eadfce;">
          <div style="font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#b8894a;font-weight:700;">Cityscape Hotel</div>
          <h1 style="margin:12px 0 8px;font-size:32px;line-height:1.1;color:#111827;">Reset your password</h1>
          <p style="margin:0;color:#5d6a7a;font-size:15px;">Hello ${guestName}, we received a request to reset your account password.</p>
        </div>

        <div style="padding:28px 34px;">
          <p style="margin:0 0 18px;color:#26364a;font-size:16px;line-height:1.5;">
            Use the button below to choose a new password. This link expires in ${expiresInMinutes} minutes.
          </p>
          <a href="${resetUrl}" style="display:block;margin:24px 0;padding:14px 18px;border-radius:999px;background:#111827;color:#fff;text-align:center;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Reset password</a>
          <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.5;">
            If you did not request this, you can safely ignore this email. Your password will not change.
          </p>
        </div>
      </div>
    </div>
  `;

  const text = [
    "Reset your Cityscape Hotel password.",
    `Open this link within ${expiresInMinutes} minutes:`,
    resetUrl,
    "If you did not request this, ignore this email."
  ].join("\n");

  return sendMail({
    to: client.Email,
    subject: "Reset your Cityscape Hotel password",
    html,
    text
  });
};

export const sendServiceAddedEmail = async ({ client, reservation, service, reservationService }) => {
  if (!client?.Email) {
    return { success: false, error: "Client email is missing." };
  }

  const serviceName = service?.name || service?.serviceName || "Selected service";
  const quantity = Number(reservationService?.quantity || 1);
  const unitPrice = Number(reservationService?.unitPrice || service?.price || 0);
  const total = quantity * unitPrice;
  const detailsUrl = `${APP_URL}/reservation/${reservation?.ReservationId}`;

  const html = `
    <div style="margin:0;padding:32px;background:#f6f2ec;font-family:Georgia,serif;color:#122033;">
      <div style="max-width:620px;margin:0 auto;background:#fffaf4;border:1px solid #e4d5c2;border-radius:18px;overflow:hidden;">
        <div style="padding:30px 34px;border-bottom:1px solid #eadfce;">
          <div style="font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#b8894a;font-weight:700;">Cityscape Hotel</div>
          <h1 style="margin:12px 0 8px;font-size:32px;line-height:1.1;color:#111827;">Service added to your stay</h1>
          <p style="margin:0;color:#5d6a7a;font-size:15px;">Hello ${fullName(client)}, your reservation has been updated.</p>
        </div>
        <div style="padding:28px 34px;">
          <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #eadfce;color:#9a7b55;text-transform:uppercase;font-size:11px;letter-spacing:1.5px;">Service</td>
              <td style="padding:12px 0;border-bottom:1px solid #eadfce;text-align:right;font-weight:700;">${serviceName}</td>
            </tr>
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #eadfce;color:#9a7b55;text-transform:uppercase;font-size:11px;letter-spacing:1.5px;">Quantity</td>
              <td style="padding:12px 0;border-bottom:1px solid #eadfce;text-align:right;font-weight:700;">${quantity}</td>
            </tr>
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #eadfce;color:#9a7b55;text-transform:uppercase;font-size:11px;letter-spacing:1.5px;">Estimated total</td>
              <td style="padding:12px 0;border-bottom:1px solid #eadfce;text-align:right;font-weight:700;">${formatMoney(total)}</td>
            </tr>
          </table>
          <p style="margin:0 0 20px;color:#5d6a7a;font-size:14px;line-height:1.5;">This service is now attached to reservation #RES-${String(reservation?.ReservationId || "").padStart(4, "0")}.</p>
          <a href="${detailsUrl}" style="display:block;margin-top:20px;padding:14px 18px;border-radius:999px;background:#111827;color:#fff;text-align:center;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">View reservation</a>
        </div>
      </div>
    </div>
  `;

  const text = [
    "A service was added to your Cityscape reservation.",
    `Service: ${serviceName}`,
    `Quantity: ${quantity}`,
    `Estimated total: ${formatMoney(total)}`,
    `Reservation: ${detailsUrl}`
  ].join("\n");

  return sendMail({
    to: client.Email,
    subject: `Service added - ${serviceName}`,
    html,
    text
  });
};

export const sendRewardRedeemedEmail = async ({ client, reservation, reward, points }) => {
  if (!client?.Email) {
    return { success: false, error: "Client email is missing." };
  }

  const rewardTitle = reward?.title || "Selected reward";
  const detailsUrl = `${APP_URL}/reservation/${reservation?.ReservationId}`;

  const html = `
    <div style="margin:0;padding:32px;background:#f6f2ec;font-family:Georgia,serif;color:#122033;">
      <div style="max-width:620px;margin:0 auto;background:#fffaf4;border:1px solid #e4d5c2;border-radius:18px;overflow:hidden;">
        <div style="padding:30px 34px;border-bottom:1px solid #eadfce;">
          <div style="font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#b8894a;font-weight:700;">Cityscape Hotel</div>
          <h1 style="margin:12px 0 8px;font-size:32px;line-height:1.1;color:#111827;">Reward applied</h1>
          <p style="margin:0;color:#5d6a7a;font-size:15px;">Hello ${fullName(client)}, your reward has been added to your stay.</p>
        </div>
        <div style="padding:28px 34px;">
          <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #eadfce;color:#9a7b55;text-transform:uppercase;font-size:11px;letter-spacing:1.5px;">Reward</td>
              <td style="padding:12px 0;border-bottom:1px solid #eadfce;text-align:right;font-weight:700;">${rewardTitle}</td>
            </tr>
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #eadfce;color:#9a7b55;text-transform:uppercase;font-size:11px;letter-spacing:1.5px;">Points used</td>
              <td style="padding:12px 0;border-bottom:1px solid #eadfce;text-align:right;font-weight:700;">${points} pts</td>
            </tr>
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #eadfce;color:#9a7b55;text-transform:uppercase;font-size:11px;letter-spacing:1.5px;">Reservation</td>
              <td style="padding:12px 0;border-bottom:1px solid #eadfce;text-align:right;font-weight:700;">#RES-${String(reservation?.ReservationId || "").padStart(4, "0")}</td>
            </tr>
          </table>
          <a href="${detailsUrl}" style="display:block;margin-top:20px;padding:14px 18px;border-radius:999px;background:#111827;color:#fff;text-align:center;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">View reservation</a>
        </div>
      </div>
    </div>
  `;

  const text = [
    "A reward was applied to your Cityscape reservation.",
    `Reward: ${rewardTitle}`,
    `Points used: ${points} pts`,
    `Reservation: ${detailsUrl}`
  ].join("\n");

  return sendMail({
    to: client.Email,
    subject: `Reward applied - ${rewardTitle}`,
    html,
    text
  });
};

export const sendTestEmail = async (toEmail) => {
  return sendMail({
    to: toEmail,
    subject: "Cityscape Hotel email test",
    text: "If you received this message, Cityscape Hotel email sending is configured correctly.",
    html: "<p>If you received this message, <strong>Cityscape Hotel</strong> email sending is configured correctly.</p>"
  });
};
