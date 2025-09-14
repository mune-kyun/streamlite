# Video Service

Video upload and metadata management service for StreamLite platform.

## Features

- Video file upload with metadata
- Video categorization and management
- File validation and storage
- Paginated video listing with search and filtering
- Category management (CRUD operations)
- View count tracking
- Swagger API documentation

## API Endpoints

### Videos
- `POST /api/v1/videos/upload` - Upload video file with metadata
- `GET /api/v1/videos` - Get paginated list of videos (with search/filter)
- `GET /api/v1/videos/:id` - Get specific video details
- `PUT /api/v1/videos/:id` - Update video metadata (admin)
- `DELETE /api/v1/videos/:id` - Delete video and file (admin)

### Categories
- `GET /api/v1/categories` - Get all categories
- `POST /api/v1/categories` - Create new category (admin)
- `PUT /api/v1/categories/:id` - Update category (admin)
- `DELETE /api/v1/categories/:id` - Delete category (admin)

### System
- `GET /health` - Health check endpoint
- `GET /swagger/*` - Swagger API documentation

## Database Schema

### Videos Table
- `id` - Primary key
- `title` - Video title (required)
- `description` - Video description
- `file_path` - Path to video file
- `thumbnail_path` - Path to thumbnail image
- `duration` - Video duration in seconds
- `file_size` - File size in bytes
- `format` - Video format (mp4, avi, etc.)
- `category_id` - Foreign key to categories
- `uploaded_by` - User ID who uploaded the video
- `view_count` - Number of views
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

### Categories Table
- `id` - Primary key
- `name` - Category name (unique)
- `description` - Category description
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

### Video Metadata Table
- `id` - Primary key
- `video_id` - Foreign key to videos
- `resolution` - Video resolution (e.g., "1920x1080")
- `bitrate` - Video bitrate in kbps
- `codec` - Video codec (e.g., "h264")
- `file_path` - Path to processed file
- `created_at` - Creation timestamp

## File Storage

Videos are stored in the `storage/videos/` directory with the following structure:
```
storage/
├── videos/
│   ├── {timestamp}_{title}.{ext}
│   └── ...
```

## Supported Video Formats

- MP4 (.mp4)
- AVI (.avi)
- MOV (.mov)
- MKV (.mkv)
- WebM (.webm)
- FLV (.flv)
- WMV (.wmv)

## Configuration

- **Port**: 8003
- **Database**: SQLite (`video.db`)
- **Max Upload Size**: 100MB
- **CORS**: Enabled for React Native (ports 8081, 8082, 3000)

## Default Categories

The service automatically creates these default categories:
1. Entertainment
2. Education
3. Music
4. Sports
5. Technology
6. Gaming
7. News
8. Documentary

## Running the Service

```bash
# Install dependencies
go mod tidy

# Run the service
go run main.go

# The service will start on http://localhost:8003
```

## API Documentation

Once the service is running, visit:
- Swagger UI: http://localhost:8003/swagger/index.html
- Health Check: http://localhost:8003/health

## Testing

```bash
# Test health endpoint
curl http://localhost:8003/health

# Get categories
curl http://localhost:8003/api/v1/categories

# Get videos (empty initially)
curl http://localhost:8003/api/v1/videos

# Upload video (requires multipart form data)
curl -X POST http://localhost:8003/api/v1/videos/upload \
  -F "file=@video.mp4" \
  -F "title=Test Video" \
  -F "description=A test video" \
  -F "category_id=1"
```

## Integration

This service integrates with:
- **Auth Service** (port 8001) - For user authentication
- **User Service** (port 8002) - For user data
- **React Native App** (port 8081/8082) - For frontend interface

## Future Enhancements

- JWT authentication middleware
- Thumbnail generation
- Video transcoding
- Cloud storage integration
- Advanced search capabilities
- Video analytics and reporting
