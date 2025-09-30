# Docker Setup Guide for Quiz Platform

This guide will help you set up the complete Quiz Platform using Docker.

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose installed on your system
- At least 4GB of available RAM
- Ports 3000, 8000, 3306, and 6379 available

### Production Setup (Recommended)
```bash
# Clone the repository (if not already done)
git clone <your-repo-url>
cd nsbd_quiz_platform

# Quick production setup
make setup

# Or manual setup:
make build
make up
make db-migrate
```

### Development Setup (For Development)
```bash
# Development setup with hot reloading
make setup-dev

# Or manual development setup:
make dev-build
make dev-up
make db-fresh  # Creates fresh database with seed data
```

## 🏗️ Architecture

The application consists of these services:

- **MySQL** (Port 3306): Main database
- **Redis** (Port 6379): Caching and sessions
- **Backend** (Port 8000): Laravel API
- **Frontend** (Port 3000): Next.js application

## 📋 Available Commands

### Production Commands
```bash
make build          # Build all images
make up             # Start services
make down           # Stop services
make restart        # Restart services
make logs           # View logs
make status         # Show service status
```

### Development Commands
```bash
make dev-build      # Build development images
make dev-up         # Start development services
make dev-down       # Stop development services
make dev-logs       # View development logs
```

### Database Commands
```bash
make db-migrate     # Run migrations
make db-seed        # Run seeders
make db-fresh       # Fresh database (DEV ONLY)
```

### Service-Specific Commands
```bash
make backend-shell     # Access backend container
make frontend-shell    # Access frontend container
make backend-artisan ARGS="route:list"  # Run artisan commands
make backend-test      # Run backend tests
```

### Cleanup Commands
```bash
make clean          # Clean Docker resources
make clean-all      # Clean everything including images
```

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
Copy the backend environment template and adjust as needed:
```bash
cp api.quiz/.env.example api.quiz/.env
```

Key variables:
- `DB_HOST=mysql` (Docker service name)
- `REDIS_HOST=redis` (Docker service name)
- `APP_URL=http://api.quiz.test`
- `SANCTUM_STATEFUL_DOMAINS=localhost:3000`

#### Frontend (.env.local)
Copy the frontend environment template:
```bash
cp quiz/.env.local.example quiz/.env.local
```

Key variables:
- `NEXTAUTH_URL=http://localhost:3000`
- `API_PROXY_TARGET=http://api.quiz.test`
- `NEXT_PUBLIC_API_URL=http://api.quiz.test`

## 🔍 Accessing the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://api.quiz.test
- **API Documentation**: http://api.quiz.test/api/documentation
- **API Health Check**: http://api.quiz.test/api/health

## 📊 Database

### Default Credentials
- **Host**: localhost:3306
- **Database**: quiz_platform
- **Username**: quiz_user
- **Password**: quiz_password
- **Root Password**: root_password

### Seeded Data
The development setup includes seeded data:
- Admin user: Check the UserSeeder for default credentials
- Sample categories, quizzes, and courses
- Test data for development

## 🐛 Troubleshooting

### Common Issues

1. **Port Conflicts**
   ```bash
   # Check if ports are in use
   netstat -tulpn | grep :3000
   netstat -tulpn | grep :8000
   ```

2. **Database Connection Issues**
   ```bash
   # Check if MySQL is ready
   docker-compose logs mysql

   # Restart services
   make restart
   ```

3. **Permission Issues**
   ```bash
   # Fix Laravel storage permissions
   docker-compose exec backend chown -R www-data:www-data /var/www/html/storage
   ```

4. **Frontend Build Issues**
   ```bash
   # Clear Next.js cache
   docker-compose exec frontend rm -rf .next

   # Rebuild frontend
   make frontend-build
   ```

### Reset Everything
```bash
# Complete reset (WARNING: This removes all data)
make clean-all
make setup
```

## 📈 Monitoring

### View Logs
```bash
# All services
make logs

# Specific service
make logs-backend
make logs-frontend
docker-compose logs -f mysql
docker-compose logs -f redis
```

### Health Checks
```bash
# Check service health
curl http://api.quiz.test/api/health
curl http://localhost:3000/api/health

# Check database connectivity
docker-compose exec backend php artisan tinker
# Then: DB::connection()->getPdo();
```

## 🔐 Security Notes

### Production Deployment
Before deploying to production:

1. **Change default passwords** in docker-compose.yml
2. **Set strong secrets** for NEXTAUTH_SECRET and APP_KEY
3. **Use environment files** instead of inline environment variables
4. **Enable HTTPS** with a reverse proxy (nginx/Caddy)
5. **Set up proper backup** for MySQL data volume
6. **Configure firewall** to restrict access to database ports

### Environment Files
Never commit `.env` files with production secrets to version control.

## 🤝 Development Workflow

1. **Start development environment**:
   ```bash
   make dev-up
   ```

2. **Make changes** to code (auto-reloads enabled)

3. **Run tests**:
   ```bash
   make backend-test
   ```

4. **Check logs** if needed:
   ```bash
   make dev-logs
   ```

5. **Stop when done**:
   ```bash
   make dev-down
   ```

## 📞 Support

If you encounter issues:
1. Check the logs using `make logs`
2. Ensure all prerequisites are met
3. Try resetting with `make clean && make setup`
4. Check Docker system resources: `docker system df`

For more help, check the individual service documentation:
- Backend: `api.quiz/README.md`
- Frontend: `quiz/README.md`
