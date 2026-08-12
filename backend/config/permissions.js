// Single source of truth for every permission key the app enforces. Both
// checkPermission() (backend/middleware/authMiddleware.js) and the Roles &
// Permissions admin page (frontend) read from this list - add a new capability
// here first, then gate the route/UI with its key, rather than inventing ad-hoc
// strings at each call site.
const PERMISSIONS = [
    { key: 'users.view', label: 'View Users', category: 'User Management', description: 'List and search all users' },
    { key: 'users.invite', label: 'Invite Users', category: 'User Management', description: 'Send new user invitations' },
    { key: 'users.manage_role_status', label: 'Manage Role & Status', category: 'User Management', description: 'Change a user\'s role, deactivate, or restore their account' },
    { key: 'users.delete', label: 'Delete Users', category: 'User Management', description: 'Permanently delete a user account' },
    { key: 'users.view_full_profile', label: 'View Full Profile', category: 'User Management', description: 'View a user\'s recordings, reports, notes, seminars, coins, and support history' },
    { key: 'roles.manage', label: 'Manage Roles', category: 'Roles & Permissions', description: 'Create, edit, and delete custom roles, and assign roles to users' },
    { key: 'rewards.manage_settings', label: 'Manage Reward Settings', category: 'Rewards & Coins', description: 'Configure L1/L2/L3 referral coin amounts' },
    { key: 'rewards.manage_pending', label: 'Manage Pending Rewards', category: 'Rewards & Coins', description: 'List and update pending referral rewards' },
    { key: 'rewards.approve_reject', label: 'Approve/Reject Rewards', category: 'Rewards & Coins', description: 'Approve or reject pending referral rewards' },
    { key: 'rewards.view_history_stats', label: 'View Reward History & Stats', category: 'Rewards & Coins', description: 'View reward approval history and statistics' },
    { key: 'rewards.adjust_coins', label: 'Adjust User Coins', category: 'Rewards & Coins', description: 'Manually credit or debit a user\'s coin balance' },
    { key: 'schemas.manage', label: 'Manage Schema Builder', category: 'Schema Builder', description: 'Create, edit, and publish dynamic form schemas' },
    { key: 'support.manage_all', label: 'Manage Support Inbox', category: 'Support', description: 'View and respond to every user\'s support tickets' },
    { key: 'analytics.view', label: 'View Analytics', category: 'Analytics', description: 'View submission and platform analytics' },
    { key: 'submissions.view_all', label: 'View All Submissions', category: 'Submissions', description: 'List and view every user\'s form submissions' },
    { key: 'exports.access', label: 'Access Exports', category: 'Exports', description: 'Access data export endpoints' }
];

const PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);

const ALL_PERMISSION_KEYS = [...PERMISSION_KEYS];

// Matches today's hardcoded checkRole('manager', 'admin') gates
const MANAGER_PERMISSION_KEYS = [
    'support.manage_all',
    'analytics.view',
    'submissions.view_all',
    'exports.access'
];

module.exports = { PERMISSIONS, PERMISSION_KEYS, ALL_PERMISSION_KEYS, MANAGER_PERMISSION_KEYS };
