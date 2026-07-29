require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/thinkmic_v2')
  .then(async () => {
    // Check if admin exists
    const existing = await User.findOne({ email: 'admin@gmail.com' });
    if (existing) {
        existing.passwordHash = 'admin'; // Pass unhashed, mongoose pre-save will hash it
        existing.role = 'admin';
        await existing.save();
        console.log('Admin password fixed');
    } else {
        await User.create({
            fullName: 'Admin User',
            email: 'admin@gmail.com',
            passwordHash: 'admin', // Pass unhashed, mongoose pre-save will hash it
            role: 'admin',
            referralCode: 'admin_ref_001',
            status: 'active'
        });
        console.log('Admin created correctly');
    }
    process.exit(0);
  })
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
