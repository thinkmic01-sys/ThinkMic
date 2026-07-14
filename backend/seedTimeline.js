const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');
const TimelineEvent = require('./models/TimelineEvent');
const Transaction = require('./models/Transaction');

mongoose.connect(process.env.DB_URI).then(async () => {
    console.log("Connected to MongoDB.");

    // Find first user to attach events to
    const user = await User.findOne({ role: { $ne: 'admin' } });
    
    if (!user) {
        console.log("No user found.");
        process.exit();
    }

    console.log(`Seeding for user: ${user.email}`);

    await TimelineEvent.deleteMany({ userId: user._id });

    const timelineEvents = [
        {
            userId: user._id,
            type: 'Recording',
            title: 'Recording AI Ethics Lecture',
            description: "Capturing live audio from Professor Harrison's seminar on algorithmic bias. Processing real-time transcription and key entity extraction.",
            icon: 'mic',
            color: 'text-[#00c2cb]',
            borderColor: 'border-[#00c2cb]',
            isLive: true
        },
        {
            userId: user._id,
            type: 'Rewards',
            title: 'Milestone Achieved',
            description: 'Completed "Deep Learning Fundamentals" workbook.',
            icon: 'emoji_events',
            color: 'text-[#006e73]',
            borderColor: 'border-[#3edae3]',
            coinReward: '+500',
            isLive: false
        },
        {
            userId: user._id,
            type: 'Reports',
            title: 'Report Generated',
            description: 'Comprehensive literature review on Transformer architectures. Synthesized from 14 individual research papers and 3 seminar transcripts.',
            icon: 'description',
            color: 'text-[#222777]',
            borderColor: 'border-[#222777]',
            hasLink: true,
            isLive: false
        },
        {
            userId: user._id,
            type: 'Seminars',
            title: 'Seminar Synthesized',
            description: '"The Future of Generative Models" by Dr. Aris. Extracted 5 key themes and generated flashcards for review.',
            icon: 'record_voice_over',
            color: 'text-[#3f4378]',
            borderColor: 'border-[#3f4378]',
            isLive: false
        }
    ];

    await TimelineEvent.insertMany(timelineEvents);
    console.log("Timeline Events Seeded.");

    // Also give them some coins and lifetime coins for the leaderboard
    user.coins = 2350;
    user.lifetimeCoins = 4850;
    await user.save();
    console.log("User coins updated.");

    // Create a dummy second user for leaderboard comparison
    let user2 = await User.findOne({ email: 'scholar2@thinkmic.com' });
    if (!user2) {
        user2 = await User.create({
            email: 'scholar2@thinkmic.com',
            passwordHash: 'password', // raw password (will be hashed by pre save)
            fullName: 'Dr. Evelyn Carter',
            role: 'user',
            coins: 1000,
            lifetimeCoins: 5120
        });
        console.log("User 2 created for leaderboard.");
    } else {
        user2.lifetimeCoins = 5120;
        await user2.save();
    }

    process.exit();
}).catch(err => console.log(err));
