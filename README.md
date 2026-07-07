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

### 2. Database Schema Setup
Connect to your Snowflake web interface and copy the contents of `/snowflake_setup.sql`. Execute the entire script inside your worksheet console. This boots:
* The `ENTERPRISE_BANKING_DB` and `BANKING_SCHEMA`.
* Specialized analytics warehouses (`BANKING_ANALYTICS_WH` and `DATA_INGEST_WH`).
* Access hierarchies with role permissions (`BANKING_ADMIN`, `BANKING_DATA_ENGINEER`, `BANKING_ANALYST`, and `BANKING_BUSINESS_USER`).
* Masking and row policies for GDPR/PII security.
* Time Travel structures.

### 3. Connect Platform to Snowflake
Create a `.env` file at the root of the project (copying `.env.example`) and fill in your Snowflake credentials:

```env
GEMINI_API_KEY="your_google_gemini_api_key"
JWT_SECRET="enterprise_banking_snowflake_secret_2026"

# Snowflake Live Connection Params
SNOWFLAKE_ACCOUNT="your_snowflake_org_id_and_account"
SNOWFLAKE_USER="your_snowflake_username"
SNOWFLAKE_PASSWORD="your_snowflake_password"
SNOWFLAKE_DATABASE="ENTERPRISE_BANKING_DB"
SNOWFLAKE_SCHEMA="BANKING_SCHEMA"
SNOWFLAKE_WAREHOUSE="BANKING_ANALYTICS_WH"
SNOWFLAKE_ROLE="BANKING_ADMIN"
```

*Note: The platform is built using lazy initialization so if credentials are not specified, it remains fully usable by fallback-mocking the connection seamlessly.*

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
* **Server Stack**: Node.js, Express.js, TypeScript bundling server.
* **AI Engine**: Google Gemini API SDK (`@google/genai`) power-translating natural language to Snowflake SQL statements.
* **DB Driver**: Official Native `snowflake-sdk` driver.
