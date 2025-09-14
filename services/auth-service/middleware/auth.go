package middleware

import (
	"strings"

	"auth-service/utils"

	"github.com/gofiber/fiber/v2"
)

// RequireAuth middleware validates JWT tokens
func RequireAuth(c *fiber.Ctx) error {
	// Get the Authorization header
	authHeader := c.Get("Authorization")
	if authHeader == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Authorization header required",
		})
	}

	// Check if it starts with "Bearer "
	if !strings.HasPrefix(authHeader, "Bearer ") {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid authorization format. Use 'Bearer <token>'",
		})
	}

	// Extract the token
	tokenString := strings.TrimPrefix(authHeader, "Bearer ")
	if tokenString == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Token required",
		})
	}

	// Validate the token
	claims, err := utils.ValidateJWT(tokenString)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid or expired token",
		})
	}

	// Store user information in context for use in handlers
	c.Locals("userID", claims.UserID)
	c.Locals("userEmail", claims.Email)
	c.Locals("userRole", claims.Role)

	return c.Next()
}

// RequireAdmin middleware ensures the user has admin role
func RequireAdmin(c *fiber.Ctx) error {
	userRole := c.Locals("userRole")
	if userRole != "admin" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Admin access required",
		})
	}
	return c.Next()
}

// OptionalAuth middleware validates JWT tokens but doesn't require them
func OptionalAuth(c *fiber.Ctx) error {
	authHeader := c.Get("Authorization")
	if authHeader == "" {
		return c.Next()
	}

	if strings.HasPrefix(authHeader, "Bearer ") {
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString != "" {
			claims, err := utils.ValidateJWT(tokenString)
			if err == nil {
				c.Locals("userID", claims.UserID)
				c.Locals("userEmail", claims.Email)
				c.Locals("userRole", claims.Role)
			}
		}
	}

	return c.Next()
}
