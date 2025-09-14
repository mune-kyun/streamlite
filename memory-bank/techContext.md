# Tech Context - StreamLite

## Technology Stack (DECIDED)

### Frontend - React Native
**Selected: React Native with TypeScript**
- **React Native**: Cross-platform mobile development (iOS/Android)
- **TypeScript**: Type safety and better development experience
- **Navigation**: React Navigation for screen routing
- **State Management**: Context API for user state and video data
- **HTTP Client**: Axios for API calls to microservices
- **Styling**: StyleSheet with responsive design patterns

### Backend - Go Microservices
**Selected: Go with Fiber Framework**
- **Go**: High performance, excellent concurrency for video streaming
- **Fiber**: Express-inspired web framework for Go, fast and lightweight
- **JWT**: Go-JWT library for authentication tokens
- **CORS**: Fiber CORS middleware for React Native communication
- **File Handling**: Go standard library for video upload processing

### Database - SQLite per Service
**Selected: SQLite for each microservice**
- **SQLite**: Lightweight, file-based database per service
- **GORM**: Go ORM for database operations and migrations
- **Database per Service**: Data isolation and service independence
- **Migration Strategy**: GORM auto-migrate for development

### Video Storage & Streaming
**Development**: Local file system storage per service
**Production Options**:
- **Local Storage**: File system with organized directory structure
- **Cloud Storage**: AWS S3 or similar for scalability
- **CDN Integration**: CloudFront for global video delivery

### Development Environment

#### Required Tools
- **Go**: v1.21+ for modern Go features and performance
- **Node.js**: v18+ for React Native development
- **React Native CLI**: For mobile app development
- **Android Studio**: Android development and emulation
- **Xcode**: iOS development (macOS only)
- **Git**: Version control
- **VS Code**: Recommended IDE with Go and React Native extensions
- **Postman/Insomnia**: API testing for microservices

#### Development Setup
```bash
# Project structure
streamlite/
├── mobile/            # React Native application
├── services/          # Go microservices
│   ├── auth-service/      # Authentication service
│   ├── user-service/      # User management service
│   ├── video-service/     # Video upload and metadata
│   └── streaming-service/ # Video streaming and delivery
├── storage/           # Local video storage (dev)
├── docker/            # Docker configurations
└── docs/             # Documentation
```

#### Environment Configuration
- **Development**: Local SQLite databases, file storage, service ports
- **Staging**: Containerized services, shared storage
- **Production**: Orchestrated containers, cloud storage, load balancing

## Technical Constraints

### Performance Requirements
- **Video Loading**: < 3 seconds initial load on mobile
- **Service Response**: < 500ms for API calls
- **App Launch**: < 2 seconds cold start
- **Mobile Performance**: Optimized for 3G/4G networks
- **Streaming**: Adaptive bitrate for varying network conditions

### Security Requirements
- **Authentication**: Bcrypt password hashing in Auth Service
- **Authorization**: JWT token validation across all services
- **File Upload**: Video format validation and size limits
- **API Security**: Rate limiting per service, CORS for React Native
- **Service Communication**: Internal service authentication

### Mobile Platform Support
- **iOS**: iOS 12+ (React Native compatibility)
- **Android**: Android 6.0+ (API level 23+)
- **Video Formats**: MP4 (H.264), HLS for streaming
- **Adaptive Streaming**: Multiple quality levels for bandwidth optimization

## Development Workflow

### Version Control
- **Git Flow**: Feature branches per service, pull requests
- **Commit Convention**: Conventional commits with service prefixes
- **Code Review**: Required for all service changes
- **Monorepo**: Single repository with multiple service directories

### Testing Strategy
- **React Native**: Jest + React Native Testing Library
- **Go Services**: Go testing package + testify for assertions
- **Integration**: Service-to-service API testing
- **E2E**: Detox for React Native end-to-end testing
- **Video Testing**: Manual testing for upload/streaming functionality

### Deployment Pipeline
- **Development**: Local services with hot reload
- **Staging**: Docker Compose for service orchestration
- **Production**: Kubernetes or Docker Swarm for container management

## Tool Usage Patterns

### Package Management
- **React Native**: npm/yarn for React Native dependencies
- **Go Services**: Go modules for dependency management
- **Global Tools**: React Native CLI, Go tools

### Code Quality
- **Go**: gofmt, golint, go vet for code quality
- **React Native**: ESLint with TypeScript rules
- **Formatting**: Prettier for React Native, gofmt for Go
- **Type Checking**: TypeScript for React Native, Go's built-in typing

### Monitoring & Analytics
- **Error Tracking**: Console logging (dev), structured logging (prod)
- **Performance**: React Native performance monitor, Go pprof
- **Analytics**: Custom view tracking in Streaming Service

## Dependencies (Estimated)

### React Native Core
- react-native, @react-native-community packages
- @react-navigation/native, @react-navigation/stack
- typescript, @types packages
- axios for HTTP requests
- react-native-video for video playback

### Go Services Core
- github.com/gofiber/fiber/v2 (web framework)
- github.com/golang-jwt/jwt/v5 (JWT handling)
- gorm.io/gorm, gorm.io/driver/sqlite (database ORM)
- golang.org/x/crypto/bcrypt (password hashing)
- github.com/gofiber/cors/v2 (CORS middleware)

### Development Tools
- air (Go hot reload)
- react-native run-android/ios
- go test, go build
- docker, docker-compose

## Service Port Allocation
- **Auth Service**: :8001
- **User Service**: :8002  
- **Video Service**: :8003
- **Streaming Service**: :8004
- **React Native Metro**: :8081 (default)

## Future Technology Considerations
- **Video Processing**: FFmpeg integration for format conversion and thumbnails
- **CDN**: CloudFront or similar for global video delivery
- **Service Mesh**: Istio for advanced service communication
- **Real-time**: WebSocket integration for live features
- **Caching**: Redis for cross-service caching layer
- **Message Queue**: RabbitMQ or Apache Kafka for event-driven patterns
