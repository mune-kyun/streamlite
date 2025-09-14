# User Service

User profile management and watch history service for StreamLite video streaming platform.

## Overview

The User Service handles:
- User profile management (display name, avatar, bio)
- Video watch history tracking
- User preferences and settings

## Features

### User Profiles
- Create and update user profiles
- Store display name, avatar URL, and bio
- Automatic profile creation on first update

### Watch History
- Track video viewing progress
- Store watch duration and completion status
- Automatic completion detection (90% threshold)
- Pagination support for history retrieval

### User Preferences
- Key-value preference storage
- Bulk preference updates
- Common settings like theme, language, etc.

## API Endpoints

### Health Check
- `GET /health` - Service health status

### User Profiles
- `GET /api/v1/profiles/{userId}` - Get user profile
- `PUT /api/v1/profiles/{userId}` - Create/update user profile

### Watch History
- `GET /api/v1/history/{userId}` - Get user watch history (with pagination)
- `POST /api/v1/history` - Add/update watch history entry
- `PUT /api/v1/history/{historyId}` - Update specific history entry
- `DELETE /api/v1/history/{historyId}` - Delete history entry

### User Preferences
- `GET /api/v1/preferences/{userId}` - Get user preferences
- `PUT /api/v1/preferences/{userId}` - Update user preferences

## Database Schema

### Profiles Table
- `id` - Primary key
- `user_id` - Foreign key to auth service user
- `display_name` - User's display name
- `avatar` - Avatar image URL
- `bio` - User biography
- `created_at`, `updated_at` - Timestamps

### Watch History Table
- `id` - Primary key
- `user_id` - Foreign key to auth service user
- `video_id` - Video identifier
- `progress` - Watch progress in seconds
- `duration` - Total video duration
- `completed` - Boolean completion status
- `watched_at` - Last watch timestamp
- `created_at`, `updated_at` - Timestamps

### User Preferences Table
- `id` - Primary key
- `user_id` - Foreign key to auth service user
- `key` - Preference key
- `value` - Preference value
- `created_at`, `updated_at` - Timestamps

## Configuration

- **Port**: 8002
- **Database**: SQLite (`user.db`)
- **CORS**: Configured for React Native (ports 8081, 8082, 3000)

## Dependencies

- Go 1.21+
- Fiber v2 (web framework)
- GORM (ORM)
- modernc.org/sqlite (pure Go SQLite driver)
- Swagger (API documentation)

## Running the Service

```bash
# Build the service
go build

# Run the service
./user-service.exe

# Or run directly
go run main.go
```

## API Documentation

Swagger documentation available at: http://localhost:8002/swagger/index.html

## Example Usage

### Create User Profile
```bash
curl -X PUT http://localhost:8002/api/v1/profiles/1 \
  -H "Content-Type: application/json" \
  -d '{"display_name":"John Doe","bio":"Video enthusiast"}'
```

### Add Watch History
```bash
curl -X POST http://localhost:8002/api/v1/history \
  -H "Content-Type: application/json" \
  -d '{"user_id":1,"video_id":101,"progress":120.5,"duration":300}'
```

### Update Preferences
```bash
curl -X PUT http://localhost:8002/api/v1/preferences/1 \
  -H "Content-Type: application/json" \
  -d '{"preferences":[{"key":"theme","value":"dark"}]}'
```

## Integration

This service integrates with:
- **Auth Service** (port 8001) - For user authentication
- **React Native App** - For mobile frontend
- **Future Video Service** - For video metadata

## Development

- Hot reload with `air` (if installed)
- Database auto-migration on startup
- Comprehensive error handling
- Request logging middleware
- CORS configured for development
