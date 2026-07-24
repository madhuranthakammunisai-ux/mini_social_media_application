# Mini Social Media Platform - Backend API & Deployment Guide

This repository contains a full-stack Mini Social Media Platform featuring Express.js/SQLite backend architecture alongside a glassmorphism client application.

## System Features Across All 12 Phases

- **Phase 1: Project Setup**: Clean modular architecture with Express API endpoints and dual live/embedded database engine.
- **Phase 2: Database Design**: Normalized schema for `users`, `posts`, `comments`, `likes`, and `follows`.
- **Phase 3: Authentication**: Secure password hashing with `bcryptjs`, JWT token issuance, and protected endpoint middleware.
- **Phase 4: User Profiles**: Customizable profiles with avatar uploads, bios, and follower/following metrics.
- **Phase 5: Post Management**: Full CRUD operations for text and image posts.
- **Phase 6: Comment System**: Nested comment section with live posting and delete authorization.
- **Phase 7: Like System**: Instant toggle likes with live counter updates.
- **Phase 8: Follow System**: Network graph with follow/unfollow and follower counts.
- **Phase 9: News Feed**: Real-time sorted news feed featuring author info, like counts, and comment counts.
- **Phase 10: Frontend Integration**: Standalone SPA with glassmorphism CSS, REST client API, and toast feedback.
- **Phase 11: Testing**: Automated route validations and error boundary handling.
- **Phase 12: Deployment Readiness**: Configured for instant hosting on Render, Railway, or Vercel.

## Running Locally

1. **Install Backend Dependencies**:
   ```bash
   cd backend
   npm install
   ```

2. **Start API Server**:
   ```bash
   npm start
   # Server launches at http://localhost:5000/api
   ```

3. **Open Frontend**:
   Open `index.html` directly in any web browser!

## Deployment (Phase 12)

- **Render / Railway Deployment (Backend)**:
  - Push repository to GitHub.
  - Create a new Web Service on Render or Railway pointing to the `backend/` directory.
  - Set Build Command: `npm install`
  - Set Start Command: `node server.js`
  - Environment Variables:
    - `PORT`: `5000`
    - `JWT_SECRET`: `your-custom-production-jwt-secret-key`

- **Vercel / Netlify Deployment (Frontend)**:
  - Deploy root directory to Vercel/Netlify/GitHub Pages.
