// Role configuration for the application
export const ROLES = {
  ADMIN: 'admin',
  BILLING: 'billing', // Dedicated billing role
  THERAPIST: 'therapist', // Actual therapists role
  ASSOCIATE: 'associate',
  VIEWER: 'viewer'
};

// User type for future distinction between therapists and billing
export const USER_TYPES = {
  BILLING: 'billing',
  THERAPIST: 'therapist',
  ADMIN: 'admin'
};

// Navigation configuration for each role
export const ROLE_NAVIGATION = {
  [ROLES.ADMIN]: [
    { id: 'my-clients', label: 'My Clients', path: '/my-clients' },
    { id: 'associates', label: 'Associates', path: '/associates' },
    { id: 'admin', label: 'Admin', path: '/admin' },
    { id: 'calendar', label: 'Calendar', path: '/calendar' },
    { id: 'forms', label: 'Clinical Forms', path: '/forms' }
  ],
  [ROLES.BILLING]: [
    { id: 'billing', label: 'Billing', path: '/billing' },
    { id: 'my-clients', label: 'My Clients', path: '/my-clients' },
    { id: 'associates', label: 'Associates', path: '/associates' },
    { id: 'calendar', label: 'Calendar', path: '/calendar' }
  ],
  [ROLES.THERAPIST]: [
    { id: 'my-clients', label: 'My Clients', path: '/my-clients' },
    { id: 'calendar', label: 'Calendar', path: '/calendar' }
  ],
  [ROLES.ASSOCIATE]: [
    { id: 'associates', label: 'Associates', path: '/associates' },
    { id: 'calendar', label: 'Calendar', path: '/calendar' }
  ],
  [ROLES.VIEWER]: [
    { id: 'associates', label: 'Associates', path: '/associates' },
    { id: 'calendar', label: 'Calendar', path: '/calendar' }
  ]
};

// Role display names (what users see)
export const ROLE_DISPLAY_NAMES = {
  [ROLES.ADMIN]: 'Administrator',
  [ROLES.BILLING]: 'Billing Specialist',
  [ROLES.THERAPIST]: 'Therapist',
  [ROLES.ASSOCIATE]: 'Associate',
  [ROLES.VIEWER]: 'Viewer'
};

// Helper function to get navigation items for a role
export const getNavigationForRole = (role) => {
  return ROLE_NAVIGATION[role] || ROLE_NAVIGATION[ROLES.VIEWER];
};

// Helper function to get display name for a role
export const getRoleDisplayName = (role) => {
  return ROLE_DISPLAY_NAMES[role] || 'Unknown';
};

// Helper function to check if user is billing
export const isBillingUser = (user) => {
  return user?.role === ROLES.BILLING;
};

// Helper function to check if user is therapist
export const isTherapistUser = (user) => {
  return user?.role === ROLES.THERAPIST;
};

// Helper function to check if user has admin-level access (admin or billing)
export const hasAdminAccess = (user) => {
  return user?.role === ROLES.ADMIN || user?.role === ROLES.BILLING;
}; 