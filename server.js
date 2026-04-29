require('dotenv').config();

const PORT = process.env.PORT || 3000;

const isValidMongoConnectionString = (value) => {
    if (!value) {
        return false;
    }

    return value.startsWith('mongodb://') || value.startsWith('mongodb+srv://');
};

const requiredEnvVars = ['JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (!isValidMongoConnectionString(process.env.MONGODB_URL) && !isValidMongoConnectionString(process.env.MONGODB_URL_LOCAL)) {
    missingEnvVars.push('MONGODB_URL_LOCAL or MONGODB_URL');
}

if (missingEnvVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

const app = require('./app');

const startServer = () => {
    const db = require('./db');

    db.once('connected', () => {
        app.listen(PORT, () => {
            console.log(`Server is running on port http://localhost:${PORT}`);
        });
    });
};

if (require.main === module) {
    startServer();
}

module.exports = app;
