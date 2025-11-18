const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config(); // Configuring the environment variable to use it accross the modules

const connectDB = require('./config/db'); // Importing function to connect with B

/*Importing all the routes*/ 
const authRoutes = require('./routes/auth'); 
const noteRoutes = require('./routes/notes');

connectDB(); // Attemping to connect to MongogoDB

const app = express(); // Express app inisitiation

/* ---Middlewares-- 
    1. Setting Cross-origin so that browser do not block connection to the backend url
    2. Parse the JSON Body send by the client
    3. Parse URL encoded body send by lient (some form send data through url)
*/
app.use(cors()); 
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve Static file | Make "upload" folder public so that the uploaded file can be downloaded

app.use('/api/auth', authRoutes); // Auth route | All routes will be mounted on /api/auth

app.use('/api/notes', noteRoutes); // // Notes route | All routes will be mounted on /api/notes

const PORT = process.env.PORT || 5000;

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});