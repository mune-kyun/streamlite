# System Patterns - StreamLite

## System Architecture Overview

### High-Level Architecture - Microservices
```
React Native App
       ↓
┌─────────────────────────────────────────┐
│  Direct Service Communication Pattern   │
├─────────────────────────────────────────┤
│  🔐 Auth Service    👤 User Service     │
│  🎬 Video Service                       │
└─────────────────────────────────────────┘
       ↓
   SQLite Databases
```

### Core Microservices
1. **🔐 Auth Service**: User authentication, JWT generation, OAuth integration
2. **👤 User Service**: Profile management, watch history, user data
3. **🎬 Video Service**: Upload handling, metadata storage, thumbnail generation, video streaming
4. **React Native App**: Mobile-first frontend with direct service communication

## Key Design Patterns

### 1. Microservices Communication Pattern
- **Direct Service Calls**: No API Gateway, services communicate directly
- **Service Discovery**: Each service knows other service endpoints
- **Independent Authentication**: Each service validates JWT tokens with Auth Service
- **Decentralized Rate Limiting**: Each service handles its own rate limiting

### 2. Authentication Pattern (Auth Service)
- **JWT-based authentication** for stateless sessions across services
- **Centralized token generation** and validation
- **Role-based access control** (User, Admin) enforced per service
- **OAuth integration** for social login options

### 3. Video Management Pattern (Video Service)
- **Unified video handling**: Video Service handles upload, metadata, storage, and streaming
- **Metadata management**: Video Service handles file info, thumbnails, categories
- **Direct streaming**: Video Service provides direct video streaming capabilities
- **Upload pipeline**: Validation → Processing → Storage → Metadata → Ready for streaming

### 4. User Data Pattern (User Service)
- **Profile centralization**: All user data managed by User Service
- **Watch history tracking**: Integration with Video Service for analytics
- **Cross-service user context**: User Service provides user data to other services

### 5. Data Flow Patterns

#### User Authentication Flow
```
React Native → Auth Service → JWT Token
Other Services → Auth Service (token validation) → Authorized Response
```

#### Video Upload Flow
```
React Native → Video Service → File Processing → Metadata Storage → Ready for streaming
```

#### Video Playback Flow
```
React Native → Video Service → Auth validation → Video streaming
Video Service → User Service (update watch history)
```

## Service Relationships

### React Native App Structure
- **Authentication Screens**: Login, Register, Profile
- **Video Screens**: Home, Player, Upload, Search
- **Navigation**: Tab-based navigation with protected routes
- **State Management**: Context API for user state and video data
- **API Layer**: Direct HTTP calls to each microservice

### Microservice Dependencies
```
Auth Service (Independent)
    ↑
User Service → Auth Service (token validation)
    ↑
Video Service → Auth Service (authorization)
```

### Database Schema per Service

#### Auth Service (SQLite)
- **users**: id, email, password_hash, role, created_at
- **refresh_tokens**: token, user_id, expires_at

#### User Service (SQLite)
- **profiles**: user_id, display_name, avatar, preferences
- **watch_history**: user_id, video_id, watched_at, progress

#### Video Service (SQLite)
- **videos**: id, title, description, file_path, thumbnail, category_id
- **categories**: id, name, description


## Critical Implementation Paths

### 1. Auth Service Foundation
- Implement JWT generation and validation first
- Create user registration and login endpoints
- Set up role-based access control (User/Admin)
- Establish service-to-service authentication pattern

### 2. Service Communication Setup
- Define service endpoints and port allocation
- Implement health check endpoints for each service
- Set up CORS configuration for React Native
- Create shared authentication middleware pattern

### 3. Video Pipeline (Video Service)
- Video Service: Upload, validation, metadata storage, and streaming
- Direct video streaming from Video Service
- Unified video flow for seamless experience
- Performance optimization for mobile streaming

### 4. User Experience (User Service + React Native)
- User Service: Profile management, watch history
- React Native: Navigation, state management, API integration
- Cross-service data flow for personalized experience

### 5. Development Workflow
- Docker containers for each service
- Local development environment setup
- Service orchestration for testing
- Database migration strategies per service

## Scalability Considerations
- **Independent service scaling** based on load patterns
- **Database per service** for data isolation
- **Horizontal scaling** for high-traffic services (Video)
- **Service mesh readiness** for advanced networking
- **Event-driven patterns** for future real-time features
