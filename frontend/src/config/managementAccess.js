// Single source of truth for which permissions make someone an admin/manager-style user
// (as opposed to a regular product user who merely holds one narrow extra permission, e.g.
// a Lecturer with only schemas.manage_own) - used by both Sidebar.jsx (which pages to show)
// and App.jsx (which Dashboard variant to render). Keep this in sync with the actual
// Management pages/routes under /app/admin/*.
export const MANAGEMENT_PAGES = [
    { to: '/app/admin/users', icon: 'group', label: 'Users', permissions: ['users.view'] },
    { to: '/app/admin/roles', icon: 'shield_person', label: 'Roles', permissions: ['roles.manage'] },
    { to: '/app/admin/schemas', icon: 'dynamic_form', label: 'Schemas', permissions: ['schemas.manage'] },
    {
        to: '/app/admin/rewards', icon: 'redeem', label: 'Rewards', permissions: [
            'rewards.manage_settings', 'rewards.manage_pending', 'rewards.approve_reject',
            'rewards.view_history_stats', 'rewards.adjust_coins'
        ]
    },
    { to: '/app/admin/keywords', icon: 'sell', label: 'Keywords', permissions: ['keywords.manage'] }
];

export const isManagementUser = (permissions = []) =>
    MANAGEMENT_PAGES.some((page) => page.permissions.some((perm) => permissions.includes(perm)));
