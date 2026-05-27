const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();

const corsOptions = {
    origin(origin, callback) {
        const isLocalhost = origin === 'http://localhost:5173' || origin === 'http://localhost:3000';
        const isVercelApp = typeof origin === 'string' && /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);

        if (!origin || isLocalhost || isVercelApp) {
            callback(null, true);
            return;
        }

        callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};

// CORS middleware FIRST
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

app.use(bodyParser.json());

// Root route
app.get('/', (req, res) => {
    res.json({
        message: 'Voting App API is running',
        version: '1.0.0',
        endpoints: {
            users: '/user',
            candidates: '/candidate'
        }
    });
});

// Routes
app.use('/user', require('./routes/userRoutes'));
app.use('/candidate', require('./routes/candidateRoutes'));

module.exports = app;