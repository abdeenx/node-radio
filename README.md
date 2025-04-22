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

## Deployment

### Deploying to Vercel

The application is configured for deployment on Vercel. Follow these steps to deploy:

1. **Push your code to GitHub**

2. **Connect Vercel to your GitHub repository**
   - Sign up or log in to [Vercel](https://vercel.com)
   - Create a new project and import your GitHub repository
   - Select "Node.js" as the framework preset

3. **Configure Environment Variables**
   - In your Vercel project settings, add the following environment variables:
     - `MONGODB_URI`: Your MongoDB Atlas connection string
     - `AUTH0_DOMAIN`: Your Auth0 domain
     - `AUTH0_CLIENT_ID`: Your Auth0 client ID
     - `AUTH0_AUDIENCE`: Your Auth0 audience 
     - `CLOUDINARY_CLOUD_NAME`: Your Cloudinary cloud name
     - `CLOUDINARY_API_KEY`: Your Cloudinary API key
     - `CLOUDINARY_API_SECRET`: Your Cloudinary API secret

4. **Deploy**
   - Vercel will automatically deploy your application
   - Every push to your main branch will trigger a new deployment

### Update Auth0 Configuration

After deploying, update your Auth0 application:
1. Log in to the [Auth0 Dashboard](https://manage.auth0.com/)
2. Navigate to your application
3. Update the "Allowed Callback URLs", "Allowed Logout URLs", and "Allowed Web Origins" to include your Vercel deployment URL

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