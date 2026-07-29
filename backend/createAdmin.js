require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/thinkmic')
  .then(async () => {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('admin', salt);
    
    // Check if admin exists
    const existing = await User.findOne({ email: 'admin@gmail.com' });
    if (existing) {
        existing.passwordHash = passwordHash;
        existing.role = 'admin';
        await existing.save();
        console.log('Admin updated');
    } else {
        await User.create({
            fullName: 'Admin User',
            email: 'admin@gmail.com',
            passwordHash,
            role: 'admin',
            referralCode: 'admin_ref_001',
            status: 'active'
        });
        console.log('Admin created');
    }
    process.exit(0);
  })
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
