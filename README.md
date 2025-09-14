# StreamLite - Video Streaming Platform

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   React Native  │    │   Auth Service   │    │   User Service   │
│   Mobile App    │◄──►│   (Port 8001)    │◄──►│   (Port 8002)    │
│  (Port 8082)    │    │                  │    │                  │
└─────────────────┘    └──────────────────┘    └──────────────────┘
                              │                          │
                       ┌──────▼──────┐          ┌──────▼──────┐
                       │   auth.db   │          │   user.db   │
                       │  (SQLite)   │          │  (SQLite)   │
                       └─────────────┘          └─────────────┘
```

**Services:**
- **Auth Service**: User authentication, registration, JWT tokens
- **User Service**: User profiles, watch history, preferences  
- **React Native**: Cross-platform mobile app (iOS/Android/Web)

## 🚀 How to Run

### Prerequisites
- Go 1.21+
- Node.js 18+
- Expo CLI: `npm install -g @expo/cli`

### Start Services (3 terminals)

#### Terminal 1: Auth Service
```bash
cd services/auth-service
go run main.go
```
✅ Running on http://localhost:8001

#### Terminal 2: User Service  
```bash
cd services/user-service
go run main.go
```
✅ Running on http://localhost:8002

#### Terminal 3: React Native App
```bash
cd mobile/StreamLiteMobile
npm install
npm start
```
✅ Running on http://localhost:8082

### Access the App
- **Web**: http://localhost:8082
- **Mobile**: Scan QR code with Expo Go app
- **API Docs**: 
  - Auth: http://localhost:8001/swagger/index.html
  - User: http://localhost:8002/swagger/index.html

### Health Check
```bash
curl http://localhost:8001/health  # Auth Service
curl http://localhost:8002/health  # User Service
```

That's it! Register a new user and test the complete authentication and profile management flow.
