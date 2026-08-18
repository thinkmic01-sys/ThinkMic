const Package = require('../models/Package');

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
        res.status(200).json({ message: 'Package deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
