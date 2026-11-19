# Feature map: old TAMIS app → atlis.cloud

| Old screen / route | atlis.cloud |
|---|---|
| Login, forgot password, activate account (`/login`, `/forget-password/:id`, `/activate-account/:id`) | `/login`, `/forgot-password`, `/reset-password/[token]` (also used for consultant activation) |
| Dashboard (counts, requirement / closure / timesheet / invoice charts) | `/dashboard` — KPIs, 12-month trend, pipeline, recruiter activity, top clients, timesheet & invoice status; portal dashboard for consultants and companies |
| Requirements list / add / edit / view / archive / export, JD parser, profile recommendations, broadcast & status | `/m/requirements` (+ *Fill from job description*, *Recommended profiles*, *Pipeline*, comments, structured JD, approached candidates, Excel import/export) |
| Profiles list / add / view / archive, bulk CV upload, CV versions, documents, favourites | `/m/profiles`, `/cv-parser`, profile tabs (sourcing, submissions, CV versions, engagements, parsed CV data, activity), *Update from CV*, *Add to requirement* |
| Sourcing, Submissions, Pipeline, Feedback tracker, Email logs | `/m/sourcing` (*Submit*, *Update status*, *Request RTR / GDPR*, *Masked CV*), `/m/submissions` (*Send to client*), `/m/pipeline`, `/m/feedback-tracker`, `/m/client-submission-logs` |
| RTR consent form, GDPR consent, invoice (no-dues) consent | `/consent/rtr/[token]`, `/consent/gdpr/[token]`, `/consent/invoice/[token]` |
| PS Care: contract & permanent closures, onboarding progress, contracts, POs, timesheets, invoices, expenses, comments, emails, templates | `/m/consultants`, `/m/permanent-closures`, `/m/contracts`, `/m/po-details`, `/m/timesheets`, `/m/invoices`, `/m/expenses`, `/m/pscare-comments`, `/m/pscare-templates` (*Send email*), `/m/pscare-email-log` — with *Approve / Reject* and *Send portal invite* |
| Umbrella / own-company / sub-vendor / candidate portals (engagements, company info, timesheets, invoices, expenses, profile, help) | Same menus, scoped to the signed-in company or consultant; `/me`, `/help` |
| Clients, client registration, POCs, client documents, end clients | `/m/clients`, `/register/client`, `/m/pocs`, `/m/client-documents`, `/m/end-clients` |
| Vendors, vendor registration, sub-vendors, companies, suppliers | `/m/vendors`, `/register/vendor`, `/m/sub-vendors`, `/m/companies`, `/m/suppliers` |
| CRM: accounts, prospects, contacts, connectors, comments, documents | `/m/crm-prospects`, `/m/crm-contacts`, `/m/crm-accounts`, `/m/crm-connectors` and related tabs |
| Knowledge base, updates, versions, do's & don'ts, notification banners, task tracker | `/m/knowledge-base`, `/m/updates`, `/m/versions`, `/m/dos-donts`, `/m/notification-alerts`, `/m/task-tracker` |
| Reports: recruiter, recruiter submissions, technology profiles, PS Care, POC | `/reports` (recruiter performance, requirements, PS Care, technology profiles) |
| All masters (visa, nationality, priority, designation, skills, technology tree, currencies, regions, teams …) | `/masters` → 41 master screens + **Dropdown options** |
| Users, roles & permissions, activity log, login history, SMTP settings, email templates | `/m/users` (*Set password*), `/roles`, `/m/activity-log`, `/m/login-logs`, `/m/email-settings`, `/m/email-templates` |
| 12 technology microsites (`/pega`, `/workday`, `/servicenow` …) | One `/careers` board; the old URLs redirect to it, filtered by technology |
| Cron reminders (contract, PO, timesheet, no-dues — one copy per entity) | `/api/cron/[job]`, configured from Settings and Dropdown options |

## Not carried over
These depended on things outside the app or need your input before they're rebuilt:

1. **Generating contract PDFs from the entity templates** (TestQ / Virgule / Decillion Digital letters, rate-revision and extension letters) **and the contract e-signature screen.** Contracts, annexures and signed copies can be uploaded, stored and downloaded, but they are not generated. The templates are legal documents, so they should be confirmed for atlis.cloud before they're rebuilt.
2. **Google sign-in, browser push notifications and the guided tour.** Email/password sign-in and in-app notifications work.
3. **External system integrations:** the TestQ website endpoints (`requirementListTestq`, `uploadResumeWebsite`, internship form), the SpotHRM/Pegasus sync, and EJB/CPP job posting. The public `/careers` board, `/api/public/jobs` and `/api/public/apply` replace the website feed. SpotHRM users can still be managed as data.
4. **Some one-off analytics views** from the 5,000-line analytics controller, plus the PDF weekly and PS Care reports. The main figures are in the dashboard and `/reports`, and any list can be exported to Excel.
