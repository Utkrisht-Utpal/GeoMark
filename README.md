# GeoAttend – Smart Hostel Attendance System

**GeoAttend** is a location-based hostel attendance management web application that allows students to mark their daily attendance from within their hostel premises without physically visiting the warden's office.

The system uses GPS-based geofencing, registered-device verification and time-based attendance validation to maintain a convenient and reliable attendance process.

## 🎯 Problem Statement

Traditional hostel attendance systems often require students to physically visit the warden's office to mark their attendance. This can be inconvenient, especially when students are already present inside their hostel rooms.

GeoAttend aims to simplify this process by allowing students to mark attendance through a website, provided they satisfy the configured location, device and time requirements.

## ✨ Key Features

### Student Portal
- Student login using mock university credentials.
- First-time device registration and device binding.
- GPS-based location verification.
- Attendance marking between **07:30 PM and 08:45 PM**.
- View personal attendance history.
- View attendance confirmation and status.

### Warden Portal
- Warden authentication.
- Import student records through Excel files.
- View total, present and absent students.
- Search students using their UID or name.
- View individual attendance history.
- Download present and absent attendance reports.
- Configure hostel coordinates and permitted geofence radius.
- Manage registered device bindings.

## 🛠️ Technology Stack

| Component | Technology |
|---|---|
| Frontend | React + TypeScript |
| Styling | Tailwind CSS |
| Backend | Node.js + Express |
| Relational Database | Microsoft SQL Server |
| NoSQL Database | MongoDB |
| Location Services | Browser Geolocation API |
| Device Verification | WebAuthn / Device Binding |
| Excel Processing | SheetJS |
| Data Visualization | Recharts |
| Development Environment | Google Antigravity |

## 🗄️ Database Overview

### SQL Server
Used to store structured application data:
- Students
- Hostels
- Wardens
- Attendance records
- Registered devices
- Attendance settings

### MongoDB
Used to store flexible location verification logs and attendance attempt metadata.

## 📍 Attendance Verification Process

An attendance request is accepted only when:

1. The student is authenticated.
2. The registered device is successfully verified.
3. The request is made between 07:30 PM and 08:45 PM.
4. The reported location is within the configured hostel geofence.
5. The location reading satisfies the configured accuracy requirements.
6. The student has not already marked attendance for that date.

All important validations are performed on the backend.

## 🔐 Security Considerations

- Role-based access for students and wardens.
- Registered-device verification.
- Server-side attendance time validation.
- GPS-based geofence verification.
- Duplicate attendance prevention.
- Secure password hashing.
- Validation of uploaded Excel files.

**Note:** GPS and device verification reduce opportunities for attendance misuse but cannot guarantee the physical identity of the person holding a device.

## 🚀 Project Status

Currently planned as an academic ADBMS project using mock university student data.

Official CUIMS authentication and facial recognition are outside the initial project scope.

## 🔮 Future Scope

- Official university authentication integration, subject to authorization.
- Facial recognition with liveness detection.
- Warden approval workflow for device changes.
- Stronger GPS spoofing detection.
- Advanced attendance analytics.

## 🎓 Academic Context

Developed as a project for Advanced Database Management Systems (ADBMS), demonstrating relational databases, NoSQL storage, SQL transactions, indexing, database optimization and data analytics.

---

**GeoAttend – Verify Presence. Simplify Attendance.**
