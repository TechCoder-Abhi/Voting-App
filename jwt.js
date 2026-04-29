const jwt = require('jsonwebtoken');

const getJwtSecret = () => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not configured');
    }

    return process.env.JWT_SECRET;
};

const jwtAuthMiddleware = (req, res, next) => {
    // First check request headers has authorization or not
    const authorization = req.headers.authorization;
    if (!authorization) return res.status(401).json({ error: 'Token Not Found' });

    // Extract the jwt token from the request headers
    const token = authorization.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    try {
        // Verify the JWT token
        const decoded = jwt.verify(token, getJwtSecret());

        // Attach user information to the request object
        req.user = decoded;
        next();
    } catch (err) {
        console.error(err);
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Function to generate JWT token
const generateToken = (userData) => {
    return jwt.sign(userData, getJwtSecret(), { expiresIn: '1h' });
};

module.exports = { jwtAuthMiddleware, generateToken };