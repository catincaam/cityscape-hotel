# 📧 SISTEM EMAIL - EXPLICAȚII COMPLETE

## 🧠 CUM FUNCȚIONEAZĂ (CONCEPTUAL)

### 1. Ce este SMTP?
SMTP = Simple Mail Transfer Protocol (protocolul pentru trimitere email)

Când trimiți un email din aplicație:
```
Aplicația ta → Gmail SMTP Server → Yahoo/Gmail destinatar
```

E ca și cum ai folosi contul Gmail pentru a trimite email-uri automat.

---

## 🔧 CONFIGURARE GMAIL (PAS CU PAS)

### Pas 1: Creează cont Gmail pentru hotel
- Mergi pe gmail.com
- Creează cont nou: `cityscape.hotel@gmail.com` (sau orice nume)
- Acest cont va fi "expeditorul" pentru toate email-urile

### Pas 2: Activează verificare în 2 pași
1. Intră în contul Gmail
2. Setări → Securitate
3. Activează "2-Step Verification"
4. Urmează pașii (verificare prin telefon)

### Pas 3: Generează App Password
1. Mergi la: https://myaccount.google.com/apppasswords
2. Selectează:
   - App: "Mail"
   - Device: "Windows Computer"
3. Click "Generate"
4. Vei primi o parolă de 16 caractere: `abcd efgh ijkl mnop`
5. **COPIAZĂ-O!** (nu o mai vezi niciodată)

**DE CE App Password?**
Pentru securitate, Gmail nu permite aplicațiilor să folosească parola ta reală. 
App Password = parolă specială doar pentru aplicații.

### Pas 4: Configurează .env
Deschide `backend/.env` și adaugă:
```env
EMAIL_USER="cityscape.hotel@gmail.com"
EMAIL_PASSWORD="abcdefghijklmnop"  # parola de 16 caractere, fără spații
```

**IMPORTANT:** Șterge spațiile din parola de 16 caractere!
- ❌ Greșit: `abcd efgh ijkl mnop`
- ✅ Corect: `abcdefghijklmnop`

---

## 💻 COD - EXPLICAȚII LINIE CU LINIE

### emailService.js - Configurare transporter
```javascript
const transporter = nodemailer.createTransport({
  service: "gmail",  // folosim Gmail SMTP
  auth: {
    user: process.env.EMAIL_USER,      // cityscape.hotel@gmail.com
    pass: process.env.EMAIL_PASSWORD   // app password 16 chars
  }
});
```

**Ce face:**
- Creează o "conexiune" cu serverul Gmail
- Când vrei să trimiți email, folosești această conexiune

### Trimitere email - Exemplu simplu
```javascript
await transporter.sendMail({
  from: "Cityscape Hotel <cityscape.hotel@gmail.com>",  // expeditor
  to: "alex@yahoo.com",                                  // destinatar
  subject: "Bine ai venit!",                            // subiect
  html: "<h1>Salut!</h1>"                               // conținut HTML
});
```

**Ce se întâmplă:**
1. Aplicația ta se conectează la Gmail SMTP
2. Gmail verifică credențialele (user + app password)
3. Gmail trimite email-ul către `alex@yahoo.com`
4. Alex primește email ca și cum TU i-ai scris din Gmail

---

## 🎯 FLUXURI UNDE SE VOR TRIMITE EMAIL-URI

### Flux 1: Confirmare Rezervare
```
User completează booking
    ↓
Apasă "Confirmă"
    ↓
Backend creează Reservation + Invoice
    ↓
🔥 AICI: sendReservationConfirmation(client, reservation, room)
    ↓
Client primește email: "✅ Rezervare confirmată!"
```

**Exemplu email primit:**
```
De la: Cityscape Hotel <cityscape.hotel@gmail.com>
Către: alex@yahoo.com
Subiect: ✅ Rezervare Confirmată

Bună Alex! 👋
Rezervarea ta a fost confirmată:

📅 Check-in: 2025-01-15
📅 Check-out: 2025-01-17
🏨 Camera: Tokyo Neon Suite
👥 Oaspeți: 2 adulți

[Buton: Vezi Rezervarea]
```

### Flux 2: Reminder Check-in (24h înainte)
```
Sistem cronjob verifică rezervările
    ↓
Găsește rezervări cu check-in mâine
    ↓
🔥 AICI: sendCheckInReminder(client, reservation, room)
    ↓
Client primește: "⏰ Check-in mâine!"
```

---

## 🧪 TESTARE - CE FACI ACUM

### 1. Configurează .env
```env
EMAIL_USER="cityscape.hotel@gmail.com"
EMAIL_PASSWORD="abcdefghijklmnop"
```

### 2. Pornește backend
```bash
cd backend
npm start
```

Verifică în consolă: "Server running on http://localhost:9001"

### 3. Testează pe pagina /email-test
- Intră pe: http://localhost:3000/email-test
- Introdu EMAIL-UL TĂU (Yahoo, Gmail, orice)
- Apasă "Trimite Email Test"

**Ce ar trebui să se întâmple:**
✅ În consolă backend: "📧 Email trimis către alex@yahoo.com"
✅ În pagină: "✅ Email de test trimis cu succes!"
✅ În inbox: Vezi email de la Cityscape Hotel

**Probleme comune:**
❌ "Invalid login" → App Password greșit / are spații
❌ "Connection timeout" → verifică internet / firewall
❌ "Username and Password not accepted" → verificare 2 pași nu e activată

---

## 🔥 INTEGRARE ÎN BOOKING (URMĂTORUL PAS)

După ce testarea funcționează, modificăm `ReservationRouter.js`:

```javascript
import { sendReservationConfirmation } from "../services/emailService.js";

// În POST /api/reservations
router.post("/", async (req, res) => {
  // ... cod existent creează rezervarea ...
  
  const reservation = await createReservation(data);
  
  // 🔥 AICI: Trimite email automat
  try {
    await sendReservationConfirmation(client, reservation, room);
    console.log("✅ Email confirmare trimis");
  } catch (err) {
    console.error("⚠️ Email nu s-a trimis:", err.message);
    // Nu oprim rezervarea dacă email-ul eșuează
  }
  
  res.status(201).json(reservation);
});
```

**Important:** 
- Email-ul e BONUS, nu e OBLIGATORIU
- Dacă email-ul eșuează, rezervarea tot se face
- Userul vede confirmarea pe site oricum

---

## 📊 REZUMAT VIZUAL

```
┌─────────────────────────────────────────┐
│  1. USER completează booking            │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│  2. Backend creează Reservation         │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│  3. emailService.js                     │
│     - Conectează la Gmail SMTP          │
│     - Trimite email cu detalii          │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│  4. Gmail SMTP Server                   │
│     - Verifică credențiale              │
│     - Livrează email la destinatar      │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│  5. USER primește email în inbox        │
│     (Yahoo, Gmail, Outlook, etc.)       │
└─────────────────────────────────────────┘
```

---

## 🎓 ÎNTREBĂRI FRECVENTE

**Q: Pot folosi Yahoo în loc de Gmail?**
A: DA! Schimbi doar în emailService.js:
```javascript
service: "yahoo"
```
Apoi generezi App Password pe Yahoo.

**Q: E gratuit?**
A: DA! Gmail permite 500 email-uri/zi gratuit.

**Q: Clienții văd adresa mea reală?**
A: Văd `cityscape.hotel@gmail.com` (sau cum o numești tu).

**Q: Pot personaliza template-ul email?**
A: DA! Modifici HTML-ul din `sendReservationConfirmation()`.

**Q: Ce dacă email-ul nu ajunge?**
A: 
1. Verifică Spam folder
2. Verifică App Password
3. Verifică console pentru erori

---

## ✅ CHECKLIST FINAL

Înainte de test, verifică:
- [ ] Cont Gmail creat pentru hotel
- [ ] Verificare 2 pași activată
- [ ] App Password generat (16 caractere)
- [ ] .env configurat corect (fără spații în parolă)
- [ ] Backend pornit (npm start)
- [ ] Frontend pornit (npm start)
- [ ] Intră pe /email-test
- [ ] Introdu email-ul tău
- [ ] Verifică inbox-ul!

---

Spune-mi ce parte vrei să o detaliez mai mult! 🚀
