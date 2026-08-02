const Project = require('../models/Project');
const Recording = require('../models/Recording');
const Report = require('../models/Report');

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
        const { name, description } = req.body;
        const project = new Project({
            userId: req.user._id,
            name: name || 'Untitled Project',
            description: description || ''
        });
        await project.save();
        res.status(201).json({ project });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.getProject = async (req, res) => {
    try {
        const project = await Project.findOne({ _id: req.params.id, userId: req.user._id });
        if (!project) return res.status(404).json({ message: 'Project not found' });

        const recordings = await Recording.find({ projectId: project._id }).select('title status createdAt durationSeconds').sort({ createdAt: -1 });
        const reports = await Report.find({ projectId: project._id }).select('title status createdAt').sort({ createdAt: -1 });

        res.status(200).json({ 
            project, 
            recordings, 
            reports
        });
    } catch (error) {
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
