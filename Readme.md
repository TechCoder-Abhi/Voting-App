# Voting App

A full‑stack voting system with a Node.js/Express backend and a Vite + React frontend. Users can register/login, view candidates, and cast one vote each; admins can manage candidates.

## Quicklinks

- Backend entry: [server.js](server.js)
- Frontend app: [frontend](frontend)
- Database config: [db.js](db.js)

## Live demos

- Backend (production): https://voting-platfrom.onrender.com/
- Frontend (production): https://votingplatfrom.vercel.app/

## Features

- User signup & login (Aadhar number as identifier)
- Secure password hashing with `bcrypt`
- JWT-based authentication
- Candidate CRUD for admins
- One vote per user; vote counting and ranking

## Tech Stack

- Node.js + Express
- MongoDB + Mongoose
- Vite + React (frontend)
- JWT (`jsonwebtoken`) and `bcrypt`

## Prerequisites

- Node.js 14+ and npm
- MongoDB (local `mongod` or Atlas)

## Environment

Create a `.env` file in the project root. Minimal variables used by the app:

```
PORT=3000
MONGODB_URL=mongodb://localhost:27017/votingapp
JWT_SECRET=your_jwt_secret_here
VITE_API_BASE_URL=http://localhost:3000  # optional: frontend override
```

Note: The backend reads `.env` at startup using `dotenv`.

## Install & Run (local development)

1. Install root (backend) deps:

```bash
npm install
```

2. Install frontend deps:

```bash
npm --prefix frontend install
```

3. Start MongoDB (if running locally):

```bash
# on Linux/macOS
mongod --dbpath ./data

# or on Windows use the MongoDB Server service or the MongoDB Compass / Atlas connection
```

4. Run backend in development (auto-reloads with nodemon):

```bash
npm run dev
```

5. Run frontend in development (Vite):

```bash
npm run frontend:dev
```

6. Production / build frontend:

```bash
npm run frontend:build
# serve the generated `frontend/dist` with a static server or host on Vercel
```

7. Tests:

```bash
npm test
```

Default servers:

- Backend: `http://localhost:3000`
- Frontend (Vite dev): `http://localhost:5173`

## Verified NPM scripts

From the project root `package.json`:

- `npm start` — run `node server.js` (production)
- `npm run dev` — run `nodemon server.js` (development)
- `npm run frontend:dev` — run the frontend dev server (`npm --prefix frontend run dev`)
- `npm run frontend:build` — build the frontend (`npm --prefix frontend run build`)
- `npm test` — run Node's test runner (`node --test`)

## API overview

Auth:

- POST `/user/signup` — register (no auth)
- POST `/user/login` — login, returns JWT

User:

- GET `/user/profile` — get profile (auth)
- PUT `/user/profile/password` — change password (auth)

Candidates & Voting:

- GET `/candidate` — list candidates
- POST `/candidate` — add candidate (admin)
- PUT `/candidate/:candidateID` — update candidate (admin)
- DELETE `/candidate/:candidateID` — delete candidate (admin)
- POST `/candidate/vote/:candidateID` — vote for candidate (auth)
- GET `/candidate/vote/count` — get vote counts

See the route handlers in [routes](routes) for details.

## Project structure (short)

```
.
├─ frontend/        # Vite + React app
├─ models/          # Mongoose schemas
├─ routes/          # Express route handlers
├─ test/            # Tests (node --test)
├─ server.js        # App bootstrap
├─ app.js           # Express app & middleware
├─ db.js            # DB connection
└─ package.json
```

## Deployment notes

- Frontend can be deployed to Vercel from the `frontend` folder (set `VITE_API_BASE_URL`).
- Backend can be deployed to Render, Heroku, or similar; ensure `MONGODB_URL` and `JWT_SECRET` are configured in environment settings.

## Contributing

- Open an issue or PR with a clear description.
- Run tests before submitting: `npm test`.
