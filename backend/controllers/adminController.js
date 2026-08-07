const User = require('../models/User');
const crypto = require('crypto');

exports.listUsers = async (req, res) => {
    try {
        const { role, status, page = 1, search } = req.query;
        const query = {};
        if (role) query.role = role;
        if (status) query.status = status;
        if (search) {
            query.$or = [
                { fullName: new RegExp(search, 'i') },
                { email: new RegExp(search, 'i') }
            ];
        }

        const users = await User.find(query)
            .select('-passwordHash')
            .sort({ createdAt: -1 })
            .limit(25)
            .skip((page - 1) * 25);
            
        const total = await User.countDocuments(query);
        res.status(200).json({ users, total });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.inviteUsers = async (req, res) => {
    try {
        const { emails, role } = req.body;
        // In a real scenario, this would create an invite token and send emails via SendGrid
        const invited = [];
        const failed = [];
        for (const email of emails) {
            try {
                const user = await User.create({
                    email,
                    fullName: 'Pending Invite', // Placeholder
                    // Random, unguessable placeholder (hashed by the pre-save hook) - never a real login credential.
                    // The real password is set when the invitee completes registration.
                    passwordHash: crypto.randomBytes(32).toString('hex'),
                    role,
                    status: 'invited'
                });
                const safeUser = user.toObject();
                delete safeUser.passwordHash;
                invited.push(safeUser);
            } catch (err) {
                failed.push({ email, error: err.code === 11000 ? 'A user with this email already exists' : err.message });
            }
        }
        res.status(201).json({ invited, failed });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.updateUserRoleStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { role, status } = req.body;

        // An admin editing their own role/status here could lock themselves out
        // (e.g. accidental self-demotion or self-deactivation) with no one left
        // to undo it - block self-targeting entirely for this endpoint.
        if (id === req.user._id.toString()) {
            return res.status(400).json({ message: 'You cannot change your own role or status.' });
        }

        const updateData = {};
        if (role) updateData.role = role;
        if (status) updateData.status = status;

        const user = await User.findByIdAndUpdate(id, updateData, { new: true }).select('-passwordHash');
        res.status(200).json({ user });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        if (req.params.id === req.user._id.toString()) {
            return res.status(400).json({ message: 'You cannot delete your own account.' });
        }
        await User.findByIdAndDelete(req.params.id);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
