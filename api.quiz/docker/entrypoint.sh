#!/bin/bash

# Wait for database to be ready
echo "Waiting for database connection..."
while ! nc -z mysql 3306; do
  sleep 1
done
echo "Database is ready!"

# Generate application key if it doesn't exist
if [ ! -f .env ]; then
    cp .env.example .env
fi

# Generate app key if not set
if ! grep -q "APP_KEY=base64:" .env; then
    php artisan key:generate --force
fi

# Run database migrations
echo "Running database migrations..."
php artisan migrate --force

# Seed the database if needed
if [ "$APP_ENV" = "local" ] || [ "$SEED_DATABASE" = "true" ]; then
    echo "Seeding database..."
    php artisan db:seed --force
fi

# Clear and cache config
php artisan config:clear
php artisan config:cache
php artisan route:cache

# Create storage link
php artisan storage:link

# Set proper permissions
chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache
chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

echo "Starting services..."
# Start supervisor
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf

