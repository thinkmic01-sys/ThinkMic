const Role = require('../models/Role');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { PERMISSIONS } = require('../config/permissions');

// @desc    The fixed permission catalog - backs the checklist UI on the Roles page
// @route   GET /api/v1/admin/roles/catalog
exports.getPermissionCatalog = async (req, res) => {
    res.status(200).json({ permissions: PERMISSIONS });
};

// @desc    List every role (system + custom) with a live count of assigned users
// @route   GET /api/v1/admin/roles
exports.listRoles = async (req, res) => {
    try {
        const roles = await Role.find({}).sort({ isSystem: -1, name: 1 });
        const counts = await User.aggregate([
            { $match: { roleId: { $exists: true, $ne: null } } },
            { $group: { _id: '$roleId', count: { $sum: 1 } } }
        ]);
        const countByRoleId = Object.fromEntries(counts.map((c) => [c._id.toString(), c.count]));
        const rolesWithCounts = roles.map((r) => ({ ...r.toObject(), userCount: countByRoleId[r._id.toString()] || 0 }));
        res.status(200).json({ roles: rolesWithCounts });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Create a custom role
// @route   POST /api/v1/admin/roles
exports.createRole = async (req, res) => {
    try {
        const { name, description, permissions } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Role name is required.' });
        }

        const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-+|-+$)/g, '');
        if (!slug) {
            return res.status(400).json({ message: 'Role name must contain at least one letter or number.' });
        }

        const role = await Role.create({
            name: name.trim(),
            slug,
            description: description || '',
            permissions: Array.isArray(permissions) ? permissions : [],
            isSystem: false,
            createdBy: req.user._id
        });

        await AuditLog.create({
            actorId: req.user._id,
            actorRole: req.user.role,
            action: 'role_created',
            targetId: role._id,
            targetType: 'Role',
            metadata: { name: role.name, permissions: role.permissions }
        });

        res.status(201).json({ role });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'A role with this name already exists.' });
        }
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Edit a role's name/description/permissions - only the Admin role is protected
//          (it's the safety rail guaranteeing a known-good full-access role always exists);
//          Manager/User, despite being seeded system roles, are editable like any custom one.
// @route   PATCH /api/v1/admin/roles/:id
exports.updateRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, permissions } = req.body;

        const role = await Role.findById(id);
        if (!role) {
            return res.status(404).json({ message: 'Role not found.' });
        }
        if (role.slug === 'admin') {
            return res.status(400).json({ message: 'The Admin role cannot be edited.' });
        }

        const before = { name: role.name, permissions: role.permissions };
        if (name !== undefined && name.trim()) role.name = name.trim();
        if (description !== undefined) role.description = description;
        if (Array.isArray(permissions)) role.permissions = permissions;
        await role.save();

        await AuditLog.create({
            actorId: req.user._id,
            actorRole: req.user.role,
            action: 'role_updated',
            targetId: role._id,
            targetType: 'Role',
            metadata: { before, after: { name: role.name, permissions: role.permissions } }
        });

        res.status(200).json({ role });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Delete a role - blocked only for the Admin role and roles still assigned to users
// @route   DELETE /api/v1/admin/roles/:id
exports.deleteRole = async (req, res) => {
    try {
        const { id } = req.params;
        const role = await Role.findById(id);
        if (!role) {
            return res.status(404).json({ message: 'Role not found.' });
        }
        if (role.slug === 'admin') {
            return res.status(400).json({ message: 'The Admin role cannot be deleted.' });
        }

        const assignedCount = await User.countDocuments({ roleId: role._id });
        if (assignedCount > 0) {
            return res.status(400).json({ message: `Cannot delete - ${assignedCount} user(s) still have this role. Reassign them first.` });
        }

        await Role.deleteOne({ _id: id });

        await AuditLog.create({
            actorId: req.user._id,
            actorRole: req.user.role,
            action: 'role_deleted',
            targetId: role._id,
            targetType: 'Role',
            metadata: { name: role.name }
        });

        res.status(200).json({ message: 'Role deleted.' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
