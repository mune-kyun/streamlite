package handlers

import (
	"video-service/database"
	"video-service/models"

	"github.com/gofiber/fiber/v2"
)

// GetCategories retrieves all video categories
// @Summary Get all categories
// @Description Get list of all video categories
// @Tags categories
// @Produce json
// @Success 200 {array} models.Category
// @Failure 500 {object} map[string]string
// @Router /api/v1/categories [get]
func GetCategories(c *fiber.Ctx) error {
	var categories []models.Category
	
	if err := database.DB.Find(&categories).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to retrieve categories",
		})
	}

	return c.JSON(categories)
}

// CreateCategory creates a new video category
// @Summary Create category
// @Description Create a new video category (admin only)
// @Tags categories
// @Accept json
// @Produce json
// @Param category body models.CategoryRequest true "Category data"
// @Success 201 {object} models.Category
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/categories [post]
func CreateCategory(c *fiber.Ctx) error {
	var req models.CategoryRequest
	
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if req.Name == "" {
		return c.Status(400).JSON(fiber.Map{
			"error": "Category name is required",
		})
	}

	// Check if category already exists
	var existingCategory models.Category
	if err := database.DB.Where("name = ?", req.Name).First(&existingCategory).Error; err == nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Category with this name already exists",
		})
	}

	category := models.Category{
		Name:        req.Name,
		Description: req.Description,
	}

	if err := database.DB.Create(&category).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to create category",
		})
	}

	return c.Status(201).JSON(category)
}

// UpdateCategory updates an existing category
// @Summary Update category
// @Description Update an existing category (admin only)
// @Tags categories
// @Accept json
// @Produce json
// @Param id path int true "Category ID"
// @Param category body models.CategoryRequest true "Category data"
// @Success 200 {object} models.Category
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/categories/{id} [put]
func UpdateCategory(c *fiber.Ctx) error {
	id := c.Params("id")

	var category models.Category
	if err := database.DB.First(&category, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "Category not found",
		})
	}

	var req models.CategoryRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Update fields if provided
	if req.Name != "" {
		// Check if another category with this name exists
		var existingCategory models.Category
		if err := database.DB.Where("name = ? AND id != ?", req.Name, category.ID).First(&existingCategory).Error; err == nil {
			return c.Status(400).JSON(fiber.Map{
				"error": "Category with this name already exists",
			})
		}
		category.Name = req.Name
	}
	
	if req.Description != "" {
		category.Description = req.Description
	}

	if err := database.DB.Save(&category).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to update category",
		})
	}

	return c.JSON(category)
}

// DeleteCategory deletes a category
// @Summary Delete category
// @Description Delete a category (admin only)
// @Tags categories
// @Produce json
// @Param id path int true "Category ID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/categories/{id} [delete]
func DeleteCategory(c *fiber.Ctx) error {
	id := c.Params("id")

	var category models.Category
	if err := database.DB.First(&category, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "Category not found",
		})
	}

	// Check if category has videos
	var videoCount int64
	database.DB.Model(&models.Video{}).Where("category_id = ?", id).Count(&videoCount)
	
	if videoCount > 0 {
		return c.Status(400).JSON(fiber.Map{
			"error": "Cannot delete category with existing videos",
		})
	}

	if err := database.DB.Delete(&category).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to delete category",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Category deleted successfully",
	})
}
