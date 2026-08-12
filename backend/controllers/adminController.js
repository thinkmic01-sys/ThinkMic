const User = require('../models/User');
const Role = require('../models/Role');
const crypto = require('crypto');

// Distinct Professional Title values currently in use - backs the Schema Builder's
// "Target Title" picker so an admin can only target titles that real users actually have.
exports.getDistinctTitles = async (req, res) => {
    try {
        const titles = await User.distinct('title', { title: { $nin: [null, ''] } });
        res.status(200).json({ titles: titles.map((t) => t.trim()).sort((a, b) => a.localeCompare(b)) });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

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
            .populate('roleId', 'name slug permissions')
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
        const { emails, role, roleId } = req.body;
        const roleDoc = roleId ? await Role.findById(roleId) : await Role.findOne({ slug: role || 'user' });
        if (!roleDoc) {
            return res.status(400).json({ message: 'Role not found.' });
        }

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
                    role: roleDoc.slug,
                    roleId: roleDoc._id,
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
        const { roleId, role, status } = req.body;

        // An admin editing their own role/status here could lock themselves out
        // (e.g. accidental self-demotion or self-deactivation) with no one left
        // to undo it - block self-targeting entirely for this endpoint.
        if (id === req.user._id.toString()) {
            return res.status(400).json({ message: 'You cannot change your own role or status.' });
        }

        const updateData = {};
        // roleId is the modern path (any system or custom role); a bare `role` slug is
        // still accepted for backward compatibility and resolved to its Role document -
        // User.role stays a denormalized mirror of roleId's slug either way.
        if (roleId || role) {
            const roleDoc = roleId ? await Role.findById(roleId) : await Role.findOne({ slug: role });
            if (!roleDoc) {
                return res.status(400).json({ message: 'Role not found.' });
            }
            updateData.roleId = roleDoc._id;
            updateData.role = roleDoc.slug;
        }
        if (status) updateData.status = status;

        const user = await User.findByIdAndUpdate(id, updateData, { new: true })
            .select('-passwordHash')
            .populate('roleId', 'name slug permissions');
        res.status(200).json({ user });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    List the students currently assigned to a lecturer (any user who has that
//          lecturer's _id in their own User.assignedLecturers array)
// @route   GET /api/v1/admin/users/:id/students
exports.getLecturerStudents = async (req, res) => {
    try {
        const students = await User.find({ assignedLecturers: req.params.id })
            .select('fullName email')
            .sort({ fullName: 1 });
        res.status(200).json({ students });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Full-array-replace of which students are assigned to a lecturer - adds this
//          lecturer's _id to every newly-included student's assignedLecturers and pulls it
//          from anyone no longer in the list, rather than touching a roster field on the
//          lecturer's own document (a student can belong to more than one lecturer).
// @route   PATCH /api/v1/admin/users/:id/students
exports.updateLecturerStudents = async (req, res) => {
    try {
        const { id } = req.params;
        const { studentIds } = req.body;
        if (!Array.isArray(studentIds)) {
            return res.status(400).json({ message: 'studentIds must be an array.' });
        }

        await User.updateMany(
            { assignedLecturers: id, _id: { $nin: studentIds } },
            { $pull: { assignedLecturers: id } }
        );
        await User.updateMany(
            { _id: { $in: studentIds } },
            { $addToSet: { assignedLecturers: id } }
        );

        const students = await User.find({ assignedLecturers: id })
            .select('fullName email')
            .sort({ fullName: 1 });
        res.status(200).json({ students });
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
