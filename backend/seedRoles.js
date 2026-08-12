// One-time migration: seeds the 3 system roles (Admin/Manager/User) and backfills
// User.roleId for every existing user to match their current User.role string.
// Idempotent - safe to re-run (system roles are upserted by slug, users already
// carrying a roleId are left untouched).
//
// Run with: node seedRoles.js
require('dotenv').config();
const mongoose = require('mongoose');
const Role = require('./models/Role');
const User = require('./models/User');
const { ALL_PERMISSION_KEYS, MANAGER_PERMISSION_KEYS } = require('./config/permissions');

const SYSTEM_ROLES = [
    { name: 'Admin', slug: 'admin', description: 'Full platform access.', permissions: ALL_PERMISSION_KEYS, isSystem: true },
    { name: 'Manager', slug: 'manager', description: 'Support, analytics, submissions, and export access.', permissions: MANAGER_PERMISSION_KEYS, isSystem: true },
    { name: 'User', slug: 'user', description: 'Standard platform access, no admin permissions.', permissions: [], isSystem: true }
];

(async () => {
    await mongoose.connect(process.env.DB_URI);
    console.log('Connected to MongoDB.');

    const roleBySlug = {};
    for (const roleDef of SYSTEM_ROLES) {
        const role = await Role.findOneAndUpdate(
            { slug: roleDef.slug },
            { $set: roleDef },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        roleBySlug[role.slug] = role;
        console.log(`Seeded system role "${role.name}" (${role.permissions.length} permissions).`);
    }

    const users = await User.find({ roleId: { $exists: false } }).select('_id role');
    console.log(`Backfilling roleId for ${users.length} user(s)...`);
    let migrated = 0;
    let skipped = 0;
    for (const user of users) {
        const role = roleBySlug[user.role] || roleBySlug.user;
        if (!role) { skipped++; continue; }
        await User.updateOne({ _id: user._id }, { $set: { roleId: role._id, role: role.slug } });
        migrated++;
    }
    console.log(`Migrated ${migrated} user(s), skipped ${skipped}.`);

    await mongoose.disconnect();
    console.log('Done.');
})().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});
