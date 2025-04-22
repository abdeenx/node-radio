#!/bin/bash

# Render Deployment Script for Node Radio

# Check if Render CLI is installed (if using Render CLI)
# Note: Currently, Render does not have an official CLI like Heroku
# This script will guide you through manual deployment steps

echo "===== Node Radio Render Deployment Guide ====="
echo ""
echo "Render does not have an official CLI like Heroku."
echo "This script will guide you through the deployment process."
echo ""

# Check for git repository
if [ ! -d .git ]; then
    echo "Initializing git repository..."
    git init
    git add .
    git commit -m "Initial commit for Render deployment"
    echo "Git repository initialized."
else
    echo "Git repository already exists."
fi

echo ""
echo "===== Deployment Steps ====="
echo ""
echo "1. Create a Render account if you don't have one:"
echo "   https://dashboard.render.com/register"
echo ""
echo "2. Configure your environment variables:"
echo "   Copy your environment variables from .env to Render dashboard."
echo ""
echo "3. Database setup options:"
echo "   a. Use Render's PostgreSQL service (recommended)"
echo "   b. Use MongoDB Atlas (free tier available)"
echo "      https://www.mongodb.com/cloud/atlas/register"
echo ""

# Check if .env file exists and display its variables (without values)
if [ -f .env ]; then
    echo "===== Environment Variables to Configure in Render Dashboard ====="
    echo "The following environment variables from your .env file need to be set in Render:"
    echo ""
    
    while IFS='=' read -r key value; do
        # Skip comments and empty lines
        [[ $key == \#* ]] && continue
        [[ -z "$key" ]] && continue
        
        # Trim whitespace
        key=$(echo "$key" | xargs)
        
        if [ ! -z "$key" ]; then
            echo "- $key"
        fi
    done < .env
    echo ""
else
    echo "No .env file found. Please make sure to configure all required environment variables in the Render dashboard."
    echo ""
fi

echo "===== Deployment Options ====="
echo ""
echo "Option 1: Deploy via Git repository (recommended)"
echo "1. Create a new Web Service in the Render dashboard"
echo "2. Connect your Git repository"
echo "3. Configure the service with:"
echo "   - Build Command: npm install"
echo "   - Start Command: node server.js"
echo "   - Environment Variables: Add all required variables from above"
echo ""
echo "Option 2: Deploy using render.yaml (Blueprint)"
echo "1. Push your code with render.yaml to a Git repository (GitHub, GitLab, etc.)"
echo "2. In the Render dashboard, select 'Blueprint' and connect to your repository"
echo "3. Render will automatically create the services defined in render.yaml"
echo "4. You'll still need to configure environment variables in the dashboard"
echo ""
echo "===== After Deployment ====="
echo "Once deployed, your app will be available at:"
echo "https://node-radio.onrender.com (or your custom URL)"
echo ""
echo "Remember to update the Auth0 configuration with your new Render URL:"
echo "- Allowed Callback URLs: https://your-render-url.onrender.com"
echo "- Allowed Logout URLs: https://your-render-url.onrender.com"
echo "- Allowed Web Origins: https://your-render-url.onrender.com"
echo ""
echo "===== Need Help? ====="
echo "Render Documentation: https://render.com/docs" 