const FieldSchema = require('../models/FieldSchema');

exports.listSchemas = async (req, res) => {
    try {
        const { status } = req.query;
        const query = {};
        if (status) query.status = status;

        // Use aggregation to join the count of submissions for each schema
        const schemas = await FieldSchema.aggregate([
            { $match: query },
            { $sort: { createdAt: -1 } },
            {
                $lookup: {
                    from: 'submissions', // The collection name for the Submission model
                    localField: '_id',
                    foreignField: 'schemaId',
                    as: 'submissionsList'
                }
            },
            {
                $addFields: {
                    submissions: { $size: "$submissionsList" }
                }
            },
            {
                $project: {
                    submissionsList: 0 // Remove the joined array, we only need the count
                }
            }
        ]);
        
        res.status(200).json({ schemas });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.getSchema = async (req, res) => {
    try {
        const schema = await FieldSchema.findById(req.params.id);
        if (!schema) return res.status(404).json({ message: 'Schema not found' });
        res.status(200).json({ schema });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.createSchema = async (req, res) => {
    try {
        const { name, description, targetRole, fields } = req.body;
        
        const schema = await FieldSchema.create({
            createdBy: req.user._id,
            name,
            description,
            targetRole,
            fields,
            status: 'draft'
        });

        res.status(201).json({ schema });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.updateSchema = async (req, res) => {
    try {
        const { id } = req.params;
        const schema = await FieldSchema.findOneAndUpdate(
            { _id: id, status: 'draft' }, // Only drafts can be updated this way
            req.body,
            { new: true }
        );

        if (!schema) {
            return res.status(404).json({ message: 'Draft schema not found or already published' });
        }

        res.status(200).json({ schema });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.publishSchema = async (req, res) => {
    try {
        const { id } = req.params;
        const schema = await FieldSchema.findByIdAndUpdate(
            id,
            { status: 'active', $inc: { version: 1 } },
            { new: true }
        );

        if (!schema) return res.status(404).json({ message: 'Schema not found' });
        
        res.status(200).json({ schema, version: schema.version });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.listPublishedForms = async (req, res) => {
    try {
        // Users only see active forms targeted at 'all' or at their own professional Title
        // (case-insensitive, since Title is free text with no enforced casing).
        const userTitle = (req.user.title || '').trim();
        const orConditions = [{ targetRole: 'all' }];
        if (userTitle) {
            const escapedTitle = userTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            orConditions.push({ targetRole: { $regex: `^${escapedTitle}$`, $options: 'i' } });
        }

        const forms = await FieldSchema.find({
            status: 'active',
            $or: orConditions
        }).sort({ createdAt: -1 });

        res.status(200).json({ forms });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
