# Enterprise Banking Analytics Platform (Snowflake Powered)

An enterprise-grade Banking Analytics platform featuring a dual-portal design:
1. **Business Portal**: Comprehensive customer portfolios, transaction summaries, loan recoveries, branch KPIs, and red-flagged fraud hubs.
2. **Snowflake Admin Portal**: Internal staging centers, SQL workspaces with AI text-to-SQL assistants, advanced DDL centers, Zero-Copy Cloning simulators, Time Travel snapshots, and warehouse performance monitors.

The platform executes in **Simulation Mode** on boot so you can explore all features instantly without database configurations, and switches to **Live Snowflake Mode** the moment credentials are input.

---

## 🚀 Getting Started

### 1. Prerequisite Installations
Ensure Node.js and npm are installed in your workspace.

```bash
npm install
```

### 1.1 Run the app
Use one of the following commands depending on your workflow:

- `npm run dev` — starts the Cloudflare Pages-compatible Vite frontend for local development.
Note: The project now runs as a Cloudflare Pages app using Functions for the API. Local Express servers were removed; run the frontend locally with `npm run dev` and deploy the `dist` via Cloudflare Pages.

### 2. Database Schema Setup
Connect to your Snowflake web interface and copy the contents of `/snowflake_setup.sql`. Execute the entire script inside your worksheet console. This boots:
* The `ENTERPRISE_BANKING_DB` and `BANKING_SCHEMA`.
* Specialized analytics warehouses (`BANKING_ANALYTICS_WH` and `DATA_INGEST_WH`).
* Access hierarchies with role permissions (`BANKING_ADMIN`, `BANKING_DATA_ENGINEER`, `BANKING_ANALYST`, and `BANKING_BUSINESS_USER`).
* Masking and row policies for GDPR/PII security.
* Time Travel structures.

### 3. Connect Platform to Snowflake
Create a `.env` file at the root of the project (copying `.env.example`) and fill in your Snowflake and deployment credentials:

```env
GEMINI_API_KEY="your_google_gemini_api_key"
JWT_SECRET="enterprise_banking_snowflake_secret_2026"

# Snowflake Live Connection Params
SNOWFLAKE_ACCOUNT="your_snowflake_org_id_and_account"
SNOWFLAKE_USER="your_snowflake_username"
SNOWFLAKE_DATABASE="ENTERPRISE_BANKING_DB"
SNOWFLAKE_SCHEMA="BANKING_SCHEMA"
SNOWFLAKE_WAREHOUSE="BANKING_ANALYTICS_WH"
SNOWFLAKE_ROLE="BANKING_ADMIN"

# Key-pair authentication details for Cloudflare Pages Functions
SNOWFLAKE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
SNOWFLAKE_PUBLIC_KEY_FINGERPRINT="SHA256:..."
# Optional override if your Snowflake account host is nonstandard
SNOWFLAKE_API_HOST=""

# Or, if you prefer OAuth-based auth instead of key-pair
SNOWFLAKE_OAUTH_TOKEN=""
```

*Note: The app now uses Cloudflare Pages Functions + the Snowflake SQL API and does not require the native `snowflake-sdk` package.*

---

## 🔐 Enterprise Access Profiles

To test role-based segregation immediately, sign in with one of these preconfigured credentials on the login screen:

| Username | Password | Role | Portals Access |
| :--- | :--- | :--- | :--- |
| **admin** | `admin123` | **ADMIN** | Full Business & Admin Portals (Unlimited queries) |
| **engineer** | `engineer123` | **DATA_ENGINEER** | Business & Admin Portals (Data load, streams, DDL) |
| **analyst** | `analyst123` | **ANALYST** | Business Portal & SQL Workspace (**SELECT-only Read Mode**) |
| **business** | `business123` | **BUSINESS_USER** | Business Portal ONLY (Admin page locked) |

---

## 🛠️ Technological Footprint

* **Frontend Framework**: React.js with Tailwind CSS v4, Lucide Icons, and Recharts.
* **Server Stack**: Cloudflare Pages Functions using TypeScript and the Snowflake SQL API.
* **AI Engine**: Google Gemini API SDK (`@google/genai`) for English-to-SQL translation and analytics prompts.
* **Database Integration**: Snowflake SQL API via key-pair JWT or OAuth, no native `snowflake-sdk` dependency required.

---

## 🔑 Snowflake Key-Pair Authentication (RSA)

This project prefers Snowflake key-pair authentication for Cloudflare Pages Functions (no password or native `snowflake-sdk`).

1) Generate an RSA key pair (PKCS8 private key + PEM public key).

Recommended (Git Bash / Linux / macOS):

```bash
# Generate a 2048-bit RSA private key in PKCS8 format
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out private_key.pem

# Extract the public key in PEM format
openssl rsa -pubout -in private_key.pem -out public_key.pem
```

Windows PowerShell (if OpenSSL is available):

```powershell
# Use Git Bash or WSL for best compatibility. If using native OpenSSL, run same openssl commands in PowerShell.
```

2) Compute the `SNOWFLAKE_PUBLIC_KEY_FINGERPRINT` (Snowflake expects `SHA256:<base64>`):

```bash
# Derive fingerprint: DER-encode public key, hash SHA256, then base64
openssl rsa -pubin -in public_key.pem -outform DER | openssl dgst -sha256 -binary | openssl base64

# Prepend 'SHA256:' to the output when placing into env or Snowflake.
# Example result: SHA256:AbCdEfGhIjK...==
```

3) Register the public key with your Snowflake user (run in Snowflake worksheet or via SnowSQL):

```sql
ALTER USER "<USER_NAME>" SET RSA_PUBLIC_KEY='-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkq...\n-----END PUBLIC KEY-----';
```

Replace `<USER_NAME>` with your Snowflake username. You can paste the full PEM block (including newlines) into the SQL string; in many SQL clients you should escape single quotes accordingly.

4) Environment variables

Place the private key and fingerprint into your environment or Cloudflare Pages Secrets (recommended):

- `SNOWFLAKE_PRIVATE_KEY` — the full PEM PKCS8 private key (multi-line, include `\n` when stored in a single-line env var)
- `SNOWFLAKE_PUBLIC_KEY_FINGERPRINT` — `SHA256:<base64_fingerprint>`

DO NOT commit `SNOWFLAKE_PRIVATE_KEY` to source control. Use the Cloudflare Pages Secrets UI, a secure secrets manager, or environment variables in CI.

5) Local testing steps (after you set env vars or secrets)

```powershell
# restart local Pages dev with env vars available in the session
$env:SNOWFLAKE_PRIVATE_KEY = Get-Content -Raw ./private_key.pem
$env:SNOWFLAKE_PUBLIC_KEY_FINGERPRINT = 'SHA256:...'
npx wrangler pages dev . --port 8787
```

6) Notes on formats and compatibility

- The private key must be PKCS8 (`-----BEGIN PRIVATE KEY-----`). If you generated a PKCS1 key (`-----BEGIN RSA PRIVATE KEY-----`), convert it:

```bash
openssl pkcs8 -topk8 -inform PEM -outform PEM -in rsa_private_pkcs1.pem -out private_key.pem -nocrypt
```

---
