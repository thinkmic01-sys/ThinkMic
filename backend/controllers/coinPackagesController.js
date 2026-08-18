const CoinPackage = require('../models/CoinPackage');

// @desc    Active coin packages, cheapest first - what CoinPackagesModal.jsx shows when a
//          user clicks their coin balance in the Navbar.
// @route   GET /api/v1/coin-packages
// @access  Private (any authenticated user)
exports.listActiveCoinPackages = async (req, res) => {
    try {
        const coinPackages = await CoinPackage.find({ isActive: true }).sort({ priceUSD: 1 });
        res.status(200).json({ coinPackages });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Every coin package (active and inactive) for the admin management page
// @route   GET /api/v1/admin/coin-packages
// @access  Private (packages.manage)
exports.listAllCoinPackages = async (req, res) => {
    try {
        const coinPackages = await CoinPackage.find().sort({ priceUSD: 1 });
        res.status(200).json({ coinPackages });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

const validateCoinPackageFields = (body, { partial = false } = {}) => {
    const numericFields = ['coins', 'priceUSD'];
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

// @desc    Create a new coin package
// @route   POST /api/v1/admin/coin-packages
// @access  Private (packages.manage)
exports.createCoinPackage = async (req, res) => {
    try {
        const error = validateCoinPackageFields(req.body);
        if (error) return res.status(400).json({ message: error });

        const coinPackage = await CoinPackage.create({
            name: req.body.name.trim(),
            description: (req.body.description || '').trim(),
            coins: Number(req.body.coins),
            priceUSD: Number(req.body.priceUSD),
            isActive: req.body.isActive !== undefined ? !!req.body.isActive : true,
            createdBy: req.user._id
        });

        res.status(201).json({ coinPackage });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Update a coin package (any subset of fields, including toggling isActive)
// @route   PATCH /api/v1/admin/coin-packages/:id
// @access  Private (packages.manage)
exports.updateCoinPackage = async (req, res) => {
    try {
        const error = validateCoinPackageFields(req.body, { partial: true });
        if (error) return res.status(400).json({ message: error });

        const update = {};
        if (req.body.name !== undefined) update.name = req.body.name.trim();
        if (req.body.description !== undefined) update.description = req.body.description.trim();
        if (req.body.coins !== undefined) update.coins = Number(req.body.coins);
        if (req.body.priceUSD !== undefined) update.priceUSD = Number(req.body.priceUSD);
        if (req.body.isActive !== undefined) update.isActive = !!req.body.isActive;

        const coinPackage = await CoinPackage.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
        if (!coinPackage) return res.status(404).json({ message: 'Coin package not found' });

        res.status(200).json({ coinPackage });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Delete a coin package
// @route   DELETE /api/v1/admin/coin-packages/:id
// @access  Private (packages.manage)
exports.deleteCoinPackage = async (req, res) => {
    try {
        const coinPackage = await CoinPackage.findByIdAndDelete(req.params.id);
        if (!coinPackage) return res.status(404).json({ message: 'Coin package not found' });
        res.status(200).json({ message: 'Coin package deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
