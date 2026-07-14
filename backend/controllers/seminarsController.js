const Seminar = require('../models/Seminar');
const Registration = require('../models/Registration');

exports.getSeminars = async (req, res) => {
    try {
        const query = {
            $or: [
                { status: { $ne: 'draft' } },
                { status: 'draft', hostId: req.user.id }
            ]
        };
        const seminars = await Seminar.find(query).sort({ date: 1, startTime: 1 });
        res.status(200).json(seminars);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.createSeminar = async (req, res) => {
    try {
        const newSeminar = new Seminar({
            hostId: req.user.id,
            hostName: req.body.hostName,
            hostImageUrl: req.body.hostImageUrl,
            title: req.body.title,
            abstract: req.body.abstract,
            category: req.body.category,
            tags: req.body.tags ? String(req.body.tags).split(',').map(tag => tag.trim()).filter(t => t !== '') : [],
            imageUrl: req.body.imageUrl,
            location: req.body.location,
            date: req.body.date,
            startTime: req.body.startTime,
            endTime: req.body.endTime,
            format: req.body.format,
            status: req.body.status || 'scheduled'
        });
        const savedSeminar = await newSeminar.save();
        res.status(201).json(savedSeminar);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateSeminar = async (req, res) => {
    try {
        const updatedSeminar = await Seminar.findOneAndUpdate(
            { _id: req.params.id, hostId: req.user.id },
            { $set: req.body },
            { new: true }
        );
        if (!updatedSeminar) {
            return res.status(404).json({ message: 'Seminar not found or unauthorized' });
        }
        res.status(200).json(updatedSeminar);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.deleteSeminar = async (req, res) => {
    try {
        const seminar = await Seminar.findOneAndDelete({ _id: req.params.id, hostId: req.user.id });
        if (!seminar) {
            return res.status(404).json({ message: 'Seminar not found or unauthorized' });
        }
        res.status(204).send();
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.registerForSeminar = async (req, res) => {
    try {
        const seminarId = req.params.id;
        const userId = req.user.id;

        const seminar = await Seminar.findById(seminarId);
        if (!seminar) return res.status(404).json({ message: 'Seminar not found' });

        const existing = await Registration.findOne({ userId, seminarId });
        if (existing) return res.status(400).json({ message: 'Already registered' });

        const registration = await Registration.create({ userId, seminarId });
        res.status(201).json(registration);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getRegistrations = async (req, res) => {
    try {
        const registrations = await Registration.find({ userId: req.user.id });
        res.status(200).json(registrations);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
