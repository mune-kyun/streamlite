package middleware

import (
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

// JWTClaims represents the JWT token claims
type JWTClaims struct {
	UserID uint   `json:"user_id"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

// getJWTSecret returns the JWT secret from environment or default
func getJWTSecret() string {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		// Default secret for development - should be set via environment in production
		secret = "streamlite-auth-secret-key-change-in-production"
	}
	return secret
}

// JWT secret key - synchronized with Auth Service
var jwtSecret = []byte(getJWTSecret())

// JWTMiddleware validates JWT tokens and extracts user information
func JWTMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Get token from Authorization header
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Authorization header is required",
			})
		}

		// Check if header starts with "Bearer "
		if !strings.HasPrefix(authHeader, "Bearer ") {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Authorization header must start with 'Bearer '",
			})
		}

		// Extract token
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Token is required",
			})
		}

		// Parse and validate token
		token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
			// Validate signing method
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return jwtSecret, nil
		})

		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid token: " + err.Error(),
			})
		}

		// Extract claims
		claims, ok := token.Claims.(*JWTClaims)
		if !ok || !token.Valid {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid token claims",
			})
		}

		// Check if token is expired
		if claims.ExpiresAt != nil && claims.ExpiresAt.Time.Before(time.Now()) {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Token has expired",
			})
		}

		// Store user information in context
		c.Locals("userID", claims.UserID)
		c.Locals("userEmail", claims.Email)
		c.Locals("userRole", claims.Role)

		return c.Next()
	}
}

// OptionalJWTMiddleware validates JWT tokens if present but doesn't require them
func OptionalJWTMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Get token from Authorization header
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			// No token provided, continue without authentication
			return c.Next()
		}

		// Check if header starts with "Bearer "
		if !strings.HasPrefix(authHeader, "Bearer ") {
			// Invalid format, continue without authentication
			return c.Next()
		}

		// Extract token
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == "" {
			// Empty token, continue without authentication
			return c.Next()
		}

		// Parse and validate token
		token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
			// Validate signing method
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return jwtSecret, nil
		})

		if err != nil {
			// Invalid token, continue without authentication
			return c.Next()
		}

		// Extract claims
		claims, ok := token.Claims.(*JWTClaims)
		if !ok || !token.Valid {
			// Invalid claims, continue without authentication
			return c.Next()
		}

		// Check if token is expired
		if claims.ExpiresAt != nil && claims.ExpiresAt.Time.Before(time.Now()) {
			// Token expired, continue without authentication
			return c.Next()
		}

		// Store user information in context
		c.Locals("userID", claims.UserID)
		c.Locals("userEmail", claims.Email)
		c.Locals("userRole", claims.Role)

		return c.Next()
	}
}

// GetUserID extracts user ID from context
func GetUserID(c *fiber.Ctx) (uint, bool) {
	userID := c.Locals("userID")
	if userID == nil {
		return 0, false
	}
	
	if id, ok := userID.(uint); ok {
		return id, true
	}
	
	return 0, false
}

// GetUserEmail extracts user email from context
func GetUserEmail(c *fiber.Ctx) (string, bool) {
	userEmail := c.Locals("userEmail")
	if userEmail == nil {
		return "", false
	}
	
	if email, ok := userEmail.(string); ok {
		return email, true
	}
	
	return "", false
}

// GetUserRole extracts user role from context
func GetUserRole(c *fiber.Ctx) (string, bool) {
	userRole := c.Locals("userRole")
	if userRole == nil {
		return "", false
	}
	
	if role, ok := userRole.(string); ok {
		return role, true
	}
	
	return "", false
}

// RequireRole middleware that requires a specific role
func RequireRole(requiredRole string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userRole, exists := GetUserRole(c)
		if !exists {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Authentication required",
			})
		}

		if userRole != requiredRole {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": fmt.Sprintf("Role '%s' required", requiredRole),
			})
		}

		return c.Next()
	}
}
