## NoteShare - A Note Sharing Platform

NoteShare is a full-stack web application designed for students and teachers. It provides a platform to upload, browse, and download educational notes. The application features user authentication, role-based access (students and teachers), and a dynamic interface for note discovery.

### Features

- User Authentication: Secure signup and login for users using JSON Web Tokens (JWT).

- Role-Based Access: Distinct roles for "Student" and "Teacher".

- Protected Routes: Only logged-in users can upload notes.

- File Uploads: Users can upload their notes (PDF, DOCX, TXT, etc.) with a title and subject.

- Note Discovery: Browse all notes with features for:

    - Full-text search (by title or subject)

    - Filtering by subject

    - Sorting by date, rating, or title

- Teacher-Verified Notes: A separate "Teacher Notes" page that only displays notes uploaded by users with the "Teacher" role.

- File Download: Download notes directly from the note card.

- Dynamic UI: The navigation bar intelligently updates to show/hide "Login/Signup" vs. "Logout" buttons and restricts "Upload" or "All Notes" links based on user role and auth status.

### Tech Stack

This project is a full-stack application built with:

#### Frontend

   - HTML5

   - CSS3 (with separate stylesheets per page)

   - JavaScript (ES6+): Handles all client-side logic, API calls (fetch), and DOM manipulation.

### Backend

- Node.js: JavaScript runtime environment.

- Express: Fast, unopinionated, minimalist web framework for Node.js.

- MongoDB: NoSQL database for storing user and note information.

- Mongoose: Object Data Modeling (ODM) library for MongoDB.

- JSON Web Tokens (JWT): For creating secure access tokens for authentication.

- bcryptjs: For hashing user passwords before storing them.

- Multer: Middleware for handling multipart/form-data, used for file uploads.

- CORS: For enabling Cross-Origin Resource Sharing.

- dotenv: For loading environment variables from a .env file.

### Project Structure

The project is organized into two main parts: frontend and backend.

```
/NoteShare-Project
├── /backend
│   ├── /config
│   │   └── db.js         # MongoDB connection
│   ├── /middleware
│   │   └── auth.js       # 'protect' (JWT) auth middleware
│   ├── /models
│   │   ├── Note.js       # Note Mongoose schema
│   │   └── User.js       # User Mongoose schema
│   ├── /routes
│   │   ├── auth.js       # Auth API routes (login, register)
│   │   └── notes.js      # Notes API routes (get, upload, download)
│   ├── /uploads/         # (GitIgnored) Stores all uploaded note files
│   ├── .env.example      # Example environment file
│   ├── package.json
│   └── server.js         # Main Express server entry point
│
└── /frontend
    ├── /css
    │   ├── all-notes.css
    │   ├── login.css
    │   ├── style.css
    │   └── ...
    ├── /js
    │   ├── auth.js       # Signup, login, logout, nav logic
    │   ├── notes.js      # Fetching & rendering notes
    │   └── upload.js     # Upload form logic
    │
    ├── all-notes.html
    ├── index.html
    ├── login.html
    ├── signup.html
    ├── teacher-notes.html
    └── upload.html
```

### Getting Started

Follow these instructions to get a copy of the project up and running on your local machine.

#### Prerequisites

- Node.js (v14 or later)

- npm (comes with Node.js)

- MongoDB: You can use a local MongoDB installation or a free cloud cluster from MongoDB Atlas.

1. Backend Setup

    1. Clone the repository:
    ```
    git clone [https://github.com/your-username/notes-backend.git](https://github.com/your-username/notes-backend.git)
    cd notes-backend
    ```

    2. Install dependencies:

    ```
    npm install
    ```

    3. Create your Environment File:

        - Create a file named .env in the backend directory.

        - Copy the contents of .env-sample into it and fill in your values.

       `.env`
       
        ```
        # Your MongoDB connection string (from Atlas or local)
        MONGO_URI=mongodb+srv://<user>:<password>@<cluster-url>/<database-name>

        # A long, random, and strong secret for signing JWTs
        JWT_SECRET=your_super_strong_jwt_secret

        # Port for the server
        PORT=5000
        ```


2. Frontend Setup

    - Navigate to the frontend folder.

    - Run the `index.html` in frontend with Live Server if using VS Code or Open it any browser