import nodemailer from "nodemailer";

const APP_URL = process.env.APP_URL || "http://localhost:3000";

const hasSmtpConfig = () => Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD);
const hasBrevoConfig = () => Boolean(process.env.BREVO_API_KEY);
const hasResendConfig = () => Boolean(process.env.RESEND_API_KEY);

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

const sendWithResend = async (mailOptions) => {
  const fromAddress = process.env.EMAIL_FROM_ADDRESS || "onboarding@resend.dev";
  const fromName = process.env.EMAIL_FROM_NAME || "Cityscape Hotel";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: `${fromName} <${fromAddress}>`,
      to: normalizeRecipients(mailOptions.to).map((recipient) => recipient.email),
      subject: mailOptions.subject,
      html: mailOptions.html,
      text: mailOptions.text
    })
  });

  const body = await response.text();

  if (!response.ok) {
    throw new Error(`Resend email error ${response.status}: ${body}`);
  }

  const parsed = body ? JSON.parse(body) : {};
  return { success: true, messageId: parsed.id };
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

  if (process.env.EMAIL_HOST || (process.env.EMAIL_SERVICE || "gmail").toLowerCase() === "gmail") {
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
  if (!hasResendConfig() && !hasBrevoConfig() && !hasSmtpConfig()) {
    return {
      success: false,
      error: "Email credentials are not configured. Add RESEND_API_KEY, BREVO_API_KEY or EMAIL_USER and EMAIL_PASSWORD."
    };
  }

  try {
    if (hasResendConfig()) {
      return await sendWithResend(mailOptions);
    }

    if (hasBrevoConfig()) {
      return await sendWithBrevo(mailOptions);
    }

    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || "Cityscape Hotel"}" <${process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER}>`,
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
    <div style="margin:0;padding:0;background:#f4f0ea;color:#182434;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f0ea;border-collapse:collapse;">
        <tr>
          <td align="center" style="padding:34px 18px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;border-collapse:collapse;background:#fffaf4;border:1px solid #e4d5c2;border-radius:22px;overflow:hidden;box-shadow:0 18px 45px rgba(31,41,55,0.08);">
              <tr>
                <td style="padding:34px 38px 28px;background:#161f2d;">
                  <div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#d1ad78;font-weight:700;">Cityscape Hotel</div>
                  <h1 style="margin:14px 0 10px;font-family:Georgia,serif;font-size:38px;line-height:1.05;font-weight:400;color:#ffffff;">Your stay is confirmed</h1>
                  <p style="margin:0;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#d9e0ea;">Hello ${guestName}, your reservation is saved and ready in your Cityscape account.</p>
                </td>
              </tr>

              <tr>
                <td style="padding:30px 38px 8px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                    <tr>
                      <td style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#b8894a;font-weight:700;">Reservation</td>
                      <td align="right" style="font-family:Georgia,serif;font-size:22px;color:#111827;">${reservationCode}</td>
                    </tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td style="padding:14px 38px 8px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #eadfce;border-radius:16px;overflow:hidden;background:#ffffff;">
                    <tr>
                      <td colspan="2" style="padding:20px 22px;border-bottom:1px solid #eadfce;">
                        <div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#b8894a;font-weight:700;">Selected room</div>
                        <div style="margin-top:6px;font-family:Georgia,serif;font-size:26px;line-height:1.2;color:#111827;">${roomName(room)}</div>
                      </td>
                    </tr>
                    <tr>
                      <td style="width:50%;padding:18px 22px;border-right:1px solid #eadfce;border-bottom:1px solid #eadfce;">
                        <div style="font-family:Arial,sans-serif;font-size:10px;letter-spacing:1.8px;text-transform:uppercase;color:#8b97a6;font-weight:700;">Check-in</div>
                        <div style="margin-top:6px;font-family:Georgia,serif;font-size:17px;color:#111827;">${formatDate(reservation?.requestedCheckin)}</div>
                      </td>
                      <td style="width:50%;padding:18px 22px;border-bottom:1px solid #eadfce;">
                        <div style="font-family:Arial,sans-serif;font-size:10px;letter-spacing:1.8px;text-transform:uppercase;color:#8b97a6;font-weight:700;">Check-out</div>
                        <div style="margin-top:6px;font-family:Georgia,serif;font-size:17px;color:#111827;">${formatDate(reservation?.requestedCheckout)}</div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:18px 22px;border-right:1px solid #eadfce;">
                        <div style="font-family:Arial,sans-serif;font-size:10px;letter-spacing:1.8px;text-transform:uppercase;color:#8b97a6;font-weight:700;">Guests</div>
                        <div style="margin-top:6px;font-family:Georgia,serif;font-size:17px;color:#111827;">${reservation?.nrPeople || 1}</div>
                      </td>
                      <td style="padding:18px 22px;">
                        <div style="font-family:Arial,sans-serif;font-size:10px;letter-spacing:1.8px;text-transform:uppercase;color:#8b97a6;font-weight:700;">Status</div>
                        <div style="margin-top:6px;font-family:Arial,sans-serif;font-size:12px;letter-spacing:1.2px;text-transform:uppercase;color:#047857;font-weight:800;">Confirmed</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td style="padding:18px 38px 6px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#fbf7f1;border:1px solid #eadfce;border-radius:16px;">
                    <tr>
                      <td style="padding:18px 22px;font-family:Arial,sans-serif;font-size:14px;color:#5d6a7a;">Total amount</td>
                      <td align="right" style="padding:18px 22px;font-family:Georgia,serif;font-size:18px;color:#111827;">${formatMoney(totalAmount)}</td>
                    </tr>
                    <tr>
                      <td style="padding:0 22px 18px;font-family:Arial,sans-serif;font-size:14px;color:#5d6a7a;">Paid now</td>
                      <td align="right" style="padding:0 22px 18px;font-family:Georgia,serif;font-size:18px;color:#047857;">${formatMoney(paidAmount)}</td>
                    </tr>
                    <tr>
                      <td style="padding:0 22px 18px;font-family:Arial,sans-serif;font-size:14px;color:#5d6a7a;">Remaining balance</td>
                      <td align="right" style="padding:0 22px 18px;font-family:Georgia,serif;font-size:18px;color:#111827;">${formatMoney(balance)}</td>
                    </tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td align="center" style="padding:22px 38px 34px;">
                  <a href="${detailsUrl}" style="display:inline-block;min-width:230px;padding:15px 24px;border-radius:999px;background:#111827;color:#ffffff;text-align:center;text-decoration:none;font-family:Arial,sans-serif;font-size:12px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;">View reservation details</a>
                  <p style="margin:18px 0 0;font-family:Arial,sans-serif;font-size:12px;line-height:1.5;color:#8b97a6;">You can review your stay, download the invoice, or manage eligible services from your reservation page.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
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

export const sendAccountCreatedEmail = async ({ client }) => {
  if (!client?.Email) {
    return { success: false, error: "Client email is missing." };
  }

  const guestName = fullName(client);
  const dashboardUrl = `${APP_URL}/dashboard`;

  const html = `
    <div style="margin:0;padding:32px;background:#f6f2ec;font-family:Georgia,serif;color:#122033;">
      <div style="max-width:620px;margin:0 auto;background:#fffaf4;border:1px solid #e4d5c2;border-radius:18px;overflow:hidden;">
        <div style="padding:30px 34px;border-bottom:1px solid #eadfce;">
          <div style="font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#b8894a;font-weight:700;">Cityscape Hotel</div>
          <h1 style="margin:12px 0 8px;font-size:32px;line-height:1.1;color:#111827;">Your account is ready</h1>
          <p style="margin:0;color:#5d6a7a;font-size:15px;">Hello ${guestName}, welcome to your Cityscape Hotel account.</p>
        </div>
        <div style="padding:28px 34px;">
          <p style="margin:0 0 18px;color:#26364a;font-size:16px;line-height:1.5;">
            You can now explore themed rooms, manage upcoming stays, add premium services, and collect loyalty rewards.
          </p>
          <a href="${dashboardUrl}" style="display:block;margin:24px 0;padding:14px 18px;border-radius:999px;background:#111827;color:#fff;text-align:center;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Open dashboard</a>
          <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.5;">
            If you did not create this account, please contact Cityscape Hotel support.
          </p>
        </div>
      </div>
    </div>
  `;

  const text = [
    `Hello ${guestName}, your Cityscape Hotel account is ready.`,
    "You can now manage bookings, services, and rewards from your dashboard.",
    dashboardUrl
  ].join("\n");

  return sendMail({
    to: client.Email,
    subject: "Welcome to Cityscape Hotel",
    html,
    text
  });
};

export const sendAccountDeletedEmail = async ({ client }) => {
  if (!client?.Email) {
    return { success: false, error: "Client email is missing." };
  }

  const guestName = fullName(client);

  const html = `
    <div style="margin:0;padding:32px;background:#f6f2ec;font-family:Georgia,serif;color:#122033;">
      <div style="max-width:620px;margin:0 auto;background:#fffaf4;border:1px solid #e4d5c2;border-radius:18px;overflow:hidden;">
        <div style="padding:30px 34px;border-bottom:1px solid #eadfce;">
          <div style="font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#b8894a;font-weight:700;">Cityscape Hotel</div>
          <h1 style="margin:12px 0 8px;font-size:32px;line-height:1.1;color:#111827;">Account deleted</h1>
          <p style="margin:0;color:#5d6a7a;font-size:15px;">Hello ${guestName}, this confirms that your Cityscape Hotel account has been deleted.</p>
        </div>
        <div style="padding:28px 34px;">
          <p style="margin:0;color:#26364a;font-size:16px;line-height:1.5;">
            Your profile access has been removed. If this was not requested by you, please contact Cityscape Hotel support as soon as possible.
          </p>
        </div>
      </div>
    </div>
  `;

  const text = [
    `Hello ${guestName}, this confirms that your Cityscape Hotel account has been deleted.`,
    "If this was not requested by you, please contact Cityscape Hotel support."
  ].join("\n");

  return sendMail({
    to: client.Email,
    subject: "Cityscape Hotel account deleted",
    html,
    text
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
