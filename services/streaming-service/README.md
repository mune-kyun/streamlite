# StreamLite Streaming Service

Advanced video streaming service with adaptive bitrate streaming support for HLS and DASH formats.

## Features

- **Adaptive Streaming**: HLS and DASH support with multiple quality variants
- **Quality Variants**: 480p, 720p, 1080p with optimized bitrates
- **FFmpeg Integration**: Professional video transcoding pipeline
- **Streaming Analytics**: Comprehensive playback and bandwidth monitoring
- **Mobile Optimization**: Optimized for mobile networks and devices
- **RESTful API**: Complete API for streaming management

## Prerequisites

- Go 1.21+
- FFmpeg (required for video transcoding)
- SQLite (for database)

## Installation

### Install FFmpeg

**Windows:**
```bash
# Using Chocolatey
choco install ffmpeg

# Or download from https://ffmpeg.org/download.html
```

**macOS:**
```bash
brew install ffmpeg
```

**Linux:**
```bash
sudo apt update
sudo apt install ffmpeg
```

### Install Dependencies

```bash
cd services/streaming-service
go mod tidy
```

## Usage

### Start the Service

```bash
go run main.go
```

The service will start on port 8084.

### API Endpoints

#### Streaming Management
- `POST /api/v1/streaming/process` - Start video processing
- `GET /api/v1/streaming/status/{job_id}` - Get processing status
- `GET /api/v1/streaming/manifest/{video_id}/{format}` - Get streaming manifest
- `GET /api/v1/streaming/segment/{video_id}/{quality}/{segment}` - Get video segment
- `GET /api/v1/streaming/qualities/{video_id}` - Get available qualities

#### Analytics
- `POST /api/v1/analytics/playback` - Record playback event
- `GET /api/v1/analytics/stats/{video_id}` - Get streaming statistics
- `GET /api/v1/analytics/bandwidth` - Get bandwidth statistics

### Process a Video

```bash
curl -X POST http://localhost:8084/api/v1/streaming/process \
  -H "Content-Type: application/json" \
  -d '{
    "video_id": 1,
    "input_path": "storage/videos/video.mp4",
    "format": "hls",
    "qualities": ["480p", "720p", "1080p"],
    "priority": 5
  }'
```

### Check Processing Status

```bash
curl http://localhost:8084/api/v1/streaming/status/1
```

### Get Available Qualities

```bash
curl http://localhost:8084/api/v1/streaming/qualities/1
```

## Quality Presets

| Quality | Resolution | Bitrate | Max Rate | Buffer Size |
|---------|------------|---------|----------|-------------|
| 480p    | 854x480    | 1000k   | 1100k    | 1500k       |
| 720p    | 1280x720   | 2500k   | 2750k    | 3750k       |
| 1080p   | 1920x1080  | 5000k   | 5500k    | 7500k       |

## File Structure

```
streaming-service/
├── main.go                 # Service entry point
├── go.mod                  # Go module definition
├── models/
│   └── streaming.go        # Data models
├── database/
│   └── database.go         # Database configuration
├── handlers/
│   ├── streaming.go        # Streaming endpoints
│   └── analytics.go        # Analytics endpoints
├── utils/
│   └── ffmpeg.go          # FFmpeg utilities
├── docs/
│   └── docs.go            # Swagger documentation
└── storage/
    └── streaming/         # Processed video storage
```

## Integration with Video Service

The streaming service integrates with the main video service:

1. **Video Upload**: Main video service uploads videos
2. **Processing Trigger**: Video service calls streaming service to process videos
3. **Status Monitoring**: Video service monitors processing status
4. **Playback**: Mobile app uses streaming endpoints for adaptive playback

## Monitoring

### Health Check

```bash
curl http://localhost:8084/health
```

### Swagger Documentation

Visit `http://localhost:8084/swagger/` for interactive API documentation.

## Performance

- **Transcoding Speed**: ~3x real-time for multi-quality processing
- **Segment Size**: 6-second segments for optimal streaming
- **Cache Headers**: Optimized caching for manifests and segments
- **Bandwidth Detection**: Automatic quality switching based on network conditions

## Troubleshooting

### FFmpeg Not Found
```
Error: FFmpeg not found. Please install FFmpeg
```
Install FFmpeg using the instructions above.

### Processing Failed
Check the job status for detailed error messages:
```bash
curl http://localhost:8084/api/v1/streaming/status/{job_id}
```

### Storage Issues
Ensure the `storage/streaming/` directory has write permissions.

## Development

### Run Tests
```bash
go test ./...
```

### Generate Swagger Docs
```bash
swag init
```

### Build for Production
```bash
go build -o streaming-service main.go
