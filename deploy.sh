#!/bin/bash

# Home Listing AI App Deployment Script
# This script builds and deploys the application to Firebase Hosting

set -e  # Exit on any error

echo "🚀 Starting deployment process..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    print_warning "Firebase CLI is not installed. Installing now..."
    npm install -g firebase-tools
fi

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root directory."
    exit 1
fi

print_status "Installing dependencies..."
npm install

print_status "Running linting..."
npm run lint

print_status "Building for production..."
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    print_error "Build failed. dist directory not found."
    exit 1
fi

print_success "Build completed successfully!"

# Check if user is logged into Firebase
if ! firebase projects:list &> /dev/null; then
    print_warning "Not logged into Firebase. Please log in:"
    firebase login
fi

print_status "Deploying to Firebase Hosting..."
firebase deploy --only hosting

print_success "🎉 Deployment completed successfully!"
print_status "Your app is now live at: https://home-listing-ai.firebaseapp.com"

# Optional: Open the deployed site
read -p "Would you like to open the deployed site? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    open https://home-listing-ai.firebaseapp.com
fi
