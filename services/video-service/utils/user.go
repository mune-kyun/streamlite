package utils

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// UserProfile represents the user profile structure from User Service
type UserProfile struct {
	ID          uint   `json:"id"`
	UserID      uint   `json:"user_id"`
	DisplayName string `json:"display_name"`
	Avatar      string `json:"avatar"`
	Bio         string `json:"bio"`
}

// UserServiceResponse represents the response from User Service
type UserServiceResponse struct {
	Success bool        `json:"success,omitempty"`
	Data    UserProfile `json:"data,omitempty"`
	Error   struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

// FetchUserDisplayName fetches the display name for a user from the User Service
func FetchUserDisplayName(userID uint) string {
	// Create HTTP client with timeout
	client := &http.Client{
		Timeout: 5 * time.Second,
	}

	// Create request to User Service
	url := fmt.Sprintf("http://localhost:8002/api/v1/profiles/%d", userID)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		fmt.Printf("Error creating request for user %d: %v\n", userID, err)
		return fmt.Sprintf("User %d", userID)
	}

	// For service-to-service communication, we'll use a service token
	// In production, this should be a proper service-to-service authentication
	// For now, we'll make the profile endpoint public for service access
	
	resp, err := client.Do(req)
	if err != nil {
		// Log error and return fallback
		fmt.Printf("Error fetching user profile for user %d: %v\n", userID, err)
		return fmt.Sprintf("User %d", userID)
	}
	defer resp.Body.Close()

	// Check if user profile was found
	if resp.StatusCode == 404 {
		// User profile doesn't exist, return fallback
		return fmt.Sprintf("User %d", userID)
	}

	if resp.StatusCode != 200 {
		// Other error, return fallback
		fmt.Printf("User Service returned status %d for user %d\n", resp.StatusCode, userID)
		return fmt.Sprintf("User %d", userID)
	}

	// Parse response - User Service returns the profile directly, not wrapped in a data object
	var profile UserProfile
	if err := json.NewDecoder(resp.Body).Decode(&profile); err != nil {
		fmt.Printf("Error parsing user service response for user %d: %v\n", userID, err)
		return fmt.Sprintf("User %d", userID)
	}

	// Check if display name exists and is not empty
	if profile.DisplayName != "" {
		return profile.DisplayName
	}

	// Fallback to User ID format
	return fmt.Sprintf("User %d", userID)
}

// FetchMultipleUserDisplayNames fetches display names for multiple users efficiently
func FetchMultipleUserDisplayNames(userIDs []uint) map[uint]string {
	result := make(map[uint]string)
	
	// For now, fetch each user individually
	// In a production system, you might want to implement a batch API
	for _, userID := range userIDs {
		result[userID] = FetchUserDisplayName(userID)
	}
	
	return result
}
