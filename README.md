# Cloud-based City Bus Tracking and Seat Booking System using Docker Containers and AWS Cloud

Full-stack project with React frontend, Node.js/Express backend, PostgreSQL database, dataset-driven route/schedule master data, real-time seat booking updates, admin controls, and live bus tracking simulation.

## Architecture

- `frontend`: React + Vite premium-style booking UI (mobile responsive, card layouts, sticky search, booking flow).
- `backend`: Express REST APIs for auth, search, seat booking, cancellation, admin dataset/tracking operations.
- `backend/db/schema.sql`: relational schema for users, routes, buses, seats, bookings, payments, live tracking.
- `backend/data/dataset.csv`: uploaded dataset used as source-of-truth for schedule/route masters.
- `docker-compose.yml`: frontend, backend, postgres container orchestration.

## Dataset Handling

- Uploaded dataset file is copied to `backend/data/dataset.csv`.
- Ingestion service auto-detects CSV/XLSX/XLS/JSON using `xlsx` parsing.
- Dataset columns mapped:
  - `Route No` -> `routes.route_no`
  - `Source` -> `routes.source`
  - `Destination` -> `routes.destination`
  - `Major Boarding Point` -> `boarding_points`
  - `Major Drop Point` -> `dropping_points`
  - `First Bus`, `Last Bus`, `Frequency` -> route schedule metadata
- Missing fields are stored as `NULL`/empty and shown as `N/A` in UI gracefully.
- Static route master data is separate from dynamic booking and seat inventory data.

## Main Features

- Customer authentication (JWT signup/login)
- Bus search from dataset-backed routes
- Bus details with boarding and dropping points
- Seat selection map with available/selected/booked/female-reserved colors
- Booking flow: search -> details -> seats -> boarding/dropping -> passenger -> confirmation
- Transaction-safe seat booking with DB locks and conflict checks (prevents overbooking)
- Cancellation with immediate seat release
- My bookings page
- Admin: dataset reload/upload, live location updates
- Live bus tracking API + frontend tracker

## API Overview

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/buses/search?source=&destination=`
- `GET /api/buses/:busId`
- `GET /api/routes/:routeId/points`
- `GET /api/buses/:busId/seats?date=YYYY-MM-DD`
- `POST /api/bookings` (auth)
- `POST /api/bookings/:bookingId/cancel` (auth)
- `GET /api/bookings/me` (auth)
- `GET /api/tracking/:busId`
- `PUT /api/admin/tracking/:busId` (admin auth)
- `POST /api/admin/dataset/upload` (admin auth, multipart file)
- `POST /api/admin/dataset/reload` (admin auth)

## Local Run (without Docker)

### Backend

1. `cd backend`
2. `npm install`
3. Copy `.env.example` to `.env`
4. Ensure PostgreSQL is running and `db/schema.sql` is applied
5. `npm run seed`
6. `npm run dev`

### Frontend

1. `cd frontend`
2. `npm install`
3. Copy `.env.example` to `.env`
4. `npm run dev`

## Docker Run

From project root:

1. `docker compose up --build`
2. Frontend: `http://localhost:5173`
3. Backend: `http://localhost:5000/api/health`

## AWS Free-Tier Deployment Guidance

- **Compute**: EC2 t2.micro/t3.micro for Dockerized frontend + backend.
- **Database**: RDS PostgreSQL free-tier (or PostgreSQL on EC2 for strict free budget).
- **Storage**: S3 for dataset backups, booking exports, static files.
- **Networking**:
  - Security Groups: allow 80/443 for app, 5432 restricted to app SG.
  - Optional ALB + ACM for HTTPS.
- **Optional CDN**: CloudFront in front of static frontend.
- **Environment**:
  - Store secrets in `.env` on EC2 (or AWS Systems Manager Parameter Store).
  - Set `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `DATASET_PATH`.

## Notes for Academic Viva

- Clearly show static vs dynamic data split:
  - Static dataset -> routes/schedule masters.
  - Dynamic DB -> seat inventory, bookings, payments, live location.
- Demonstrate overbooking prevention via DB transaction + row lock in `POST /api/bookings`.
- Demonstrate cancellation seat release in `POST /api/bookings/:bookingId/cancel`.
- Demonstrate containerized architecture and cloud deployment path.
