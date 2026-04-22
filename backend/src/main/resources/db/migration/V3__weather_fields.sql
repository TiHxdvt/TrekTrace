-- Add weather fields to activities table
ALTER TABLE activities ADD COLUMN weather_condition VARCHAR(50) NULL;
ALTER TABLE activities ADD COLUMN temperature DECIMAL(5, 1) NULL;
