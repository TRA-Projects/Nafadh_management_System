# NFD_MassSeed_Script.sql — Full-System Test Data

A single, one-run T-SQL script that populates a **completely empty** Nafadh database with ~68,000 realistic, referentially-consistent rows across all 51 tables — built specifically so you can exercise every page in every portal and see real, populated data rather than empty states.

---

## How to run it

1. Make sure your database is freshly migrated and **has no seed data at all** — this script assumes identity columns start at 1 and count up in strict insertion order. Running it against a database that already has rows will corrupt every foreign-key reference in the script.
2. Run the script **once**, in full, against that empty database (SQL Server Management Studio, Azure Data Studio, or `sqlcmd`).
3. That's it — no second script, no follow-up steps. It's wrapped in a single `BEGIN TRANSACTION` / `COMMIT TRANSACTION`, so if anything fails partway through, nothing is left half-applied.

This script **replaces** the need for the earlier `DataSeed_Script.sql` and `DataFix_And_NewSeed_Script.sql` entirely — it seeds the fixed catalogs (Roles, Permissions, Badges, Feedback criteria) itself from scratch. Don't run those older scripts before or after this one; you'd get primary-key collisions.

---

## Login credentials for testing

Every single seeded user — all ~1,098 of them — shares the same password, so you can log in as literally anyone in the dataset to test a given scenario:

**Password for every account: `Test@12345`**

Four accounts are the ones you specifically asked for, with clean, memorable emails and guaranteed rich, fully-connected data around them:

| Role | Email | What's guaranteed around this account |
|---|---|---|
| Admin | `admin@nafadh.om` | Full visibility across all data |
| Company Supervisor | `company@nafadh.om` | Owns/supervises **Company #1**, which has real trainees, branches, and warnings |
| Trainer | `trainer@nafadh.om` | Teaches **Batch #1** ("الدفعة الأولى — دفعة الاختبار") plus 4 other random batches, with real evaluation templates, tasks, and submissions to grade |
| Trainee | `trainee@nafadh.om` | Enrolled in Batch #1 under Company #1, with a full attendance history, evaluations, submissions, badges, notifications, and one open support conversation |

Beyond these four, every other seeded user follows a predictable email pattern if you want to test a *specific* scenario (e.g., a company with a `PendingApproval` status, or a trainee with `Rejected` verification) — see the "Interesting edge cases" section below.

---

## What's in it (scale summary)

| Domain | Approx. rows | Notes |
|---|---|---|
| Users | 1,098 | 1 admin, 60 company owners, ~155 supervisors, 81 trainers, 801 trainees |
| Companies | 60 | Mostly `Approved`, a few `PendingApproval`/`Rejected` for testing those states |
| Trainees | 801 | ~726 assigned to a company, ~75 deliberately left `NotAssigned` |
| Tracks / Programs | 6 / 30 | |
| Batches | 120 | Mix of `Upcoming` / `Ongoing` / `Completed` |
| Enrollments | 726 | One per assigned trainee |
| Modules / Lessons / Materials | 180 / 900 / 770 | 6 modules per program, 5 lessons per module |
| Module progress records | 4,356 | Realistic partial-completion spread per trainee |
| Sessions / Session attendance | 417 / 2,501 | |
| **Daily attendance** | **12,810** | The single largest table — ~20 days per enrolled trainee, realistic Present/Late/Absent/Excused mix |
| Excuses | 489 | Mixed Pending/Approved/Rejected |
| Tasks / Rubrics / Submissions | 353 / 861 / 1,593 | |
| Projects / Project members | 20 / 61 | |
| Evaluation templates / criteria | 400 / 1,202 | Module+stage scoped, per the flexible-evaluation design |
| Evaluations / criterion scores | 3,754 / 11,910 | Real weighted rollups, not placeholder flat scores |
| Warnings | 400 | Mix of Company-scope and Trainee-scope (the polymorphic model) |
| Conversations / Messages | 330 / 687 | Mix of Company threads and Trainee complaints |
| Notifications | 4,524 | Spread across all users, with a guaranteed set for each hero account |
| Announcements | 104 | All 3 scopes: Platform / Company / Batch |
| Certificates | 250 | One per `Completed` enrollment |
| Reports | 80 | |
| Trainee/Company payments + schedules | 425+1,275 / 58+174 | The one domain no current portal UI uses yet — seeded anyway for completeness |
| Audit logs | 3,500 | |
| Feedback (trainer + batch ratings) | 2,262 / 6,786 scores | |
| Badges / Trainee badges | 5 / 752 | Automatically-earned-style data, not manually stubbed |

**Total: ~68,000 rows.**

---

## Interesting edge cases baked in (useful for targeted testing)

- **Company #3** is left `PendingApproval` and **Company #6** is `Rejected` — test the Admin approval/rejection flow without hunting for one.
- **~75 trainees** have `Status = NotAssigned` (no company) — test the "not yet placed" state and the assignment flow.
- **~10–15% of trainees** have `VerificationStatus = Pending` — test the identity-verification queue.
- A realistic spread of `Warning.Status` (Open/UnderReview/Resolved/Escalated) and both `Scope` values (Company/Trainee) — the Admin Communications hub's third tab and the Company/Admin Warnings pages will all show real, varied data immediately.
- Attendance data intentionally includes all four statuses (Present/Late/Absent/Excused) with realistic proportions (~78% present), so attendance-rate calculations and compliance-rate endpoints return meaningful, non-trivial numbers.

---

## A note on determinism

The generator seeds Python's random number generator with a fixed value, so if you ever need to regenerate this file, it will produce **the exact same data** every time — useful if you want to reset your test database to a known state repeatedly during QA.
