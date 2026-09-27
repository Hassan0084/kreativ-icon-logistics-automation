# Kreativ Icon Logistics Automation System

A full-stack enterprise logistics, customs clearance, freight forwarding, invoicing, and tracking web application for **Kreativ Icon Logistics**.

---

## 🌟 Key Features

1. **Dashboard & Operational Intelligence**
   - KPI metrics: Active shipments, delivered count, pending pickups, delayed shipments warnings.
   - Financial breakdown: Real-time revenue, job cost expenses, net profit, and profit margin %.
   - Interactive upcoming delivery list and recent activity audit trail.

2. **Consignment & Shipment Management**
   - Multi-modal support: Air Freight, Sea Freight (FCL/LCL), Land Freight, Customs Clearance, Warehousing.
   - Auto-generated tracking numbers (Format: `KIC-YYYYMMDD-XXXX`).
   - Milestone status updates (Booked, Picked Up, Customs Clearance, Out for Delivery, Delivered).
   - Automated email status notification triggers.
   - Profitability calculator per shipment.

3. **Public Client Tracking Portal**
   - No login required for customers to search shipment progress via shipment number.
   - Visual timeline with location tags and milestone timestamps.

4. **Quotations & Invoicing System**
   - Formal sales quotation builder with itemized rate lists, automatic VAT calculation (15%), and status lifecycle.
   - Compliant tax invoice generator with balance tracking and partial payment recording.
   - On-the-fly PDF generation with custom Kreativ Icon branding using PDFKit.

5. **Supplier Invoice Portal** *(new)*
   - External suppliers log in with their own account and upload invoice files.
   - Files are held in **Supabase Storage** (private bucket) and downloaded via short-lived signed URLs.
   - Suppliers only ever see their own records; internal staff can review all submissions.
   - Storage and records only — submitted invoices are **not** converted into `Expense` rows and do not affect the profit dashboard.

6. **Expenses & Document Vault**
   - Track job operational expenses (customs duty, port handling, storage/demurrage).
   - Document repository for Bills of Lading, AWB, Bayan Customs Declarations, and Receipts.

7. **Role-Based Access Control (RBAC)**
   - Internal roles: `ADMIN`, `MANAGER`, `OPERATIONS`, `SALES`, `FINANCE`, `VIEWER`.
   - External role: `SUPPLIER` — restricted to a separate portal shell, scoped to one supplier record.

---

## 🚀 Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, Axios, React Router v6, React Hot Toast, Recharts.
- **Backend**: Node.js, Express, TypeScript, Prisma ORM, **Supabase (PostgreSQL + Storage)**, JWT Authentication, Bcrypt, PDFKit, Nodemailer.
- **Infrastructure**: Docker, Docker Compose, Nginx Reverse Proxy.

---

## ⚙️ Setup

### 1. Prerequisites
- Node.js v20+
- A free [Supabase](https://supabase.com) project

### 2. Create the storage bucket

In the Supabase Dashboard → **SQL Editor** → New query, run the contents of:

```
supabase/setup.sql
```

This creates the private `supplier-invoices` bucket (10 MB limit, PDF/image/Word MIME types). It is safe to re-run.

> The bucket's MIME allowlist is enforced by Supabase Storage, so uploads are
> rejected unless the request's content type is on it. The backend forwards the
> client-validated `Content-Type` for this reason.

### 3. Environment configuration

```bash
cp backend/.env.example backend/.env
```

Then fill in `backend/.env`:

| Variable | Where to find it |
|---|---|
| `DATABASE_URL` | Project Settings → **Database** → *Session pooler* URI (port `5432`) |
| `DIRECT_URL` | Project Settings → **Database** → *URI* (direct, used for migrations) |
| `SUPABASE_URL` | Project Settings → **API** → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → **API** → `service_role` key |
| `JWT_SECRET` | Generate your own, e.g. `openssl rand -base64 48` |

> **Use the session pooler for `DATABASE_URL`.** Supabase's direct endpoint is
> IPv6-only and will fail to connect on most IPv4 networks. The pooler hostname
> looks like `aws-0-<region>.pooler.supabase.com`.

> `SUPABASE_SERVICE_ROLE_KEY` bypasses row-level security. It is read only by the
> backend. Never place it in a `VITE_*` variable or commit it.

### 4. Install, migrate, seed, run

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate deploy   # creates the schema in Supabase
npm run db:seed
npm run dev
```

```bash
cd frontend
npm install
npm run dev
```

App runs at `http://localhost:5173` (frontend) and `http://localhost:5000` (API).

### Demo credentials (created by the seed)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@kreativicon.com` | `admin123` |
| Manager | `manager@kreativicon.com` | `manager123` |
| Operations | `ops@kreativicon.com` | `ops123` |
| Sales | `sales@kreativicon.com` | `sales123` |
| Finance | `finance@kreativicon.com` | `finance123` |
| **Supplier** | `supplier@kreativicon.com` | `supplier123` |

The supplier account is bound to the `Shanghai Trade Co.` supplier record and lands
on `/supplier/invoices` instead of the internal dashboard.

Internal staff review submissions from **Supplier Invoices** in the sidebar
(`/supplier-invoices`), which keeps the staff navigation and adds a supplier
picker for filing on a supplier's behalf. The two views share one page but are
separate routes: `/supplier/*` is restricted to the `SUPPLIER` role, so staff
cannot end up stranded in the portal shell.

> Re-running the seed never overwrites a password you have since changed.

---

## 🐳 Docker Deployment

```bash
docker compose up --build -d
```

Access the application at `http://localhost`.

The backend container runs `prisma migrate deploy` before starting, so the schema
is applied on first boot. `backend/.env` must be populated first — the compose
file loads it via `env_file`.

Both images build from the **repository root** so that `nginx/default.conf` and
the service Dockerfiles can be shared; `.dockerignore` keeps `node_modules`,
build output, and `.env` out of the image layers.

### Optional: local Postgres instead of Supabase

For offline development you can run the bundled Postgres:

```bash
docker compose --profile localdb up -d
```

Then point `DATABASE_URL` and `DIRECT_URL` at `postgres:5432` in `backend/.env`
and start the backend outside Docker so it can reach the published port.

---

## 🔐 Supplier Portal Notes

- A `SUPPLIER` user **must** be linked to a `Supplier` record (`User.supplierId`).
  Login is rejected with a clear message if the link is missing.
- Scoping is enforced server-side on every endpoint. A supplier cannot read,
  download, or delete another supplier's invoice by manipulating request
  parameters.
- The supplier portal uses its own layout component and is unreachable from
  internal navigation, and internal routes redirect suppliers away.
- Adding a supplier login: insert a `User` with `role = 'SUPPLIER'` and
  `supplierId` set to the supplier's `id`.

---

## 📁 Project Structure

```
├── backend/
│   ├── prisma/
│   │   ├── migrations/            # versioned SQL (generated)
│   │   ├── schema.prisma          # PostgreSQL datasource
│   │   └── seed.ts
│   └── src/
│       ├── middleware/            # JWT auth, RBAC, error handling
│       ├── routes/                # 15 API route groups
│       ├── services/              # PDF, notifications, Supabase Storage
│       └── utils/                 # logger, helpers, activity log
├── frontend/
│   └── src/
│       ├── components/            # layout (internal + supplier), ui primitives
│       ├── pages/                 # feature pages incl. Supplier/
│       └── types/                 # shared TypeScript types
├── nginx/default.conf
├── supabase/setup.sql             # storage bucket bootstrap
└── docker-compose.yml
```
