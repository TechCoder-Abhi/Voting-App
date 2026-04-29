const express = require('express');
const router = express.Router();
const User = require('../models/user');
const { jwtAuthMiddleware, generateToken } = require('../jwt');

const validateAadharCardNumber = (value) => /^\d{12}$/.test(String(value));

const sanitizeUser = (user) => ({
    id: user._id,
    name: user.name,
    age: user.age,
    email: user.email,
    mobile: user.mobile,
    address: user.address,
    role: user.role,
    isVoted: user.isVoted
});

const validateSignupPayload = (data) => {
    if (!data || typeof data !== 'object') {
        return 'Request body is required';
    }

    if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
        return 'Name is required';
    }

    if (!Number.isInteger(Number(data.age)) || Number(data.age) < 18) {
        return 'Age must be a number greater than or equal to 18';
    }

    if (!data.address || typeof data.address !== 'string' || !data.address.trim()) {
        return 'Address is required';
    }

    if (!validateAadharCardNumber(data.aadharCardNumber)) {
        return 'Aadhar Card Number must be exactly 12 digits';
    }

    if (!data.password || typeof data.password !== 'string' || data.password.length < 6) {
        return 'Password must be at least 6 characters long';
    }

    if (data.role && !['voter', 'admin'].includes(data.role)) {
        return 'Role must be either voter or admin';
    }

    return null;
};

// POST route to register a new user
router.post('/signup', async (req, res) => {
    try {
        const data = req.body;
        const validationError = validateSignupPayload(data);

        if (validationError) {
            return res.status(400).json({ error: validationError });
        }

        const normalizedAadharCardNumber = String(data.aadharCardNumber).trim();

        // Check if there is already an admin user
        const adminUser = await User.findOne({ role: 'admin' });
        if (data.role === 'admin' && adminUser) {
            return res.status(400).json({ error: 'Admin user already exists' });
        }

        // Check if a user with the same Aadhar Card Number already exists
        const existingUser = await User.findOne({ aadharCardNumber: normalizedAadharCardNumber });
        if (existingUser) {
            return res.status(400).json({ error: 'User with the same Aadhar Card Number already exists' });
        }

        // Create a new User document using the Mongoose model
        const newUser = new User({
            ...data,
            age: Number(data.age),
            aadharCardNumber: normalizedAadharCardNumber
        });

        // Save the new user to the database
        const response = await newUser.save();
        console.log('User registered successfully');

        const payload = { id: response.id };
        const token = generateToken(payload);

        res.status(201).json({ user: sanitizeUser(response), token });
    } catch (err) {
        console.log(err);

        if (err.code === 11000) {
            return res.status(409).json({ error: 'User already exists' });
        }

        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST route to login
router.post('/login', async (req, res) => {
    try {
        const { aadharCardNumber, password } = req.body;

        // Check if aadharCardNumber or password is missing
        if (!aadharCardNumber || !password) {
            return res.status(400).json({ error: 'Aadhar Card Number and password are required' });
        }

        if (!validateAadharCardNumber(aadharCardNumber)) {
            return res.status(400).json({ error: 'Aadhar Card Number must be exactly 12 digits' });
        }

        // Find the user by aadharCardNumber
        const user = await User.findOne({ aadharCardNumber: String(aadharCardNumber).trim() });

        // If user does not exist or password does not match, return error
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ error: 'Invalid Aadhar Card Number or Password' });
        }

        const payload = { id: user.id };
        const token = generateToken(payload);

        res.json({ token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET profile route
router.get('/profile', jwtAuthMiddleware, async (req, res) => {
    try {
        const userData = req.user;
        const userId = userData.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json({ user: sanitizeUser(user) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// PUT change password
router.put('/profile/password', jwtAuthMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Both currentPassword and newPassword are required' });
        }

        if (typeof newPassword !== 'string' || newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters long' });
        }

        const user = await User.findById(userId);

        if (!user || !(await user.comparePassword(currentPassword))) {
            return res.status(401).json({ error: 'Invalid current password' });
        }

        user.password = newPassword;
        await user.save();

        console.log('Password updated');
        res.status(200).json({ message: 'Password updated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
