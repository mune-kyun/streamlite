package handlers

import (
	"log"
	"time"

	"auth-service/database"
	"auth-service/models"
	"auth-service/utils"

	"github.com/gofiber/fiber/v2"
)

type RegisterRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=6"`
}

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

type AuthResponse struct {
	User         models.UserResponse `json:"user"`
	AccessToken  string              `json:"access_token"`
	RefreshToken string              `json:"refresh_token"`
}

type AuthError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// HealthCheck returns the service health status
// @Summary Health check endpoint
// @Description Get the health status of the auth service
// @Tags health
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{} "Service health status"
// @Router /health [get]
func HealthCheck(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"status":    "healthy",
		"service":   "auth-service",
		"timestamp": time.Now().UTC(),
	})
}

// Register creates a new user account
// @Summary Register a new user
// @Description Create a new user account with email and password
// @Tags authentication
// @Accept json
// @Produce json
// @Param request body RegisterRequest true "User registration data"
// @Success 201 {object} AuthResponse "User created successfully"
// @Failure 400 {object} map[string]string "Invalid request"
// @Failure 409 {object} map[string]string "User already exists"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /auth/register [post]
func Register(c *fiber.Ctx) error {
	var req RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Log registration attempt
	log.Printf("User registration attempt: %s", req.Email)

	// Validate input
	if !utils.IsValidEmail(req.Email) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid email format",
		})
	}

	if !utils.IsValidPassword(req.Password) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Password must be at least 6 characters long",
		})
	}

	// Check if user already exists
	var existingUser models.User
	if err := database.DB.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error": "User with this email already exists",
		})
	}

	// Hash password
	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to process password",
		})
	}

	// Create user
	user := models.User{
		Email:    req.Email,
		Password: hashedPassword,
		Role:     "user",
	}

	if err := database.DB.Create(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create user",
		})
	}

	// Log successful registration
	log.Printf("User registered successfully: %s", req.Email)

	// Generate tokens
	accessToken, err := utils.GenerateJWT(user.ID, user.Email, user.Role)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to generate access token",
		})
	}

	refreshToken, err := utils.GenerateRefreshToken(user.ID, user.Email, user.Role)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to generate refresh token",
		})
	}

	// Store refresh token
	refreshTokenRecord := models.RefreshToken{
		Token:     refreshToken,
		UserID:    user.ID,
		ExpiresAt: time.Now().Add(7 * 24 * time.Hour),
	}
	database.DB.Create(&refreshTokenRecord)

	response := AuthResponse{
		User:         user.ToResponse(),
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}

	return c.Status(fiber.StatusCreated).JSON(response)
}

// Login authenticates a user and returns tokens
// @Summary Login user
// @Description Authenticate user with email and password
// @Tags authentication
// @Accept json
// @Produce json
// @Param request body LoginRequest true "User login credentials"
// @Success 200 {object} AuthResponse "Login successful"
// @Failure 400 {object} AuthError "Invalid request"
// @Failure 401 {object} AuthError "Invalid credentials"
// @Failure 500 {object} AuthError "Internal server error"
// @Router /auth/login [post]
func Login(c *fiber.Ctx) error {
	var req LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(AuthError{
			Code:    "VALIDATION_ERROR",
			Message: "Invalid request body",
		})
	}

	// Log login attempt
	log.Printf("User login attempt: %s", req.Email)

	// Validate input
	if !utils.IsValidEmail(req.Email) {
		return c.Status(fiber.StatusBadRequest).JSON(AuthError{
			Code:    "VALIDATION_ERROR",
			Message: "Invalid email format",
		})
	}

	if req.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(AuthError{
			Code:    "VALIDATION_ERROR",
			Message: "Password is required",
		})
	}

	// Find user by email
	var user models.User
	if err := database.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(AuthError{
			Code:    "USER_NOT_FOUND",
			Message: "No account found with this email address",
		})
	}

	// Check password
	if !utils.CheckPassword(req.Password, user.Password) {
		return c.Status(fiber.StatusUnauthorized).JSON(AuthError{
			Code:    "INVALID_PASSWORD",
			Message: "The password you entered is incorrect",
		})
	}

	// Log successful login
	log.Printf("User logged in successfully: %s", req.Email)

	// Generate tokens
	accessToken, err := utils.GenerateJWT(user.ID, user.Email, user.Role)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(AuthError{
			Code:    "TOKEN_ERROR",
			Message: "Failed to generate access token",
		})
	}

	refreshToken, err := utils.GenerateRefreshToken(user.ID, user.Email, user.Role)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(AuthError{
			Code:    "TOKEN_ERROR",
			Message: "Failed to generate refresh token",
		})
	}

	// Store refresh token
	refreshTokenRecord := models.RefreshToken{
		Token:     refreshToken,
		UserID:    user.ID,
		ExpiresAt: time.Now().Add(7 * 24 * time.Hour),
	}
	database.DB.Create(&refreshTokenRecord)

	response := AuthResponse{
		User:         user.ToResponse(),
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}

	return c.JSON(response)
}

// ValidateToken validates the current user's token
// @Summary Validate JWT token
// @Description Validate the current user's JWT token
// @Tags authentication
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {object} map[string]interface{} "Token is valid"
// @Failure 401 {object} map[string]string "Invalid or expired token"
// @Router /auth/validate [get]
func ValidateToken(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	userEmail := c.Locals("userEmail").(string)
	userRole := c.Locals("userRole").(string)

	return c.JSON(fiber.Map{
		"valid": true,
		"user": fiber.Map{
			"id":    userID,
			"email": userEmail,
			"role":  userRole,
		},
	})
}

// RefreshToken generates new tokens using a refresh token
// @Summary Refresh JWT token
// @Description Generate new access and refresh tokens using a valid refresh token
// @Tags authentication
// @Accept json
// @Produce json
// @Param request body object{refresh_token=string} true "Refresh token request"
// @Success 200 {object} AuthResponse "Tokens refreshed successfully"
// @Failure 400 {object} map[string]string "Invalid request"
// @Failure 401 {object} map[string]string "Invalid or expired refresh token"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /auth/refresh [post]
func RefreshToken(c *fiber.Ctx) error {
	type RefreshRequest struct {
		RefreshToken string `json:"refresh_token"`
	}

	var req RefreshRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Validate refresh token
	claims, err := utils.ValidateJWT(req.RefreshToken)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid refresh token",
		})
	}

	// Check if refresh token exists in database
	var refreshTokenRecord models.RefreshToken
	if err := database.DB.Where("token = ?", req.RefreshToken).First(&refreshTokenRecord).Error; err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Refresh token not found",
		})
	}

	// Check if token is expired
	if time.Now().After(refreshTokenRecord.ExpiresAt) {
		database.DB.Delete(&refreshTokenRecord)
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Refresh token expired",
		})
	}

	// Get user
	var user models.User
	if err := database.DB.First(&user, claims.UserID).Error; err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User not found",
		})
	}

	// Generate new tokens
	newAccessToken, err := utils.GenerateJWT(user.ID, user.Email, user.Role)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to generate access token",
		})
	}

	newRefreshToken, err := utils.GenerateRefreshToken(user.ID, user.Email, user.Role)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to generate refresh token",
		})
	}

	// Update refresh token in database
	refreshTokenRecord.Token = newRefreshToken
	refreshTokenRecord.ExpiresAt = time.Now().Add(7 * 24 * time.Hour)
	database.DB.Save(&refreshTokenRecord)

	response := AuthResponse{
		User:         user.ToResponse(),
		AccessToken:  newAccessToken,
		RefreshToken: newRefreshToken,
	}

	return c.JSON(response)
}
