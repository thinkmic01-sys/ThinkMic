const FieldSchema = require('../models/FieldSchema');
const User = require('../models/User');
const Notification = require('../models/Notification');
const socket = require('../utils/socket');

// A caller with the blanket schemas.manage permission sees every schema; anyone with only
// schemas.manage_own (e.g. a Lecturer) is restricted to schemas they created themselves.
const scopeToOwnSchemas = (req) => !req.user.permissions.includes('schemas.manage') && req.user.permissions.includes('schemas.manage_own');

exports.listSchemas = async (req, res) => {
    try {
        const { status } = req.query;
        const query = {};
        if (status) query.status = status;
        if (scopeToOwnSchemas(req)) query.createdBy = req.user._id;

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
        if (scopeToOwnSchemas(req) && schema.createdBy.toString() !== req.user._id.toString()) {
            return res.status(404).json({ message: 'Schema not found' });
        }
        res.status(200).json({ schema });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.createSchema = async (req, res) => {
    try {
        const { name, description, targetRole, fields } = req.body;

        // Anyone without the blanket schemas.manage permission (e.g. a Lecturer with only
        // schemas.manage_own) can't pick an audience - their forms always target their own
        // assigned students, ignoring whatever targetRole the client sent.
        const resolvedTargetRole = scopeToOwnSchemas(req) ? 'own-students' : targetRole;

        const schema = await FieldSchema.create({
            createdBy: req.user._id,
            name,
            description,
            targetRole: resolvedTargetRole,
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
        const findQuery = { _id: id, status: 'draft' }; // Only drafts can be updated this way
        if (scopeToOwnSchemas(req)) findQuery.createdBy = req.user._id;

        const updateBody = { ...req.body };
        if (scopeToOwnSchemas(req)) updateBody.targetRole = 'own-students';

        const schema = await FieldSchema.findOneAndUpdate(
            findQuery,
            updateBody,
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
        const findQuery = { _id: id };
        if (scopeToOwnSchemas(req)) findQuery.createdBy = req.user._id;

        const schema = await FieldSchema.findOneAndUpdate(
            findQuery,
            { status: 'active', $inc: { version: 1 } },
            { new: true }
        );

        if (!schema) return res.status(404).json({ message: 'Schema not found' });

        res.status(200).json({ schema, version: schema.version });

        // Notify every user this form is targeted at: 'all', a lecturer's own assigned
        // students ('own-students'), or their Title matched case-insensitively.
        try {
            let userQuery;
            if (schema.targetRole === 'all') {
                userQuery = {};
            } else if (schema.targetRole === 'own-students') {
                userQuery = { assignedLecturers: schema.createdBy };
            } else {
                userQuery = { title: { $regex: `^${schema.targetRole.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } };
            }
            const recipients = await User.find(userQuery).select('_id');

            if (recipients.length > 0) {
                const notifDocs = await Notification.insertMany(recipients.map((u) => ({
                    userId: u._id,
                    type: 'form_published',
                    message: `A new form "${schema.name}" is available for you to fill out.`,
                    link: '/app/forms'
                })));

                const io = socket.getIO();
                recipients.forEach((u, i) => {
                    io.to(u._id.toString()).emit('new_notification', { notification: notifDocs[i] });
                });
            }
        } catch (notifyError) {
            // The schema is already published and the response already sent - a notification
            // failure here shouldn't be reported as a publish failure to the admin.
            console.error('Failed to notify users of published schema:', notifyError);
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.listPublishedForms = async (req, res) => {
    try {
        // Users only see active forms targeted at 'all', at their own professional Title
        // (case-insensitive, since Title is free text with no enforced casing), or - for
        // lecturer-owned forms - forms whose creator is one of this user's assignedLecturers.
        const userTitle = (req.user.title || '').trim();
        const orConditions = [{ targetRole: 'all' }];
        if (userTitle) {
            const escapedTitle = userTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            orConditions.push({ targetRole: { $regex: `^${escapedTitle}$`, $options: 'i' } });
        }
        if (req.user.assignedLecturers && req.user.assignedLecturers.length > 0) {
            orConditions.push({ targetRole: 'own-students', createdBy: { $in: req.user.assignedLecturers } });
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
