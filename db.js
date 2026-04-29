const mongoose = require('mongoose');
require('dotenv').config();

const isValidMongoConnectionString = (value) => {
    if (!value) {
        return false;
    }

    return value.startsWith('mongodb://') || value.startsWith('mongodb+srv://');
};

const mongoURL = isValidMongoConnectionString(process.env.MONGODB_URL)
    ? process.env.MONGODB_URL
    : process.env.MONGODB_URL_LOCAL;

if (!isValidMongoConnectionString(mongoURL)) {
    throw new Error('MongoDB connection string is missing. Set MONGODB_URL or MONGODB_URL_LOCAL.');
}

// Set up MongoDB connection
mongoose.connect(mongoURL).catch((err) => {
    console.error('MongoDB connection error:', err);
});

// Get the default connection
const db = mongoose.connection;

// Define event listeners for database connection
db.on('connected', () => {
    console.log('Connected to MongoDB server');
});

db.on('error', (err) => {
    console.error('MongoDB connection error:', err);
});

db.on('disconnected', () => {
    console.log('MongoDB disconnected');
});

// Export the database connection
module.exports = db;
