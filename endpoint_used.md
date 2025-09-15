# Backend Endpoints Used in Frontend

This document lists all backend endpoints being used in the StreamLite React Native frontend, organized by screen/component. This serves as a reference for understanding the frontend-backend integration.

## Service Configuration

### Backend Services
- **Auth Service**: `http://192.168.2.195:8001` - Authentication and user management
- **User Service**: `http://192.168.2.195:8002` - User profiles, preferences, playlists, watch history
- **Video Service**: `http://192.168.2.195:8003` - Video management, categories, comments, upload
- **Streaming Service**: `http://192.168.2.195:8004` - Video streaming, analytics, quality management

---

## Authentication Screens

### LoginScreen.tsx
**Service**: Auth Service (Port 8001)

| Endpoint | Method | Purpose | Request Data | Response Data |
|----------|--------|---------|--------------|---------------|
| `/auth/login` | POST | User login authentication | `{ email, password }` | `{ access_token, refresh_token, user }` |

### RegisterScreen.tsx
**Service**: Auth Service (Port 8001)

| Endpoint | Method | Purpose | Request Data | Response Data |
|----------|--------|---------|--------------|---------------|
| `/auth/register` | POST | User registration | `{ email, password }` | `{ access_token, refresh_token, user }` |

### AuthContext.tsx (Global Authentication)
**Service**: Auth Service (Port 8001)

| Endpoint | Method | Purpose | Request Data | Response Data |
|----------|--------|---------|--------------|---------------|
| `/health` | GET | Service health check | None | `{ status }` |
| `/auth/login` | POST | User login | `{ email, password }` | `{ access_token, refresh_token, user }` |
| `/auth/register` | POST | User registration | `{ email, password }` | `{ access_token, refresh_token, user }` |
| `/auth/validate` | GET | Token validation | Headers: `Authorization: Bearer {token}` | `{ user }` |
| `/auth/refresh` | POST | Token refresh | `{ refresh_token }` | `{ access_token, refresh_token }` |

---

## Home & Discovery Screens

### HomeScreen.tsx
**Services**: Video Service (Port 8003)

| Endpoint | Method | Purpose | Request Data | Response Data |
|----------|--------|---------|--------------|---------------|
| `/api/v1/videos` | GET | Get video feed | Query: `limit=10` | `{ videos[], total, page, limit, pages }` |
| `/api/v1/categories` | GET | Get video categories | None | `Category[]` |

### ExploreScreen.tsx
**Services**: Video Service (Port 8003)

| Endpoint | Method | Purpose | Request Data | Response Data |
|----------|--------|---------|--------------|---------------|
| `/api/v1/videos` | GET | Get videos with filters | Query: `limit=20, category?, search?` | `{ videos[], total, page, limit, pages }` |
| `/api/v1/categories` | GET | Get video categories | None | `Category[]` |

### VideoBrowseScreen.tsx
**Services**: Video Service (Port 8003)

| Endpoint | Method | Purpose | Request Data | Response Data |
|----------|--------|---------|--------------|---------------|
| `/api/v1/categories` | GET | Get video categories | None | `Category[]` |
| `/api/v1/videos` | GET | Get videos with search/filter | Query: `page?, limit?, category?, search?, duration_min?, duration_max?, upload_date_from?, upload_date_to?, view_count_min?, view_count_max?, sort_by?, order?` | `{ videos[], total, page, limit, pages }` |
| `/api/v1/videos/search/suggestions` | GET | Get search suggestions | Query: `q={query}, limit=5` | `{ suggestions[] }` |

---

## Video Management Screens

### VideoPlayerScreen.tsx
**Services**: Video Service (Port 8003), User Service (Port 8002)

| Endpoint | Method | Purpose | Request Data | Response Data |
|----------|--------|---------|--------------|---------------|
| `/api/v1/videos/{id}/comments/count` | GET | Get comment count | None | `{ count }` |
| `/api/v1/videos/{id}` | GET | Get video details | None | `Video` |
| `/api/v1/videos/{id}/comments` | GET | Get video comments | Query: `page=1, limit=20` | `{ comments[], total, page, limit, pages }` |
| `/api/v1/videos/{id}/comments` | POST | Create new comment | `{ content, parent_id? }` | `Comment` |
| `/api/v1/profiles/{userId}` | PUT | Update watch progress | `{ watch_progress_data }` | `Profile` |

### VideoUploadScreen.tsx
**Services**: Video Service (Port 8003)

| Endpoint | Method | Purpose | Request Data | Response Data |
|----------|--------|---------|--------------|---------------|
| `/api/v1/categories` | GET | Get upload categories | None | `Category[]` |
| `/api/v1/videos/upload` | POST | Upload video file | FormData: `{ file, title, description, category_id }` | `Video` |

### TestUploadScreen.tsx
**Services**: Video Service (Port 8003)

| Endpoint | Method | Purpose | Request Data | Response Data |
|----------|--------|---------|--------------|---------------|
| `/api/v1/videos/upload` | POST | Test video upload | FormData: `{ file, title, description, category_id }` | `Video` |

---

## User Profile & Settings Screens

### ProfileScreen.tsx
**Services**: User Service (Port 8002), Video Service (Port 8003)

| Endpoint | Method | Purpose | Request Data | Response Data |
|----------|--------|---------|--------------|---------------|
| `/api/v1/profiles/{userId}` | GET | Get user profile | None | `Profile` |
| `/api/v1/videos` | GET | Get user's videos | Query: `limit=1000` | `{ videos[], total, page, limit, pages }` |
| `/api/v1/profiles/{userId}` | PUT | Update user profile | `{ display_name?, avatar?, bio? }` | `Profile` |

### SettingsScreen.tsx
**Services**: User Service (Port 8002)

| Endpoint | Method | Purpose | Request Data | Response Data |
|----------|--------|---------|--------------|---------------|
| `/api/v1/preferences/{userId}` | GET | Get user preferences | None | `UserPreference[]` |
| `/api/v1/preferences/{userId}` | PUT | Update user preferences | `{ preferences: [{ key, value }] }` | `UserPreference[]` |

---

## Playlist Management Screens

### PlaylistsScreen.tsx
**Services**: User Service (Port 8002)

| Endpoint | Method | Purpose | Request Data | Response Data |
|----------|--------|---------|--------------|---------------|
| `/health` | GET | User service health check | None | `{ status }` |
| `/api/v1/playlists/{userId}` | GET | Get user playlists | Query: `limit=50, page?, limit?` | `{ playlists[], total, page, limit, pages }` |
| `/api/v1/playlists/{userId}` | POST | Create new playlist | `{ name, description, is_public }` | `Playlist` |
| `/api/v1/playlists/update/{playlistId}` | PUT | Update playlist | `{ name?, description?, is_public? }` | `Playlist` |
| `/api/v1/playlists/{playlistId}` | DELETE | Delete playlist | None | None |

### PlaylistDetailScreen.tsx
**Services**: User Service (Port 8002)

| Endpoint | Method | Purpose | Request Data | Response Data |
|----------|--------|---------|--------------|---------------|
| `/api/v1/playlists/{playlistId}/videos` | GET | Get playlist videos | Query: `limit=100, page?, limit?` | `{ playlist: { videos[], ...playlistData } }` |
| `/api/v1/playlists/{playlistId}/videos/{videoId}` | DELETE | Remove video from playlist | None | None |

### AddToPlaylistModal.tsx (Component)
**Services**: User Service (Port 8002)

| Endpoint | Method | Purpose | Request Data | Response Data |
|----------|--------|---------|--------------|---------------|
| `/api/v1/playlists/{userId}` | GET | Get user playlists | Query: `limit=100` | `{ playlists[], total, page, limit, pages }` |
| `/api/v1/playlists/{playlistId}/videos` | GET | Check if video in playlist | Query: `limit=100` | `{ playlist: { videos[] } }` |
| `/api/v1/playlists/{playlistId}/videos` | POST | Add video to playlist | `{ video_id, position? }` | None |
| `/api/v1/playlists/{userId}` | POST | Create new playlist | `{ name, description, is_public }` | `Playlist` |

---

## Streaming & Analytics (Future Implementation)

### StreamingService.ts
**Services**: Video Service (Port 8003), Streaming Service (Port 8004)

| Endpoint | Method | Purpose | Request Data | Response Data |
|----------|--------|---------|--------------|---------------|
| `/api/v1/videos/{videoId}/process-streaming` | POST | Process video for streaming | `{ format?, qualities?, priority? }` | `{ job_id, status, message, estimated_time_minutes }` |
| `/api/v1/videos/{videoId}/streaming-status` | GET | Get streaming status | None | `{ video_id, status, streaming_info?, message }` |
| `/api/v1/streaming/qualities/{videoId}` | GET | Get available qualities | None | `{ video_id, format, qualities[], defaultQuality }` |
| `/api/v1/videos/{videoId}/manifest/{format}` | GET | Get streaming manifest | None | Manifest file |
| `/api/v1/streaming/manifest/{videoId}/{format}` | GET | Get direct manifest | None | Manifest file |
| `/api/v1/analytics/playback` | POST | Record playback event | `{ video_id, user_id?, session_id, event_type, quality?, position?, ... }` | None |
| `/api/v1/analytics/stats/{videoId}` | GET | Get streaming stats | Query: `period=7d` | Analytics data |
| `/api/v1/analytics/bandwidth` | GET | Get bandwidth stats | Query: `period=7d` | Bandwidth data |

---

## Additional Video Service Endpoints (Available but not yet used)

### Video Management
| Endpoint | Method | Purpose | Request Data | Response Data |
|----------|--------|---------|--------------|---------------|
| `/api/v1/videos/{id}` | PUT | Update video metadata | `{ title?, description?, category_id? }` | `Video` |
| `/api/v1/videos/{id}` | DELETE | Delete video | None | None |
| `/api/v1/videos/trending` | GET | Get trending videos | Query: `limit=20, days=7` | `{ videos[] }` |
| `/api/v1/videos/recommendations/{userId}` | GET | Get recommendations | Query: `limit=20` | `{ videos[] }` |

### Category Management
| Endpoint | Method | Purpose | Request Data | Response Data |
|----------|--------|---------|--------------|---------------|
| `/api/v1/categories` | POST | Create category | `{ name, description }` | `Category` |
| `/api/v1/categories/{id}` | PUT | Update category | `{ name?, description? }` | `Category` |
| `/api/v1/categories/{id}` | DELETE | Delete category | None | None |

### Comment Management
| Endpoint | Method | Purpose | Request Data | Response Data |
|----------|--------|---------|--------------|---------------|
| `/api/v1/comments/{id}` | PUT | Update comment | `{ content }` | `Comment` |
| `/api/v1/comments/{id}` | DELETE | Delete comment | None | None |

---

## Additional User Service Endpoints (Available but not yet used)

### User Preferences
| Endpoint | Method | Purpose | Request Data | Response Data |
|----------|--------|---------|--------------|---------------|
| `/api/v1/preferences/{userId}/{key}` | GET | Get specific preference | None | `UserPreference` |
| `/api/v1/preferences/{userId}/{key}` | DELETE | Delete preference | None | None |

### Playlist Advanced Features
| Endpoint | Method | Purpose | Request Data | Response Data |
|----------|--------|---------|--------------|---------------|
| `/api/v1/playlists/{playlistId}/reorder` | PUT | Reorder playlist videos | `{ video_orders: [{ video_id, position }] }` | None |

---

## Summary

### Total Endpoints by Service:
- **Auth Service**: 5 endpoints (authentication, token management)
- **User Service**: 12 endpoints (profiles, preferences, playlists)
- **Video Service**: 20 endpoints (videos, categories, comments, upload)
- **Streaming Service**: 8 endpoints (streaming, analytics)

### Total Endpoints Used: 45 active endpoints
### Total Endpoints Available: 67 endpoints (including unused ones)

### Screens by Endpoint Usage:
1. **VideoPlayerScreen**: 5 endpoints (most complex)
2. **PlaylistsScreen**: 5 endpoints
3. **VideoBrowseScreen**: 3 endpoints
4. **ProfileScreen**: 3 endpoints
5. **AddToPlaylistModal**: 4 endpoints
6. **AuthContext**: 5 endpoints
7. **Other screens**: 1-2 endpoints each

---

## Notes for Future Updates

When adding new frontend-backend integrations:

1. **Update this file** with new endpoints
2. **Group by screen/component** for easy reference
3. **Include request/response data structures**
4. **Note which service and port** the endpoint belongs to
5. **Mark unused endpoints** that become active

This documentation should be updated whenever:
- New screens are added that use backend APIs
- New endpoints are integrated into existing screens
- Backend services are modified or new services are added
- Service URLs or ports change

---

*Last Updated: December 15, 2024*
*Frontend Version: React Native (Expo)*
*Backend Services: Go microservices with SQLite*
