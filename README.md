# Node Radio

A collaborative web radio application where users can listen to audio files together in real-time. This application allows users to create virtual radio stations (rooms), upload audio tracks, and listen to them synchronously with other users.

## Features

- Real-time synchronized audio playback
- User authentication via Auth0
- Room-based listening experience
- Audio file uploads to Cloudinary
- Collaborative playlist management
- Simple and intuitive UI

## Tech Stack

- **Backend**: Node.js, Express.js, Socket.io
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Database**: MongoDB
- **Storage**: Cloudinary
- **Authentication**: Auth0
- **Deployment**: Render

## Prerequisites

Before you begin, ensure you have the following:

- [Node.js](https://nodejs.org/) (v14.x or higher)
- [MongoDB](https://www.mongodb.com/try/download/community) installed locally or a MongoDB Atlas account
- [Git](https://git-scm.com/downloads)
- [Auth0 Account](https://auth0.com/) for authentication
- [Cloudinary Account](https://cloudinary.com/) for file storage

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd node_radio
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the example environment file and update it with your credentials:

```bash
cp .env.example .env
```

Edit the `.env` file with your:
- MongoDB connection string
- Auth0 credentials
- Cloudinary credentials

### 4. Configure Auth0

1. Create a new Auth0 application (Single Page Application)
2. Configure the following settings:
   - Allowed Callback URLs: `http://localhost:3000`
   - Allowed Logout URLs: `http://localhost:3000`
   - Allowed Web Origins: `http://localhost:3000`
3. Create an API in Auth0 and set the identifier to match your `AUTH0_AUDIENCE` value
4. Update the Auth0 configuration in `public/js/auth.js` with your domain and client ID

### 5. Configure Cloudinary

1. Create a Cloudinary account if you don't have one
2. Get your cloud name, API key, and API secret
3. Add these values to your `.env` file

### 6. Start the Application Locally

```bash
npm start
```

The application will be available at `http://localhost:3000`

## Deployment to Render

This project includes a configuration file and a helpful script to guide you through deployment to Render.

### Automated Deployment with render.yaml (Blueprint)

1. Push your code with the `render.yaml` file to a Git repository (GitHub, GitLab, etc.)
2. Create an account on [Render](https://render.com) if you don't have one
3. In the Render dashboard, select "Blueprint" and connect to your repository
4. Render will automatically detect the `render.yaml` file and create the service
5. You'll need to configure environment variables in the Render dashboard

### Manual Deployment via Git

1. Create an account on [Render](https://render.com) if you don't have one
2. Create a new Web Service in the Render dashboard
3. Connect your Git repository
4. Configure the service with:
   - Build Command: `npm install`
   - Start Command: `node server.js`
   - Environment Variables: Add all required variables from your `.env` file

### Deployment Guide

For a step-by-step guide, run the included helper script:

```bash
chmod +x render-deploy.sh
./render-deploy.sh
```

This script will guide you through the deployment process, showing which environment variables you need to configure.

### After Deployment

Once deployed, your app will be available at the URL provided by Render (typically `https://your-app-name.onrender.com`).

Remember to update your Auth0 configuration with your new Render URL:
- Allowed Callback URLs: `https://your-app-name.onrender.com`
- Allowed Logout URLs: `https://your-app-name.onrender.com`
- Allowed Web Origins: `https://your-app-name.onrender.com`

## Database Options

You have two main options for the database:

1. **MongoDB Atlas** (recommended) - Free tier available, provides a MongoDB database in the cloud
2. **Render PostgreSQL** - Render provides PostgreSQL databases, but this would require changing the database code

## Notes for Free Tier Usage

This application is designed to work within the constraints of free tier services:

- **Render**: Free tier has limitations on compute hours and may sleep after inactivity
- **MongoDB Atlas**: Free tier has storage limitations
- **Cloudinary**: Free tier has bandwidth and storage limitations

To stay within limits:
- The application implements content rotation to manage storage
- Audio files use optimal compression to reduce bandwidth usage
- The application uses efficient caching strategies

## License

This project is licensed under the MIT License - see the LICENSE file for details. 