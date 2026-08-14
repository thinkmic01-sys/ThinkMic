const mongoose = require('mongoose');
const Project = require('../models/Project');
const Recording = require('../models/Recording');
const Report = require('../models/Report');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Keyword = require('../models/Keyword');
const coinWalletService = require('../services/coinWalletService');
const socket = require('../utils/socket');

exports.listProjects = async (req, res) => {
    try {
        const projects = await Project.find({ userId: req.user._id }).sort({ updatedAt: -1 });
        
        // Also fetch counts of recordings and reports per project
        const projectIds = projects.map(p => p._id);
        
        // Aggregate recordings count
        const recordingsCount = await Recording.aggregate([
            { $match: { projectId: { $in: projectIds } } },
            { $group: { _id: "$projectId", count: { $sum: 1 } } }
        ]);

        // Aggregate reports count
        const reportsCount = await Report.aggregate([
            { $match: { projectId: { $in: projectIds } } },
            { $group: { _id: "$projectId", count: { $sum: 1 } } }
        ]);

        const countsMap = {};
        recordingsCount.forEach(r => { countsMap[r._id.toString()] = { recordings: r.count, reports: 0 }; });
        reportsCount.forEach(r => { 
            if (!countsMap[r._id.toString()]) countsMap[r._id.toString()] = { recordings: 0, reports: 0 };
            countsMap[r._id.toString()].reports = r.count;
        });

        const formattedProjects = projects.map(p => ({
            id: p._id,
            name: p.name,
            description: p.description,
            updatedAt: p.updatedAt,
            counts: countsMap[p._id.toString()] || { recordings: 0, reports: 0 }
        }));

        res.status(200).json({ projects: formattedProjects });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.createProject = async (req, res) => {
    try {
        const { name, description, keywords } = req.body;

        // Required, but only enforceable once at least one keyword actually exists to pick
        // from - mirrors the same exception ProjectsList.jsx's client-side check makes.
        if (!Array.isArray(keywords) || keywords.length === 0) {
            const anyKeywordExists = await Keyword.exists({});
            if (anyKeywordExists) {
                return res.status(400).json({ message: 'Select at least one keyword.' });
            }
        }

        const project = new Project({
            userId: req.user._id,
            name: name || 'Untitled Project',
            description: description || '',
            keywords: Array.isArray(keywords) ? keywords : []
        });
        await project.save();
        res.status(201).json({ project });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get a project - the owner (or an unlocked buyer) gets the full response
//          (project + recordings + reports); anyone else only gets it at all if the project
//          is shared, and then only a locked preview (name/description/price/owner/
//          keywords, no recordings/reports) with locked:true, pointing them at
//          POST /projects/:id/unlock. Not shared and not the owner -> 404, same as before.
// @route   GET /api/v1/projects/:id
exports.getProject = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id)
            .populate('keywords', 'text')
            .populate('userId', 'fullName');
        if (!project) return res.status(404).json({ message: 'Project not found' });

        const isOwner = project.userId._id.toString() === req.user._id.toString();
        if (!isOwner && !project.isShared) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const hasUnlocked = isOwner || project.unlockedBy.some((id) => id.toString() === req.user._id.toString());
        if (!hasUnlocked) {
            return res.status(200).json({
                locked: true,
                project: {
                    _id: project._id,
                    name: project.name,
                    description: project.description,
                    keywords: project.keywords,
                    sharePriceCoins: project.sharePriceCoins,
                    ownerName: project.userId.fullName
                }
            });
        }

        const recordings = await Recording.find({ projectId: project._id }).select('title status createdAt durationSeconds').sort({ createdAt: -1 });
        const reports = await Report.find({ projectId: project._id }).select('title status createdAt').sort({ createdAt: -1 });

        res.status(200).json({
            locked: false,
            project,
            recordings,
            reports
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Turn on sharing for a project the caller owns, at a coin price they set
// @route   POST /api/v1/projects/:id/share
exports.shareProject = async (req, res) => {
    try {
        const priceCoins = Number(req.body.priceCoins);
        if (!Number.isFinite(priceCoins) || priceCoins < 1) {
            return res.status(400).json({ message: 'priceCoins must be a positive number.' });
        }

        const project = await Project.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            { $set: { isShared: true, sharePriceCoins: Math.round(priceCoins), sharedAt: new Date() } },
            { new: true }
        ).populate('keywords', 'text');
        if (!project) return res.status(404).json({ message: 'Project not found' });

        res.status(200).json({ project });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Turn off sharing - already-unlocked users keep their access, no new unlocks/listing
// @route   POST /api/v1/projects/:id/unshare
exports.unshareProject = async (req, res) => {
    try {
        const project = await Project.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            { $set: { isShared: false } },
            { new: true }
        );
        if (!project) return res.status(404).json({ message: 'Project not found' });

        res.status(200).json({ project });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Shared projects that match one of the caller's followed keywords (My Learning
//          List) - not their own projects, each flagged with whether they've already paid
//          to unlock it.
// @route   GET /api/v1/projects/shared
exports.getSharedProjectsForMe = async (req, res) => {
    try {
        const me = await User.findById(req.user._id).select('learningKeywords');
        const keywordIds = me.learningKeywords || [];
        if (keywordIds.length === 0) {
            return res.status(200).json({ projects: [] });
        }

        const projects = await Project.find({
            isShared: true,
            userId: { $ne: req.user._id },
            keywords: { $in: keywordIds }
        })
            .select('name description keywords sharePriceCoins sharedAt userId unlockedBy')
            .populate('keywords', 'text')
            .populate('userId', 'fullName')
            .sort({ sharedAt: -1 });

        const shaped = projects.map((p) => ({
            _id: p._id,
            name: p.name,
            description: p.description,
            keywords: p.keywords,
            sharePriceCoins: p.sharePriceCoins,
            ownerName: p.userId.fullName,
            hasUnlocked: p.unlockedBy.some((id) => id.toString() === req.user._id.toString())
        }));

        res.status(200).json({ projects: shaped });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Pay a shared project's coin price to unlock full access to it. Idempotent - if
//          already unlocked, returns success without charging again.
// @route   POST /api/v1/projects/:id/unlock
exports.unlockProject = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project || !project.isShared) return res.status(404).json({ message: 'Project not found' });

        if (project.userId.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: 'You already own this project.' });
        }
        if (project.unlockedBy.some((id) => id.toString() === req.user._id.toString())) {
            return res.status(200).json({ message: 'Already unlocked.', alreadyUnlocked: true });
        }

        const session = await mongoose.startSession();
        try {
            await session.withTransaction(async () => {
                await coinWalletService.debitCoins(req.user._id, project.sharePriceCoins, {
                    type: 'project_unlock_paid',
                    action: `Unlocked project "${project.name}"`,
                    relatedUserId: project.userId,
                    relatedEntityType: 'Project',
                    relatedEntityId: project._id,
                    actorId: req.user._id,
                    actorRole: req.user.role,
                    auditAction: 'project_unlock_paid'
                }, session);

                await coinWalletService.creditCoins(project.userId, project.sharePriceCoins, {
                    type: 'project_unlock_received',
                    action: `Someone unlocked your project "${project.name}"`,
                    relatedUserId: req.user._id,
                    relatedEntityType: 'Project',
                    relatedEntityId: project._id,
                    actorId: req.user._id,
                    actorRole: req.user.role,
                    auditAction: 'project_unlock_received'
                }, session);

                await Project.updateOne({ _id: project._id }, { $addToSet: { unlockedBy: req.user._id } }, { session });

                await Notification.create([{
                    userId: project.userId,
                    type: 'project_unlocked',
                    message: `${req.user.fullName} paid ${project.sharePriceCoins} coins to unlock your project "${project.name}".`,
                    link: `/app/projects/${project._id}`
                }], { session });
            });
        } finally {
            session.endSession();
        }

        try {
            const io = socket.getIO();
            io.to(project.userId.toString()).emit('new_notification', {
                notification: { type: 'project_unlocked', message: `Someone unlocked your project "${project.name}"!` }
            });
        } catch (notifyError) {
            console.error('Failed to push project_unlocked notification:', notifyError);
        }

        res.status(200).json({ message: 'Project unlocked.', alreadyUnlocked: false });
    } catch (error) {
        if (error instanceof coinWalletService.InsufficientBalanceError) {
            return res.status(400).json({ message: 'Insufficient coin balance to unlock this project.' });
        }
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.updateProject = async (req, res) => {
    try {
        const { name, description, notesHtml } = req.body;
        const project = await Project.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            { $set: { name, description, notesHtml } },
            { new: true }
        );
        if (!project) return res.status(404).json({ message: 'Project not found' });
        res.status(200).json({ project });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.deleteProject = async (req, res) => {
    try {
        const project = await Project.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
        if (!project) return res.status(404).json({ message: 'Project not found' });
        // NOTE: We could optionally cascade delete or nullify recordings/reports here
        await Recording.updateMany({ projectId: project._id }, { $unset: { projectId: "" } });
        await Report.updateMany({ projectId: project._id }, { $unset: { projectId: "" } });
        res.status(200).json({ message: 'Project deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
