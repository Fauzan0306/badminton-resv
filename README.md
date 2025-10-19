# 🏸 BadmintonGo — Full Stack Badminton Court Reservation System

**BadmintonGo** adalah aplikasi reservasi lapangan badminton berbasis web yang dikembangkan menggunakan **Next.js (Frontend)** dan **Golang (Backend)**.  
Aplikasi ini memungkinkan pengguna untuk memilih tanggal, waktu bermain, lapangan, serta melakukan pembayaran online melalui **Midtrans Snap**.

---

## 🚀 Features

- 🗓 **Select Date & Timeslot**  
  Pengguna dapat memilih tanggal dan waktu bermain yang tersedia.

- 🏟 **Court Selection**  
  Menampilkan daftar lapangan dengan jadwal real-time berdasarkan tanggal.

- 💳 **Integrated Payment Gateway (Midtrans Snap)**  
  Mendukung pembayaran QRIS, GoPay, Dana, kartu debit/kredit, dan lainnya.

- 📅 **My Bookings Page**  
  Menampilkan semua jadwal booking yang sudah dibayar (status *PAID*).

- 🌐 **Secure HTTPS Deployment**  
  Semua koneksi menggunakan SSL (Certbot + Apache reverse proxy).

- 🧠 **Optimized for Performance**  
  Fast, responsive UI dan backend ringan dengan Fiber (Golang).

---

## 🧩 System Architecture


- Midtrans Snap → mengirim *payment notification* ke backend melalui endpoint `/notification`.
- Backend → menyimpan data booking dan memperbarui status setelah pembayaran sukses.
- Frontend → hanya menampilkan data melalui API internal (bukan public endpoint).

---

## 🛠️ Tech Stack

**Frontend:**
- Next.js 15 (App Router)
- React + TypeScript
- Tailwind CSS v4
- PM2 (deployment & monitoring)

**Backend:**
- Go Fiber v2
- GORM ORM
- PostgreSQL
- Midtrans-Go SDK
- CORS, Helmet, Limiter middleware

**Server & Deployment:**
- Apache2 (Reverse Proxy)
- Certbot (Let’s Encrypt SSL)
- Ubuntu 22.04 VPS
- Firewall aktif (hanya port 80 & 443)

---

## ⚙️ Installation & Setup

### 1️⃣ Clone Repository
```bash
git clone https://github.com/username/badminton-resv.git
cd badminton-resv


cd backend
nano .env

DB_HOST=localhost
DB_USER=postgres
DB_PASS=yourpassword
DB_NAME=badminton_resv
DB_PORT=5432

MIDTRANS_SERVER_KEY=Mid-server-xxxxxxxx
MIDTRANS_CLIENT_KEY=Mid-client-xxxxxxxx
BASE_URL=https://api.arkasala.my.id

go mod tidy
go run main.go

cd frontend
npm install
npm run dev

npm run build
npm start




