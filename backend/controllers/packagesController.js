const Package = require('../models/Package');
const User = require('../models/User');
const Notification = require('../models/Notification');
const socket = require('../utils/socket');

// @desc    Active packages, cheapest first - what the purchase-prompt dialog shows to any
//          authenticated user (Layout.jsx's PackagesPromptModal).
// @route   GET /api/v1/packages
// @access  Private (any authenticated user)
exports.listActivePackages = async (req, res) => {
    try {
        const packages = await Package.find({ isActive: true }).sort({ priceUSD: 1 });
        res.status(200).json({ packages });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Selects (or upgrades to) a package for the current user - no payment gateway is
//          wired up yet, so this simply assigns the package. Also re-arms the 80%-usage
//          warning for the newly selected package.
// @route   POST /api/v1/packages/:id/select
// @access  Private (any authenticated user)
exports.selectPackage = async (req, res) => {
    try {
        const pkg = await Package.findOne({ _id: req.params.id, isActive: true });
        if (!pkg) return res.status(404).json({ message: 'Package not found.' });

        await User.findByIdAndUpdate(req.user._id, {
            purchasedPackageId: pkg._id,
            usage80NotifiedForPackageId: null
        });

        res.status(200).json({ package: pkg });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Every package (active and inactive) for the admin management page
// @route   GET /api/v1/admin/packages
// @access  Private (packages.manage)
exports.listAllPackages = async (req, res) => {
    try {
        const packages = await Package.find().sort({ priceUSD: 1 });
        res.status(200).json({ packages });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

const validatePackageFields = (body, { partial = false } = {}) => {
    const numericFields = ['storageGB', 'transcriptionMinutes', 'searches', 'priceUSD'];
    for (const field of numericFields) {
        if (body[field] === undefined) {
            if (partial) continue;
            return `${field} is required`;
        }
        const value = Number(body[field]);
        if (!Number.isFinite(value) || value < 0) {
            return `${field} must be a non-negative number`;
        }
    }
    if (!partial && (!body.name || !body.name.trim())) {
        return 'name is required';
    }
    return null;
};

// @desc    Create a new package
// @route   POST /api/v1/admin/packages
// @access  Private (packages.manage)
exports.createPackage = async (req, res) => {
    try {
        const error = validatePackageFields(req.body);
        if (error) return res.status(400).json({ message: error });

        const pkg = await Package.create({
            name: req.body.name.trim(),
            description: (req.body.description || '').trim(),
            storageGB: Number(req.body.storageGB),
            transcriptionMinutes: Number(req.body.transcriptionMinutes),
            searches: Number(req.body.searches),
            priceUSD: Number(req.body.priceUSD),
            isActive: req.body.isActive !== undefined ? !!req.body.isActive : true,
            createdBy: req.user._id
        });

        res.status(201).json({ package: pkg });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Update a package (any subset of fields, including toggling isActive)
// @route   PATCH /api/v1/admin/packages/:id
// @access  Private (packages.manage)
exports.updatePackage = async (req, res) => {
    try {
        const error = validatePackageFields(req.body, { partial: true });
        if (error) return res.status(400).json({ message: error });

        const update = {};
        if (req.body.name !== undefined) update.name = req.body.name.trim();
        if (req.body.description !== undefined) update.description = req.body.description.trim();
        if (req.body.storageGB !== undefined) update.storageGB = Number(req.body.storageGB);
        if (req.body.transcriptionMinutes !== undefined) update.transcriptionMinutes = Number(req.body.transcriptionMinutes);
        if (req.body.searches !== undefined) update.searches = Number(req.body.searches);
        if (req.body.priceUSD !== undefined) update.priceUSD = Number(req.body.priceUSD);
        if (req.body.isActive !== undefined) update.isActive = !!req.body.isActive;

        const pkg = await Package.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
        if (!pkg) return res.status(404).json({ message: 'Package not found' });

        res.status(200).json({ package: pkg });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Delete a package
// @route   DELETE /api/v1/admin/packages/:id
// @access  Private (packages.manage)
exports.deletePackage = async (req, res) => {
    try {
        const pkg = await Package.findByIdAndDelete(req.params.id);
        if (!pkg) return res.status(404).json({ message: 'Package not found' });

        // Anyone who had this package selected would otherwise silently fall back to
        // "no package" with zero explanation (usageService.js's populate() already resolves
        // the now-dangling purchasedPackageId to null gracefully - this just makes the change
        // visible to the affected user and re-arms their mandatory selection prompt cleanly).
        const affectedUsers = await User.find({ purchasedPackageId: pkg._id }).select('_id');
        if (affectedUsers.length > 0) {
            const userIds = affectedUsers.map((u) => u._id);
            await User.updateMany(
                { _id: { $in: userIds } },
                { purchasedPackageId: null, usage80NotifiedForPackageId: null }
            );

            const notifDocs = await Notification.insertMany(userIds.map((id) => ({
                userId: id,
                type: 'package_removed',
                message: `Your package "${pkg.name}" was removed by an admin. Please select a new package to continue.`,
                link: '/app/dashboard'
            })));

            try {
                const io = socket.getIO();
                userIds.forEach((id, i) => io.to(id.toString()).emit('new_notification', { notification: notifDocs[i] }));
            } catch (err) {
                // Socket.io not initialized (e.g. a script/test context) - notifications are still saved.
            }
        }

        res.status(200).json({ message: 'Package deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
