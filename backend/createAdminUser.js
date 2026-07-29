require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect(process.env.DB_URI)
  .then(async () => {
    await User.deleteOne({ email: 'admin@gmail.com' });
    await User.create({
        fullName: 'Admin User',
        email: 'admin@gmail.com',
        passwordHash: 'admin', 
        role: 'admin',
        referralCode: 'admin_ref_001',
        status: 'active'
    });
    console.log('Admin created correctly in thinkmic_dev');
    process.exit(0);
  })
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
