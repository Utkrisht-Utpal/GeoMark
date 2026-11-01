# GeoMark — Enterprise Smart Hostel Attendance & Management System

> **Authoritative, Geofenced, Device-Bound Hostel Attendance Management**  
> Developed as a production-grade Capstone & Advanced Database Management Systems (ADBMS) project demonstrating multi-tier database architecture (Microsoft SQL Server, MongoDB, Memurai/Redis), cryptographic device binding, high-precision geospatial geofencing, concurrent transaction management, and automated Excel processing.

---

## 📋 Table of Contents
1. [System Architecture & Data Tiering](#-system-architecture--data-tiering)
2. [Key Features & Verification Rules](#-key-features--verification-rules)
3. [Prerequisites & System Requirements](#-prerequisites--system-requirements)
4. [Step-by-Step Windows Setup Guide](#-step-by-step-windows-setup-guide)
5. [Demo Accounts & Test Credentials](#-demo-accounts--test-credentials)
6. [Automated Testing & QA Verification](#-automated-testing--qa-verification)
7. [REST API Documentation](#-rest-api-documentation)
8. [Troubleshooting & Windows FAQ](#-troubleshooting--windows-faq)

---

## 🏛 System Architecture & Data Tiering

GeoMark employs a polyglot persistence architecture designed for strict ACID guarantees, high-throughput audit logging, and ultra-low-latency distributed caching:

```
                      ┌────────────────────────────────────────┐
                      │    GeoMark Frontend (React 19 + TS)    │
                      │       Vite 6 + Tailwind CSS v4         │
                      └──────────────────┬─────────────────────┘
                                         │ JSON / HTTPS
                                         ▼
                      ┌────────────────────────────────────────┐
                      │     GeoMark Backend (Express + TS)     │
                      │  JWT Auth • Rate Limiting • Geofence   │
                      └────┬─────────────────┬────────────────┬┘
                           │                 │                │
            ACID Relational│      Audit Logs │     In-Memory  │
            Authoritative  │      JSON Docs  │     Blacklist  │
                           ▼                 ▼                ▼
┌────────────────────────────┐ ┌───────────────────┐ ┌────────────────────┐
│   Microsoft SQL Server     │ │     MongoDB       │ │  Memurai (Redis)   │
│  (ODBC Driver 18, Windows) │ │ (Mongoose / TTL)  │ │ (Port 6379 Win32)  │
├────────────────────────────┤ ├───────────────────┤ ├────────────────────┤
│ • HOSTELS (Geofences)      │ │ • LocationAuditLog│ │ • JWT Blacklisting │
│ • ROOMS (Capacity & Occ.)  │ │   (90-day TTL)    │ │ • Rate Limiting    │
│ • WARDENS (Staff Accounts) │ │ • DeviceResetLog  │ │ • Excel Preview    │
│ • STUDENTS (Rosters)       │ │   (180-day TTL)   │ │   Staging (15m TTL)│
│ • DEVICE_BINDINGS (UUIDs)  │ └───────────────────┘ └────────────────────┘
│ • ATTENDANCE_RECORDS       │
│   (Unique Student + Date)  │
└────────────────────────────┘
```

### 1. Microsoft SQL Server (Authoritative Relational Database)
- Authoritative system of record for institutional entities, student identities, room occupancy, device bindings, and official daily attendance.
- Enforces strict unique constraints (`UQ_Student_Attendance_Date`), cascading foreign keys, check constraints on coordinates and capacity, and pessimistic locking (`WITH (UPDLOCK, HOLDLOCK)`) to prevent room over-allocation and duplicate attendance submissions.

### 2. MongoDB (High-Throughput Audit & Geolocation Logging)
- Records detailed telemetry for every attendance attempt (timestamp, device metadata, raw GPS coordinates, calculated distance, accuracy radius, evaluation verdict, and rejection reason).
- Tracks device unbind audit trails with reason codes and warden identities.
- Utilizes MongoDB automated **Time-To-Live (TTL) indexes** (90 days for location audit logs, 180 days for device resets) for hands-free compliance and data retention.

### 3. Memurai / Redis (In-Memory Accelerator & State Machine)
- Redis 7.x-compatible high-performance cache for Windows.
- **JWT Revocation / Blacklist**: Instant session revocation on logout using cryptographic `jti` tokens with automated TTL matching remaining JWT life.
- **Rate Limiting**: Sliding window counters protecting login and attendance endpoints against brute-force attempts.
- **Excel Import Staging**: Caches validated 2-phase student import rosters with 15-minute TTL prior to transactional database commit.

---

## 🎯 Key Features & Verification Rules

### 1. Authoritative Attendance Window (7:30 PM to 8:45 PM Asia/Kolkata)
- Validated strictly against server clock converted to seconds from midnight in `Asia/Kolkata`:
  - Opening boundary: `19 * 3600 + 30 * 60 = 70200s` (19:30:00.000 IST).
  - Closing boundary: `20 * 3600 + 45 * 60 = 74700s` (20:45:00.000 IST).
- Submissions before 19:30:00 or after 20:45:00 are rejected immediately with HTTP 400.
- Client-supplied clock timestamps are never trusted.

### 2. Uncertainty-Aware Geofence Engine (Haversine Formula)
- Calculates true spherical distance between student GPS coordinates and hostel centroid:
  $$\Delta\sigma = 2 \arcsin \left( \sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)} \right)$$
  $$\text{Distance} = R \times \Delta\sigma \quad (\text{where } R = 6,371,000 \text{ m})$$
- Evaluates GPS accuracy uncertainty:
  - If $\text{Distance} + \text{Accuracy} \le \text{Radius}$, the student is **conclusively within** the hostel premises $\rightarrow$ **ACCEPTED**.
  - If $\text{Distance} > \text{Radius}$ or $\text{Distance} + \text{Accuracy} > \text{Radius}$, location reading is ambiguous or out of bounds $\rightarrow$ **REJECTED**.
  - Negative, zero, or excessively noisy accuracy readings (> 50m) are automatically rejected.

### 3. Hardware / Device Binding Security
- Unique cryptographic UUID generated on browser initialization.
- Automatic device registration on student's first authenticated session.
- Submissions with mismatched device UUIDs are rejected with HTTP 403.
- Wardens can unbind lost or replaced devices via the Warden Portal, creating immutable MongoDB audit logs.

### 4. Concurrency & Integrity Hardening
- **Duplicate Attendance**: Guarded by SQL Server unique constraint `(student_id, attendance_date)`. Simultaneous concurrent requests return exactly one `201 Created` and four `409 Conflict` responses without database deadlocks.
- **Room Allocation**: Enforces room capacity checks using `WITH (UPDLOCK, HOLDLOCK)` directly inside parameterized SQL batches. Prevents race-condition room over-allocation.
- **Excel Injection Defense**: Automatically sanitizes spreadsheet exports by prefixing potentially dangerous formula triggers (`=`, `+`, `-`, `@`) with a single quote.

---

## 💻 Prerequisites & System Requirements

Ensure the following software packages are installed on your Windows development environment:

| Requirement | Minimum Version | Notes |
|---|---|---|
| **Operating System** | Windows 10 / 11 (64-bit) | PowerShell 5.1+ or PowerShell 7 |
| **Node.js** | v18.0.0+ (v20+ recommended) | Includes `npm` v9+ |
| **Microsoft SQL Server** | 2019 / 2022 Express or Developer | Windows Authentication (Trusted Connection) |
| **ODBC Driver for SQL Server** | ODBC Driver 18 | Required by `msnodesqlv8` native bridge |
| **MongoDB Community** | v6.0+ or v7.0+ | Running as Windows Service on port `27017` |
| **Memurai Developer** | v3.0+ (or Redis for Windows) | Running on port `6379` |
| **Google Chrome / Chromium** | Latest Stable | Required for browser E2E test automation |

---

## 🛠 Step-by-Step Windows Setup Guide

### 1. Database Initialization

#### A. Microsoft SQL Server Setup
1. Launch **SQL Server Management Studio (SSMS)** or open PowerShell with `sqlcmd`.
2. Connect to your local SQL Server instance: `Server=(local)` or `Server=localhost`.
3. Open and execute the schema initialization script:
   ```powershell
   sqlcmd -S "(local)" -E -i "p:\GeoMark\backend\database\schema.sql"
   ```
4. Seed the database with hostels, rooms, wardens, students, and demo devices:
   ```powershell
   sqlcmd -S "(local)" -E -i "p:\GeoMark\backend\database\seed.sql"
   ```
   *(Alternatively, open both scripts in SSMS and click **Execute**).*

#### B. MongoDB & Memurai Verification
Ensure MongoDB and Memurai services are active in Windows Services (`services.msc`):
```powershell
# Verify MongoDB port
Test-NetConnection -ComputerName 127.0.0.1 -Port 27017

# Verify Memurai / Redis port
Test-NetConnection -ComputerName 127.0.0.1 -Port 6379
```

---

### 2. Backend Setup & Configuration

1. Navigate to the backend directory:
   ```powershell
   cd p:\GeoMark\backend
   ```

2. Verify or create your `.env` configuration file:
   ```powershell
   Copy-Item .env.example .env
   ```

3. Ensure `.env` contains the required settings:
   ```ini
   PORT=5000
   NODE_ENV=development
   TZ=Asia/Kolkata

   # SQL Server (ODBC Driver 18 with Windows Authentication)
   SQL_SERVER=(local)
   SQL_DATABASE=GeoMark
   SQL_CONNECTION_STRING=Driver={ODBC Driver 18 for SQL Server};Server=(local);Database=GeoMark;Trusted_Connection=yes;TrustServerCertificate=yes;

   # MongoDB Audit Database
   MONGO_URI=mongodb://127.0.0.1:27017/geomark

   # Memurai / Redis Cache & Blacklist
   REDIS_HOST=127.0.0.1
   REDIS_PORT=6379
   REDIS_PASSWORD=

   # Authentication Security
   JWT_SECRET=geomark_local_dev_secret_key_2026_academic
   JWT_EXPIRES_IN=1d
   ```

4. Install backend dependencies:
   ```powershell
   npm install
   ```

5. Verify database connectivity:
   ```powershell
   npm run db:verify
   ```
   *Expected output: `Summary: SQL=OK, Mongo=OK, Redis=OK`.*

6. Start the backend development server:
   ```powershell
   npm run dev
   ```
   *The backend will be available at `http://localhost:5000`.*

---

### 3. Frontend Setup & Startup

1. Open a new PowerShell terminal and navigate to the frontend directory:
   ```powershell
   cd p:\GeoMark\frontend
   ```

2. Install frontend dependencies:
   ```powershell
   npm install
   ```

3. Start the Vite development server:
   ```powershell
   npm run dev
   ```
   *The client interface will be available at `http://localhost:5173`.*

---

## 👥 Demo Accounts & Test Credentials

The database seed script provides ready-to-use accounts for both hostels:

### Student Accounts (Password for all: `Student@123`)

| Roll Number | Full Name | Hostel Assigned | Room | Device Status | Initial Test Scenario |
|---|---|---|---|---|---|
| `21BCS1001` | Aarav Sharma | Shivalik Boys Hostel | B-101 | **Pre-bound** (`demo-device-uuid-aarav-laptop-001`) | Direct attendance marking & history |
| `21BCS1002` | Rohan Mehta | Shivalik Boys Hostel | B-101 | **Unbound** | First-login browser device binding |
| `21BCS1003` | Kabir Verma | Shivalik Boys Hostel | B-102 | **Unbound** | Single-occupant room attendance |
| `21BCS2001` | Ananya Sen | Aravali Girls Hostel | G-101 | **Unbound** | Multi-hostel cross-isolation check |
| `21BCS2002` | Priya Nair | Aravali Girls Hostel | G-101 | **Unbound** | Roommate verification |

### Warden Accounts (Password for all: `Warden@123`)

| Username | Full Name | Hostel Managed | Permitted Radius | Responsibilities |
|---|---|---|---|---|
| `warden.shivalik` | Dr. Rajesh Kumar | Shivalik Boys Hostel | 120 meters | Full Shivalik roster, Excel import/export, room management |
| `warden.aravali` | Prof. Sunita Sharma | Aravali Girls Hostel | 100 meters | Full Aravali roster, reports, unbind devices |

---

## 🧪 Automated Testing & QA Verification

GeoMark includes a comprehensive suite of automated verification scripts testing security boundaries, SQL constraints, and browser interactions.

Run test suites from the `backend/` directory:

```powershell
cd p:\GeoMark\backend

# 1. Full Database Health & Schema Check
npm run db:verify

# 2. Authentication, Rate Limiting & JWT Blacklist Tests (10 tests)
npm run test:auth

# 3. Cryptographic Device Binding & Unbind Flow (10 tests)
npm run test:device

# 4. Geofence Engine & Uncertainty Bounds Tests (15 tests)
npm run test:attendance

# 5. Exact Time Window Precision (Seconds from Midnight, 22 boundary tests)
npm run test:time

# 6. Multi-Cycle Concurrent Attendance Insertion (50 requests across 10 cycles)
npm run test:concurrency

# 7. Phase 4 Comprehensive Functional Suite (28 tests)
npm run test:phase4

# 8. Independent QA & Security Audit Suite (44 tests, 100% pass)
npm run test:qa:phase4

# 9. Headless Chrome Puppeteer Browser E2E Suite (Desktop 1280x800 & Mobile 375x667)
npm run test:qa:browser
```

### Production Build Verification
Confirm zero TypeScript compilation errors and production readiness:
```powershell
# Verify Backend TypeScript compilation
npm run build --prefix backend

# Verify Frontend TypeScript & Vite production bundle
npm run build --prefix frontend
```

---

## 📡 REST API Documentation

### 1. Authentication (`/api/auth`)
- `POST /api/auth/login` — Authenticates student or warden, validates credentials, returns signed JWT.
- `POST /api/auth/logout` — Revokes active JWT by adding its `jti` to Redis blacklist with TTL.
- `GET /api/auth/me` — Returns current authenticated user profile and permissions.

### 2. Student Portal (`/api/student`)
- `GET /api/student/device/status` — Retrieves registered device status for authenticated student.
- `POST /api/student/device/bind` — Binds client UUID on first authenticated device registration.
- `POST /api/student/device/verify` — Validates device UUID match against database record.
- `POST /api/student/attendance/mark` — Authoritative attendance submission with geofence & time checks.
- `GET /api/student/attendance/today` — Returns today's attendance record and current window status.
- `GET /api/student/attendance/history` — Paginated personal attendance history with audit verdicts.

### 3. Warden Portal (`/api/warden`)
- `GET /api/warden/attendance` — Overview of hostel roster (Present, Absent, Attendance %) for a given date.
- `GET /api/warden/attendance/:studentId` — Student detail and past attendance records within assigned hostel.
- `POST /api/warden/students/reset-device` — Unbinds student device with mandatory reason and MongoDB audit logging.
- `GET /api/warden/students` — Filterable student roster with pagination, search, status, and room filters.
- `POST /api/warden/students` — Manual student enrollment with atomic room capacity check.
- `PUT /api/warden/students/:id` — Student profile update and room reassignment.
- `POST /api/warden/students/status` — Student account lifecycle modification (ACTIVE, SUSPENDED, ALUMNI).
- `GET /api/warden/rooms` — Room list with floor number, capacity, and active occupancy count.
- `POST /api/warden/rooms` — Room creation with positive capacity constraints.
- `PUT /api/warden/rooms/:id` — Room modification and deactivation guard (blocks deactivation if occupied).
- `GET /api/warden/excel/template` — Generates formatted Excel import template (.xlsx).
- `POST /api/warden/excel/preview` — Parses and validates student import spreadsheet, caching preview in Redis.
- `POST /api/warden/excel/confirm` — Transactional commit of validated student import batch with pre-commit capacity revalidation.
- `GET /api/warden/excel/export/roster` — Exports hostel student roster to Excel with formula injection protection.
- `GET /api/warden/excel/export/daily` — Exports daily attendance report (Present and Absent sheets).
- `GET /api/warden/excel/export/range` — Exports multi-day attendance records across custom date range.
- `GET /api/warden/reports/trends` — 7, 14, and 30-day contiguous turnout percentage trends.
- `GET /api/warden/reports/rooms` — Room-wise attendance rate aggregation for targeted monitoring.
- `GET /api/warden/reports/defaulters` — Automated identification of students with attendance below 75%.

### 4. System Health (`/health`)
- `GET /health` — Basic service uptime probe.
- `GET /health/db` — Comprehensive health check reporting live connection status and latency for SQL Server, MongoDB, and Memurai.

---

## 🔧 Troubleshooting & Windows FAQ

### 1. SQL Server Connection Error: `Server is not found or not accessible`
- **Cause**: SQL Server service is stopped, or TCP/IP / Named Pipes protocols are disabled.
- **Fix**: Open **SQL Server Configuration Manager**:
  1. Under **SQL Server Services**, ensure `SQL Server (MSSQLSERVER)` or `SQL Server (SQLEXPRESS)` is **Running**.
  2. Under **SQL Server Network Configuration** $\rightarrow$ **Protocols for MSSQLSERVER**, verify that **Named Pipes** and **TCP/IP** are **Enabled**.
  3. Restart the SQL Server service.

### 2. ODBC Driver 18 SSL/Certificate Error: `SSL Provider: The certificate chain was issued by an authority that is not trusted`
- **Cause**: ODBC Driver 18 defaults to strict encryption.
- **Fix**: Ensure your connection string includes `TrustServerCertificate=yes;`:
  ```ini
  SQL_CONNECTION_STRING=Driver={ODBC Driver 18 for SQL Server};Server=(local);Database=GeoMark;Trusted_Connection=yes;TrustServerCertificate=yes;
  ```

### 3. Memurai / Redis Connection Refused (`connect ECONNREFUSED 127.0.0.1:6379`)
- **Cause**: Memurai background service is not running.
- **Fix**: Open PowerShell as Administrator and run:
  ```powershell
  Start-Service memurai
  # Test with Redis CLI
  memurai-cli ping
  ```

### 4. MongoDB `connect EACCES 127.0.0.1:27017`
- **Cause**: MongoDB service is stopped or port 27017 is blocked.
- **Fix**: Start the MongoDB service:
  ```powershell
  net start MongoDB
  ```

### 5. Time Window Boundary Testing
- The server enforces attendance between **7:30 PM and 8:45 PM Asia/Kolkata**.
- For development testing outside of this window, you can run the automated unit test suite `npm run test:time`, which uses controlled server-side clock mocks to test boundary seconds down to 19:29:59, 19:30:00, 20:45:00, and 20:45:01.

---

## 🎓 Academic Evaluation Context

Developed as an **Advanced Database Management Systems (ADBMS)** Capstone Project. Key demonstrated academic concepts include:
- **Relational Integrity**: 3NF normalized schema, parameterized SQL statements, transactional boundaries, unique composite constraints.
- **Concurrency Control**: Pessimistic row locking (`UPDLOCK, HOLDLOCK`) preventing race conditions in high-demand room booking and duplicate attendance scenarios.
- **Polyglot Database Design**: Harmonizing ACID relational transactions with schemaless document audit trails and in-memory key-value caching.
- **Security Engineering**: Defense against timing attacks, SQL injection, Excel formula injection, JWT replay attacks, and GPS spoofing uncertainty.

---

**GeoMark — Verify Presence. Simplify Attendance.**
