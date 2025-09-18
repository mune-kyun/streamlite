package main

import (
	"log"
	"video-service/database"
	"video-service/handlers"
	"video-service/middleware"

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
	
	// Public routes (no authentication required)
	videos.Get("/", middleware.OptionalJWTMiddleware(), handlers.GetVideos)
	videos.Get("/search/suggestions", handlers.GetSearchSuggestions)
	videos.Get("/trending", handlers.GetTrendingVideos)
	videos.Get("/recommendations/:user_id", handlers.GetRecommendations)
	videos.Get("/:id", middleware.OptionalJWTMiddleware(), handlers.GetVideo)
	videos.Get("/:id/stream", handlers.StreamVideo)
	videos.Get("/:id/thumbnail/:size", handlers.GetThumbnail)
	videos.Get("/:id/streaming-status", handlers.GetStreamingStatus)
	videos.Get("/:id/manifest/:format", handlers.GetStreamingManifest)
	videos.Get("/:id/comments", middleware.OptionalJWTMiddleware(), handlers.GetComments)
	videos.Get("/:id/comments/count", handlers.GetCommentCount)
	videos.Get("/:id/likes", middleware.OptionalJWTMiddleware(), handlers.GetVideoLikeStats)

	// Protected routes (authentication required)
	videos.Post("/upload", middleware.JWTMiddleware(), handlers.UploadVideo)
	videos.Put("/:id", middleware.JWTMiddleware(), handlers.UpdateVideo)
	videos.Delete("/:id", middleware.JWTMiddleware(), handlers.DeleteVideo)
	videos.Post("/:id/process-streaming", middleware.JWTMiddleware(), handlers.ProcessVideoForStreaming)
	videos.Post("/:id/like", middleware.JWTMiddleware(), handlers.LikeVideo)
	videos.Delete("/:id/like", middleware.JWTMiddleware(), handlers.RemoveLike)
	videos.Post("/:id/comments", middleware.JWTMiddleware(), handlers.CreateComment)

	// Comment management routes (authentication required)
	comments := api.Group("/comments")
	comments.Put("/:id", middleware.JWTMiddleware(), handlers.UpdateComment)
	comments.Delete("/:id", middleware.JWTMiddleware(), handlers.DeleteComment)

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
