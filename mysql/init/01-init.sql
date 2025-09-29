-- Initialize MySQL database for Quiz Platform
-- This file is automatically executed when MySQL container starts for the first time

-- Grant additional privileges to quiz_user
GRANT ALL PRIVILEGES ON quiz_platform.* TO 'quiz_user'@'%';
FLUSH PRIVILEGES;

-- Ensure UTF8MB4 character set for emoji support
ALTER DATABASE quiz_platform CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

