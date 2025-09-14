package main

import (
	"log"
	"os"

	"auth-service/database"
	"auth-service/handlers"
	"auth-service/middleware"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	fiberSwagger "github.com/swaggo/fiber-swagger"

	_ "auth-service/docs" // Import generated docs
)

// @title StreamLite Auth Service API
// @version 1.0
// @description Authentication service for StreamLite video streaming platform
// @termsOfService http://swagger.io/terms/

// @contact.name API Support
// @contact.url http://www.streamlite.com/support
// @contact.email support@streamlite.com

// @license.name MIT
// @license.url https://opensource.org/licenses/MIT

// @host localhost:8001
// @BasePath /
// @schemes http

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Type "Bearer" followed by a space and JWT token.

func main() {
	// Initialize Fiber app
	app := fiber.New(fiber.Config{
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			return c.Status(code).JSON(fiber.Map{
				"error": err.Error(),
			})
		},
	})

	// Middleware
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins:     "http://localhost:8081,http://localhost:8082", // React Native Metro + Expo Web
		AllowMethods:     "GET,POST,PUT,DELETE,OPTIONS",
		AllowHeaders:     "Origin,Content-Type,Accept,Authorization",
		AllowCredentials: true,
	}))

	// Initialize database
	database.Connect()

	// Swagger documentation
	app.Get("/swagger/*", fiberSwagger.WrapHandler)

	// Health check endpoint
	app.Get("/health", handlers.HealthCheck)

	// Auth routes
	auth := app.Group("/auth")
	auth.Post("/register", handlers.Register)
	auth.Post("/login", handlers.Login)
	auth.Get("/validate", middleware.RequireAuth, handlers.ValidateToken)
	auth.Post("/refresh", handlers.RefreshToken)

	// Get port from environment or default to 8001
	port := os.Getenv("PORT")
	if port == "" {
		port = "8001"
	}

	log.Printf("Auth Service starting on port %s", port)
	log.Fatal(app.Listen("0.0.0.0:" + port))
}
