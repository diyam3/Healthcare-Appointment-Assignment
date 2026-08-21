# System Design: Healthcare Appointment Manager

## 1. Double-Booking Prevention

The system prevents double-booking at two layers. At the database layer, a unique index on `(doctor_id, slot_start_time)` in both `slot_holds` and `appointments` tables means the database will reject any duplicate insert with a constraint violation. At the application layer, the `POST /appointments/hold` endpoint opens a Prisma transaction and issues a `SELECT ... FOR UPDATE` on the `slot_holds` row for the target `(doctor_id, slot_start_time)`. This row-level lock serializes concurrent requests: if two patients attempt to hold the same slot simultaneously, the first transaction acquires the lock and succeeds, while the second waits. When the first commits and the unique constraint row exists, the second transaction sees the conflict and throws a P2002 error, which the API converts into a clean 409 response: "Slot is no longer available, please pick another." The booking flow never trusts client-side availability state for the final write.

## 2. Doctor-Leave Conflict Handling

When a leave day is added via `POST /api/doctors/:id/leave`, the system first upserts the `doctor_leaves` record, then immediately queries all `appointments` rows for that doctor on that date with `status = 'confirmed'`. It bulk-updates their status to `cancelled_by_leave` in a single `updateMany` call. For each affected appointment, it enqueues a cancellation email via BullMQ, including the cancellation reason and a rebooking link. The operation is atomic in the sense that both the leave insertion and status updates happen within the same request, and email delivery failures do not roll back the cancellations — the notification log captures any delivery errors for operator visibility.

## 3. Slot-Hold Mechanism

When a patient selects a slot, the system creates a `slot_holds` row with `expires_at = now() + SLOT_HOLD_MINUTES` (default 8 minutes, configurable via env). The hold ID is returned to the frontend and used as the identifier for the subsequent confirm call. When the patient submits symptoms and calls `POST /appointments/:id/confirm`, the endpoint opens a transaction, issues `SELECT ... FOR UPDATE` on the hold row, checks that `expires_at > now()`, then atomically deletes the hold and inserts the `appointments` row. If the hold has expired, the transaction returns a 410 Gone with a descriptive message. A BullMQ holdExpiry worker runs every 60 seconds to sweep `WHERE expires_at < now()`, ensuring expired holds are released even if the patient abandons the flow.

## 4. Notification Failure Handling

All email sends are asynchronous. The `emailService` enqueues jobs on a BullMQ `emailQueue` backed by Redis — it never calls SMTP directly from the API request handler. Each job is configured with 3 attempts and exponential backoff: 1 minute, 5 minutes, 30 minutes. Before enqueue, a `notifications_log` row is created with `status = 'pending'`. The email worker updates it to `status = 'sent'` on success or `status = 'failed'` with the error message after exhausting all retries. This gives operators a queryable audit trail of every notification attempt. If Redis is unavailable at startup, the server logs a warning but continues serving API requests — email is never on the critical path for booking confirmation.
