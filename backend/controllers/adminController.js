const User = require('../models/User');

exports.listUsers = async (req, res) => {
    try {
        const { role, status, page = 1 } = req.query;
        const query = {};
        if (role) query.role = role;
        if (status) query.status = status;

        const users = await User.find(query)
            .sort({ createdAt: -1 })
            .limit(25)
            .skip((page - 1) * 25);
            
        res.status(200).json({ users, total: users.length });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.inviteUsers = async (req, res) => {
    try {
        const { emails, role } = req.body;
        // In a real scenario, this would create an invite token and send emails via SendGrid
        const invited = [];
        for (const email of emails) {
            const user = await User.create({
                email,
                fullName: 'Pending Invite', // Placeholder
                passwordHash: 'pending', // Would be generated later
                role,
                status: 'invited'
            });
            invited.push(user);
        }
        res.status(201).json({ invited });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.updateUserRoleStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { role, status } = req.body;
        
        const updateData = {};
        if (role) updateData.role = role;
        if (status) updateData.status = status;

        const user = await User.findByIdAndUpdate(id, updateData, { new: true });
        res.status(200).json({ user });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
