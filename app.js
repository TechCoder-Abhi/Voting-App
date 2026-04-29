const express = require('express');
const bodyParser = require('body-parser');

const app = express();

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

// Use the routers
app.use('/user', require('./routes/userRoutes'));
app.use('/candidate', require('./routes/candidateRoutes'));

module.exports = app;