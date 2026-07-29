const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const axios = require('axios');

router.get('/token', protect, async (req, res) => {
    try {
        if (!process.env.DEEPGRAM_API_KEY || process.env.DEEPGRAM_API_KEY === 'your_deepgram_api_key_here') {
            return res.json({ token: 'dummy_token_configure_deepgram' });
        }
        
        const headers = { 'Authorization': `Token ${process.env.DEEPGRAM_API_KEY}` };
        
        const projectsRes = await axios.get('https://api.deepgram.com/v1/projects', { headers });
        if (!projectsRes.data || !projectsRes.data.projects || projectsRes.data.projects.length === 0) {
            return res.status(500).json({ message: 'No Deepgram project found.' });
        }
        const projectId = projectsRes.data.projects[0].project_id;
        
        const keyRes = await axios.post(`https://api.deepgram.com/v1/projects/${projectId}/keys`, {
            comment: `Temporary key for user ${req.user.id}`,
            scopes: ['usage:write'],
            time_to_live_in_seconds: 3600 // 1 hour
        }, { headers });
        
        res.json({ token: keyRes.data.key });
    } catch (error) {
        if (error.response?.data?.category === 'INSUFFICIENT_PERMISSIONS') {
            console.warn('WARNING: Deepgram key has insufficient permissions to create temporary keys. Falling back to primary API key.');
            return res.json({ token: process.env.DEEPGRAM_API_KEY });
        }
        console.error('Deepgram token error:', error.response?.data || error.message);
        res.status(500).json({ message: 'Failed to generate Deepgram token' });
    }
});

module.exports = router;
