const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/user');
const { jwtAuthMiddleware } = require('../jwt');
const Candidate = require('../models/candidates');

const validateCandidatePayload = (data, { partial = false } = {}) => {
    if (!data || typeof data !== 'object') {
        return 'Request body is required';
    }

    const requiredFields = ['name', 'party', 'age'];
    for (const field of requiredFields) {
        if (!partial && (data[field] === undefined || data[field] === null || data[field] === '')) {
            return `${field} is required`;
        }
    }

    if (data.name !== undefined && (typeof data.name !== 'string' || !data.name.trim())) {
        return 'name must be a non-empty string';
    }

    if (data.party !== undefined && (typeof data.party !== 'string' || !data.party.trim())) {
        return 'party must be a non-empty string';
    }

    if (data.age !== undefined && (!Number.isInteger(Number(data.age)) || Number(data.age) < 18)) {
        return 'age must be a number greater than or equal to 18';
    }

    return null;
};

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

// Helper to check admin role
const checkAdminRole = async (userID) => {
    try {
        const user = await User.findById(userID);
        return user && user.role === 'admin';
    } catch (err) {
        return false;
    }
};

// POST - Add a new candidate (Admin only)
router.post('/', jwtAuthMiddleware, async (req, res) => {
    try {
        if (!(await checkAdminRole(req.user.id)))
            return res.status(403).json({ message: 'User does not have admin role' });

        const data = req.body;
        const validationError = validateCandidatePayload(data);

        if (validationError) {
            return res.status(400).json({ error: validationError });
        }

        const newCandidate = new Candidate({
            name: data.name.trim(),
            party: data.party.trim(),
            age: Number(data.age)
        });
        const response = await newCandidate.save();
        console.log('Candidate saved');
        res.status(201).json({ candidate: response });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// PUT - Update a candidate (Admin only)
router.put('/:candidateID', jwtAuthMiddleware, async (req, res) => {
    try {
        if (!(await checkAdminRole(req.user.id)))
            return res.status(403).json({ message: 'User does not have admin role' });

        const candidateID = req.params.candidateID;
        const updatedCandidateData = req.body;

        if (!isValidObjectId(candidateID)) {
            return res.status(400).json({ error: 'Invalid candidate ID' });
        }

        const validationError = validateCandidatePayload(updatedCandidateData, { partial: true });

        if (validationError) {
            return res.status(400).json({ error: validationError });
        }

        const payload = {};
        if (updatedCandidateData.name !== undefined) payload.name = updatedCandidateData.name.trim();
        if (updatedCandidateData.party !== undefined) payload.party = updatedCandidateData.party.trim();
        if (updatedCandidateData.age !== undefined) payload.age = Number(updatedCandidateData.age);

        const response = await Candidate.findByIdAndUpdate(candidateID, payload, {
            new: true,
            runValidators: true,
        });

        if (!response) {
            return res.status(404).json({ error: 'Candidate not found' });
        }

        console.log('Candidate data updated');
        res.status(200).json(response);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// DELETE - Delete a candidate (Admin only)
router.delete('/:candidateID', jwtAuthMiddleware, async (req, res) => {
    try {
        if (!(await checkAdminRole(req.user.id)))
            return res.status(403).json({ message: 'User does not have admin role' });

        const candidateID = req.params.candidateID;

        if (!isValidObjectId(candidateID)) {
            return res.status(400).json({ error: 'Invalid candidate ID' });
        }

        const response = await Candidate.findByIdAndDelete(candidateID);

        if (!response) {
            return res.status(404).json({ error: 'Candidate not found' });
        }

        console.log('Candidate deleted');
        res.status(200).json(response);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET - Vote count for all candidates (sorted descending)
router.get('/vote/count', async (req, res) => {
    try {
        //find all candidates and sort them by voteCount in descending order
        const candidates = await Candidate.find().sort({ voteCount: 'desc' });

        const voteRecord = candidates.map((data) => {
            return {
                party: data.party,
                count: data.voteCount
            };
        });

        return res.status(200).json(voteRecord);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST - Vote for a candidate (Voter only, once)
router.post('/vote/:candidateID', jwtAuthMiddleware, async (req, res) => {
    const candidateID = req.params.candidateID;
    const userId = req.user.id;
    let voterMarked = false;

    try {
        if (!isValidObjectId(candidateID)) {
            return res.status(400).json({ error: 'Invalid candidate ID' });
        }

        const candidateExists = await Candidate.exists({ _id: candidateID });
        if (!candidateExists) {
            return res.status(404).json({ message: 'Candidate not found' });
        }

        const user = await User.findOneAndUpdate(
            { _id: userId, role: 'voter', isVoted: false },
            { $set: { isVoted: true } },
            { new: true }
        );

        voterMarked = Boolean(user);

        if (!user) {
            const existingUser = await User.findById(userId);

            if (!existingUser) {
                return res.status(404).json({ message: 'User not found' });
            }

            if (existingUser.role === 'admin') {
                return res.status(403).json({ message: 'Admin is not allowed to vote' });
            }

            return res.status(400).json({ message: 'You have already voted' });
        }

        const updatedCandidate = await Candidate.findByIdAndUpdate(
            candidateID,
            {
                $push: { votes: { user: userId, votedAt: new Date() } },
                $inc: { voteCount: 1 }
            },
            { new: true }
        );

        if (!updatedCandidate) {
            await User.findByIdAndUpdate(userId, { $set: { isVoted: false } });
            return res.status(404).json({ message: 'Candidate not found' });
        }

        return res.status(200).json({ message: 'Vote recorded successfully' });
    } catch (err) {
        if (voterMarked) {
            await User.findByIdAndUpdate(userId, { $set: { isVoted: false } });
        }

        console.log(err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET - List all candidates (name and party only)
router.get('/', async (req, res) => {
    try {
        const candidates = await Candidate.find({}, 'name party age voteCount');
        res.status(200).json(candidates);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
