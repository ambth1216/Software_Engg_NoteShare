const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/noteshare", {  
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }); // Connecting with MongoDB locally 

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1); 
  } // exiting the process if connection is unseccessfull
};

module.exports = connectDB; // Importing the DB connection function to using in server.js