-- Add order_index column to projects table
ALTER TABLE projects 
ADD COLUMN order_index DOUBLE PRECISION DEFAULT 0;

-- Backfill order_index based on created_at so everything has a unique initial index
WITH numbered_projects AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as row_num
  FROM projects
)
UPDATE projects
SET order_index = numbered_projects.row_num
FROM numbered_projects
WHERE projects.id = numbered_projects.id;
