# Voting Application

A backend voting system API built with Node.js, Express, and MongoDB. Users can authenticate and vote for candidates while admins manage the candidate list.

## Features

✅ User authentication (signup/login) with 12-digit Aadhar Card Number  
✅ Secure password hashing with bcrypt  
✅ JWT-based authorization  
✅ View list of all candidates  
✅ Vote for candidates (one vote per user)  
✅ Admin functionality: add/update/delete candidates  
✅ Admins cannot vote  
✅ Vote counting and ranking  

## Technologies Used

- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB ORM
- **JWT (jsonwebtoken)** - Authentication
- **bcrypt** - Password hashing

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/voting_app.git
   cd voting_app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Create a `.env` file in the root directory:
   ```env
   PORT=3000
   MONGODB_URL_LOCAL=mongodb://localhost:27017/votingapp
   MONGODB_URL=your_mongodb_atlas_connection_string
   JWT_SECRET=your_secret_jwt_key_here
   ```

4. **Ensure MongoDB is running:**
   - For local MongoDB: `mongod`
   - For MongoDB Atlas: Add connection string to `.env`

5. **Start the server:**
   ```bash
   npm start          # Production mode
   npm run dev        # Development mode (with auto-reload)
   npm test           # Run automated tests
   ```

   Server runs on `http://localhost:3000`

## Project Structure

```
voting_app/
├── models/
│   ├── user.js           # User schema with password hashing
│   └── candidates.js     # Candidate schema with votes tracking
├── routes/
│   ├── userRoutes.js     # User auth & profile endpoints
│   └── candidateRoutes.js # Candidate CRUD & voting endpoints
├── test/
│   └── app.test.js       # API smoke test
├── app.js                # Express app instance (routes + middleware)
├── jwt.js                # JWT middleware & token generation
├── db.js                 # MongoDB connection
├── server.js             # Startup entrypoint
├── package.json          # Dependencies
├── .env                  # Environment variables (create locally)
└── README.md             # This file
```

## API Endpoints

### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/user/signup` | Register a new user | ❌ |
| POST | `/user/login` | Login & get JWT token | ❌ |

### User Profile

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/user/profile` | Get logged-in user's profile | ✅ |
| PUT | `/user/profile/password` | Change password | ✅ |

### Candidates

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/candidate` | List all candidates | ❌ | - |
| POST | `/candidate` | Add new candidate | ✅ | Admin |
| PUT | `/candidate/:candidateID` | Update candidate | ✅ | Admin |
| DELETE | `/candidate/:candidateID` | Delete candidate | ✅ | Admin |

### Voting

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| POST | `/candidate/vote/:candidateID` | Vote for candidate | ✅ | Voter |
| GET | `/candidate/vote/count` | Get vote counts (sorted) | ❌ | - |

## User Roles

- **Admin**: Can create, update, and delete candidates. Cannot vote.
- **Voter**: Can view candidates and vote once.

## Example Requests

### Sign Up
```bash
POST /user/signup
Content-Type: application/json

{
  "name": "John Doe",
  "age": 25,
  "email": "john@example.com",
  "mobile": "9999999999",
  "address": "123 Main St",
   "aadharCardNumber": "123456789012",
  "password": "password123",
  "role": "voter"
}
```

### Login
```bash
POST /user/login
Content-Type: application/json

{
   "aadharCardNumber": "123456789012",
  "password": "password123"
}
```

### Vote for Candidate
```bash
POST /candidate/vote/650f1bc2a1b2c3d4e5f6g7h8
Authorization: Bearer YOUR_JWT_TOKEN
```

## Validation Rules

- **Aadhar Card Number**: Must be exactly 12 digits and is stored as a string
- **Password**: Hashed with bcrypt (salt rounds: 10)
- **Vote**: Each user can vote only once
- **Admin**: Only one admin user can exist

## Version

**v1.0.0** - Initial release