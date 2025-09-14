# Auth Service - StreamLite

## Overview
The Auth Service handles user authentication for the StreamLite video streaming platform. It provides JWT-based authentication with registration, login, token validation, and refresh token functionality.

## Features
- User registration with email/password
- User login with JWT token generation
- Token validation for other services
- Refresh token support
- Pure Go implementation (no CGO required)
- SQLite database with GORM

## API Endpoints

### Health Check
- **GET** `/health` - Service health status

### Authentication
- **POST** `/auth/register` - Register new user
- **POST** `/auth/login` - User login
- **GET** `/auth/validate` - Validate JWT token (requires Authorization header)
- **POST** `/auth/refresh` - Refresh access token

## Running the Service

```bash
# Install dependencies
go mod tidy

# Run the service
go run main.go

# Or build and run
go build -o auth-service.exe main.go
auth-service.exe
```

The service runs on port 8001 by default.

## Environment Variables
- `PORT` - Service port (default: 8001)
- `JWT_SECRET` - JWT signing secret (default: development key)

## Database
Uses SQLite with pure Go driver (modernc.org/sqlite) - no C compiler required.
Database file: `auth.db` (created automatically)

## Testing

```bash
# Health check
curl http://localhost:8001/health

# Register user
curl -X POST http://localhost:8001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:8001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Validate token
curl -X GET http://localhost:8001/auth/validate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Project Structure
```
auth-service/
├── main.go              # Entry point
├── models/
│   └── user.go          # User and RefreshToken models
├── handlers/
│   └── auth.go          # HTTP handlers
├── middleware/
│   └── auth.go          # JWT middleware
├── database/
│   └── database.go      # Database connection
├── utils/
│   └── auth.go          # JWT and password utilities
└── README.md
