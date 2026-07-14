const CollaborationSubmission = require('../models/CollaborationSubmission');
const Referral = require('../models/Referral');

exports.getReferralDashboard = async (req, res) => {
    try {
        const referrals = await Referral.find({ referrerId: req.user.id }).sort({ createdAt: -1 });
        
        let pending = 0;
        let earned = 0;
        let converted = 0;

        referrals.forEach(r => {
            if (r.status === 'Invited') pending += r.rewards || 0; // Or standard 0
            if (r.status !== 'Invited') {
                earned += r.rewards;
                converted += 1;
            }
        });

        const conversion = referrals.length > 0 ? ((converted / referrals.length) * 100).toFixed(1) : 0;

        res.status(200).json({
            stats: {
                total: referrals.length,
                pending,
                earned,
                conversion
            },
            recent: referrals.slice(0, 5) // Last 5
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getSubmissions = async (req, res) => {
    try {
        const submissions = await CollaborationSubmission.find({ userId: req.user.id }).sort({ updatedAt: -1 });
        res.status(200).json(submissions);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.createSubmission = async (req, res) => {
    try {
        const newSubmission = new CollaborationSubmission({
            userId: req.user.id,
            researcherName: req.body.researcherName,
            category: req.body.category,
            submissionId: req.body.submissionId,
            summary: req.body.summary,
            dataSources: req.body.dataSources,
            status: req.body.status || 'draft'
        });
        const savedSubmission = await newSubmission.save();
        res.status(201).json(savedSubmission);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateSubmission = async (req, res) => {
    try {
        const updatedSubmission = await CollaborationSubmission.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id },
            { $set: req.body },
            { new: true }
        );
        if (!updatedSubmission) {
            return res.status(404).json({ message: 'Submission not found or unauthorized' });
        }
        res.status(200).json(updatedSubmission);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
