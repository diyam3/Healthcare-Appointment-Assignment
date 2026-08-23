# Healthcare Appointment Manager

A multi-tenant healthcare appointment platform with Patient, Doctor, and Admin portals. Supports concurrency-safe slot booking, AI-generated visit summaries, email notifications with retry, and Google Calendar sync.

## Live Demo

| | URL |
|---|---|
| **Frontend** | https://healthcare-appointment-assignment.vercel.app |
| **Backend API** | https://healthcare-appointment-c067.onrender.com |

## Tech Stack

- **Backend**: Node.js + Express
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: JWT + bcrypt
- **Queue/Jobs**: BullMQ + Redis
- **Email**: Nodemailer (SMTP via SendGrid)
- **Calendar**: Google Calendar API (OAuth 2.0)
- **LLM**: Google Gemini (`gemini-3.6-flash`, configurable via `LLM_PROVIDER`)
- **Frontend**: React + Vite + Tailwind CSS

## Setup

### 1. Clone & install

```bash
git clone https://github.com/diyam3/Healthcare-Appointment-Assignment.git
cd Healthcare-Appointment-Assignment

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your real values
```

### 3. Database setup

Requires PostgreSQL running. Set `DATABASE_URL` in `.env`, then:

```bash
cd backend
npx prisma migrate dev --name init
node prisma/seed.js   # creates admin user
```

### 4. Start services

Redis must be running on `REDIS_URL` (default: `redis://localhost:6379`).

```bash
# Backend (from /backend)
npm run dev

# Frontend (from /frontend, separate terminal)
npm run dev
```

Frontend: http://localhost:5173  
Backend API: http://localhost:3001

## API Reference

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/register | Public | Patient registration |
| POST | /api/auth/login | Public | Login (all roles) |
| GET | /api/doctors | Public | Search doctors by specialization/date |
| GET | /api/doctors/:id/slots?date= | Public | Get available slots |
| POST | /api/appointments/hold | Patient | Place a temporary slot hold |
| POST | /api/appointments/:id/confirm | Patient | Confirm hold with symptoms |
| POST | /api/appointments/:id/cancel | Patient/Doctor/Admin | Cancel appointment |
| POST | /api/appointments/:id/notes | Doctor | Submit clinical notes + prescription |
| GET | /api/appointments/:id/summary | Auth | View appointment with summaries |
| GET | /api/appointments/my | Patient | List patient's appointments |
| GET | /api/appointments/doctor/mine | Doctor | List doctor's appointments |
| GET | /api/admin/doctors | Admin | List all doctors |
| POST | /api/admin/doctors | Admin | Create doctor account |
| PUT | /api/admin/doctors/:id | Admin | Update doctor profile |
| DELETE | /api/admin/doctors/:id | Admin | Soft-delete doctor |
| POST | /api/doctors/:id/leave | Admin/Doctor | Mark leave day |
| GET | /api/oauth/google | Auth | Get Google OAuth URL |
| GET | /api/oauth/google/callback | Auth | Handle OAuth callback |

## Database Schema

**users** — id, name, email, password_hash, role (patient|doctor|admin), google_refresh_token  
**doctors** — id, user_id FK, name, specialization, slot_duration_min, working_hours (JSON), is_active  
**doctor_leaves** — id, doctor_id FK, leave_date, reason — unique(doctor_id, leave_date)  
**slot_holds** — id, doctor_id FK, patient_id FK, slot_start_time, expires_at — unique(doctor_id, slot_start_time)  
**appointments** — id, doctor_id FK, patient_id FK, slot_start_time, status, symptoms_text, pre_visit_summary (JSON), urgency_level, clinical_notes, prescription (JSON), post_visit_summary (JSON), google_event_id — unique(doctor_id, slot_start_time)  
**prescriptions** — id, appointment_id FK, drug_name, dosage, frequency, duration_days  
**reminders** — id, appointment_id FK, user_id FK, type, scheduled_at, sent  
**notifications_log** — id, user_id FK, channel, type, status, error_message, sent_at  

## LLM Prompts

**Pre-visit (symptoms → structured summary):**
```
Analyse these symptoms and return a JSON object with exactly these fields:
- urgency_level: one of "Low", "Medium", or "High"
- chief_complaint: a one-sentence description of the main complaint
- suggested_questions: an array of exactly 3 questions the doctor should ask
Respond ONLY with valid JSON. Symptoms: <symptoms>
```

**Post-visit (clinical notes → patient-friendly summary):**
```
Convert these clinical notes into a patient-friendly summary. Return JSON with:
- summary_text: plain-language summary (2-3 sentences)
- medication_schedule: array of { medication, dose, frequency, duration }
- follow_up_steps: array of next-step strings
Respond ONLY with valid JSON. Clinical notes: <notes>
```

## Google Calendar OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project → Enable **Google Calendar API**
3. OAuth consent screen → Add scope: `https://www.googleapis.com/auth/calendar.events`
4. Create OAuth 2.0 Client ID (Web application)
5. Add **Authorized redirect URIs**:
   - Local dev: `http://localhost:3001/api/oauth/google/callback`
   - Production: `https://healthcare-appointment-c067.onrender.com/api/oauth/google/callback`
6. Copy Client ID and Secret to `.env` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
7. Users connect by navigating to `GET /api/oauth/google?token=<jwt>` in their browser — they are redirected to Google's consent screen and back automatically

## Roles

- **Patient**: self-registers, books appointments, views summaries
- **Doctor**: created by admin, manages schedule and submits clinical notes
- **Admin**: created via seed script, manages doctor accounts and leave
