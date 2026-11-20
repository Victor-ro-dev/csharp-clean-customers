# Customer Directory — Clean Architecture (.NET 10 + React)

Full-stack CRUD application built with **Clean Architecture** and **CQRS** on the backend (.NET 10 + MediatR + EF Core) and a lightweight **React + TypeScript + Vite** frontend.

## Live Demo (Free Tier)

- **Frontend (Render Static Site):** https://customers-clean-web.onrender.com
- **Backend API (Render Docker Web Service):** https://customers-clean-api.onrender.com
- **Swagger / OpenAPI:** https://customers-clean-api.onrender.com/swagger
- **Health Check:** https://customers-clean-api.onrender.com/health

> Note: Render's free tier spins down after inactivity; the first request after idle may take a few seconds to wake up.

---

## Architecture

```text
├── MyApp.Core/             # Domain entities & repository interfaces
├── MyApp.Application/      # CQRS Commands, Queries (MediatR) & DTOs
├── MyApp.Infrastructure/   # EF Core DbContext, SQL Server / SQLite & Repositories
├── MyApp.Api/              # REST Controllers, DI composition, CORS & Swagger
├── frontend/               # React + TypeScript + Vite SPA
├── infra/                  # Azure App Service Free (F1) ARM template
└── .github/workflows/      # CI/CD pipeline (GitHub Actions)
```

### Engineering & Performance Highlights

- **Backend (.NET 10):**
  - `AsNoTracking()` on read queries to avoid EF Core `ChangeTracker` snapshot overhead.
  - `ExecuteDeleteAsync()` on deletes (single SQL `DELETE` roundtrip without prior `SELECT` materialization).
  - Full `CancellationToken` propagation from HTTP controllers down to database queries.
  - Configurable database provider (`SqlServer` for local development, `Sqlite` for zero-cost cloud hosting).
- **Frontend (React + TypeScript):**
  - `AbortController` + request timeouts in [`httpClient.ts`](frontend/src/services/httpClient.ts) and [`useCustomers.ts`](frontend/src/hooks/useCustomers.ts) to prevent race conditions and stale updates.
  - Debounced search (`250ms`) via [`useDebounce.ts`](frontend/src/hooks/useDebounce.ts) and memoized table rows (`React.memo`) in [`CustomerTable.tsx`](frontend/src/components/CustomerTable.tsx).
  - Local state reconciliation after mutations (`POST`/`PUT`/`DELETE`) to avoid redundant list refetches.

---

## API Endpoints

| Method | Route | Description |
| :--- | :--- | :--- |
| `GET` | `/api/customer` | List all customers |
| `GET` | `/api/customer/{id}` | Get customer by ID (`200` / `404`) |
| `POST` | `/api/customer` | Create a new customer (`201 Created`) |
| `PUT` | `/api/customer/{id}` | Update an existing customer (`200` / `404`) |
| `DELETE` | `/api/customer/{id}` | Delete a customer (`204 No Content` / `404`) |
| `GET` | `/health` | Service health check |

---

## Running Locally

### Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js 20+](https://nodejs.org/)
- SQL Server LocalDB (or set `DatabaseProvider=Sqlite` in `MyApp.Api/appsettings.Development.json`)

### 1. Backend

```bash
dotnet restore
dotnet run --project MyApp.Api
```

By default, Swagger is available at `https://localhost:<port>/swagger`.

### 2. Frontend

```bash
cd frontend
cp .env.example .env
# Set VITE_API_URL to your local API URL (e.g. http://localhost:5150)
npm install
npm run dev
```

---

## Git Workflow

This repository uses feature branches, `develop` integration, and semantic commits (`feat:`, `fix:`, `perf:`, `chore:`, `docs:`, `merge:`):

- `main`: production-ready branch (triggers CI/CD)
- `develop`: integration branch
- `feat/*`, `fix/*`, `chore/*`, `docs/*`: isolated feature/fix branches merged with `--no-ff`

---

## Optional: Deploy Backend to Azure App Service (Free F1)

An ARM template for **Azure App Service Free (`F1` Linux + .NET 10 + SQLite)** is provided at [`infra/azuredeploy.json`](infra/azuredeploy.json):

```bash
az login
az group create --name rg-customers-clean-free --location eastus
az deployment group create \
  --resource-group rg-customers-clean-free \
  --template-file infra/azuredeploy.json \
  --parameters webAppName=customers-clean-api-victor
```

Then add `AZURE_WEBAPP_NAME` (variable) and `AZURE_WEBAPP_PUBLISH_PROFILE` (secret) in GitHub Actions settings to enable automatic deployment on push to `main`.
