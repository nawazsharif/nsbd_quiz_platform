#!/bin/bash

# Quiz Platform Docker Setup Script
# This script helps you get started with the dockerized Quiz Platform

set -e

echo "🚀 Quiz Platform Docker Setup"
echo "=============================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "   Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is available
if ! docker compose version &> /dev/null && ! docker-compose --version &> /dev/null; then
    echo "❌ Docker Compose is not available. Please install Docker Compose."
    exit 1
fi

# Function to create environment files
setup_env_files() {
    echo "📝 Setting up environment files..."

    # Backend environment
    if [ ! -f "api.quiz/.env" ]; then
        if [ -f "api.quiz/env.template" ]; then
            cp api.quiz/env.template api.quiz/.env
            echo "✅ Created api.quiz/.env from template"
        else
            echo "⚠️  Template file api.quiz/env.template not found"
        fi
    else
        echo "✅ api.quiz/.env already exists"
    fi

    # Frontend environment
    if [ ! -f "quiz/.env.local" ]; then
        if [ -f "quiz/env.template" ]; then
            cp quiz/env.template quiz/.env.local
            echo "✅ Created quiz/.env.local from template"
        else
            echo "⚠️  Template file quiz/env.template not found"
        fi
    else
        echo "✅ quiz/.env.local already exists"
    fi
    echo ""
}

# Function to setup production
setup_production() {
    echo "🏭 Setting up Production Environment"
    echo "==================================="
    echo ""

    setup_env_files

    echo "🏗️  Building Docker images..."
    docker compose build --no-cache

    echo "🚀 Starting services..."
    docker compose up -d

    echo "⏳ Waiting for services to be ready..."
    sleep 30

    echo "🗄️  Running database migrations..."
    docker compose exec -T backend php artisan migrate --force

    echo ""
    echo "✅ Production setup complete!"
    echo ""
    echo "🌐 Access your application:"
    echo "   Frontend: http://localhost:3000"
    echo "   Backend API: http://localhost:8000"
    echo "   API Docs: http://localhost:8000/api/documentation"
    echo ""
}

# Function to setup development
setup_development() {
    echo "🛠️  Setting up Development Environment"
    echo "======================================"
    echo ""

    setup_env_files

    echo "🏗️  Building Docker images for development..."
    docker compose -f docker-compose.dev.yml build --no-cache

    echo "🚀 Starting development services..."
    docker compose -f docker-compose.dev.yml up -d

    echo "⏳ Waiting for services to be ready..."
    sleep 30

    echo "🗄️  Setting up fresh database with seed data..."
    docker compose -f docker-compose.dev.yml exec -T backend php artisan migrate:fresh --seed --force

    echo ""
    echo "✅ Development setup complete!"
    echo ""
    echo "🌐 Access your application:"
    echo "   Frontend: http://localhost:3000"
    echo "   Backend API: http://localhost:8000"
    echo "   API Docs: http://localhost:8000/api/documentation"
    echo ""
    echo "💡 Development features:"
    echo "   - Hot reloading enabled"
    echo "   - Debug mode enabled"
    echo "   - Sample data seeded"
    echo ""
}

# Function to show help
show_help() {
    echo "Usage: ./setup.sh [OPTION]"
    echo ""
    echo "Options:"
    echo "  prod, production     Set up production environment"
    echo "  dev, development     Set up development environment"
    echo "  help, -h, --help     Show this help message"
    echo ""
    echo "If no option is provided, you'll be prompted to choose."
}

# Main script logic
case "${1:-}" in
    "prod"|"production")
        setup_production
        ;;
    "dev"|"development")
        setup_development
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    "")
        echo "Please choose setup type:"
        echo "1) Production"
        echo "2) Development"
        echo ""
        read -p "Enter your choice (1 or 2): " choice
        case $choice in
            1)
                setup_production
                ;;
            2)
                setup_development
                ;;
            *)
                echo "Invalid choice. Exiting."
                exit 1
                ;;
        esac
        ;;
    *)
        echo "Unknown option: $1"
        show_help
        exit 1
        ;;
esac

echo "🎉 Setup completed successfully!"
echo ""
echo "🔧 Useful commands:"
echo "   make logs          # View all service logs"
echo "   make status        # Check service status"
echo "   make down          # Stop all services"
echo "   make help          # Show all available commands"
echo ""
echo "📚 For more information, see DOCKER_README.md"

