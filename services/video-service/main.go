package main

import (
	"log"
	"video-service/database"
	"video-service/handlers"

	_ "video-service/docs"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	fiberSwagger "github.com/swaggo/fiber-swagger"
)

// @title Video Service API
// @version 1.0
// @description Video upload and metadata management service for StreamLite
// @host localhost:8003
// @BasePath /
func main() {
	// Initialize database
	database.Connect()

	// Create Fiber app
	app := fiber.New(fiber.Config{
		BodyLimit: 100 * 1024 * 1024, // 100MB for video uploads
	})

	// Middleware
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins:     "http://localhost:8081,http://localhost:8082,http://localhost:3000",
		AllowMethods:     "GET,POST,PUT,DELETE,OPTIONS",
		AllowHeaders:     "Origin,Content-Type,Accept,Authorization",
		AllowCredentials: true,
	}))

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":  "ok",
			"service": "video-service",
			"port":    "8003",
		})
	})

	// Swagger documentation
	app.Get("/swagger/*", fiberSwagger.WrapHandler)

	// API routes
	api := app.Group("/api/v1")
	
	// Video routes
	videos := api.Group("/videos")
	videos.Post("/upload", handlers.UploadVideo)
	videos.Get("/", handlers.GetVideos)
	videos.Get("/search/suggestions", handlers.GetSearchSuggestions)
	videos.Get("/trending", handlers.GetTrendingVideos)
	videos.Get("/recommendations/:user_id", handlers.GetRecommendations)
	videos.Get("/:id", handlers.GetVideo)
	videos.Get("/:id/stream", handlers.StreamVideo)
	videos.Get("/:id/thumbnail/:size", handlers.GetThumbnail)
	videos.Put("/:id", handlers.UpdateVideo)
	videos.Delete("/:id", handlers.DeleteVideo)
	videos.Post("/:id/process-streaming", handlers.ProcessVideoForStreaming)
	videos.Get("/:id/streaming-status", handlers.GetStreamingStatus)
	videos.Get("/:id/manifest/:format", handlers.GetStreamingManifest)

	// Comment routes for videos
	videos.Post("/:id/comments", handlers.CreateComment)
	videos.Get("/:id/comments", handlers.GetComments)
	videos.Get("/:id/comments/count", handlers.GetCommentCount)

	// Comment management routes
	comments := api.Group("/comments")
	comments.Put("/:id", handlers.UpdateComment)
	comments.Delete("/:id", handlers.DeleteComment)

	// Category routes
	categories := api.Group("/categories")
	categories.Get("/", handlers.GetCategories)
	categories.Post("/", handlers.CreateCategory)
	categories.Put("/:id", handlers.UpdateCategory)
	categories.Delete("/:id", handlers.DeleteCategory)

	// Start server
	log.Println("Video Service starting on port 8003...")
	log.Fatal(app.Listen("0.0.0.0:8003"))
}
