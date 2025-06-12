// Define roles and their permissions
export const ROLES = {
  ADMIN: 'admin',
  BILLING: 'billing',
  THERAPIST: 'therapist'
};

// Define permissions for each role
export const PERMISSIONS = {
  [ROLES.ADMIN]: {
    dashboard: true,
    clients: true,
    associates: true,
    billing: true,
    calendar: true,
    clinicalForms: true,
    adminPanel: true,
    aiSummary: true,
    canAssignTherapists: true,
    canViewAllClients: true,
    canManageBilling: true,
    canManageUsers: true
  },
  [ROLES.BILLING]: {
    dashboard: true,
    clients: true,
    billing: true,
    calendar: true,
    canViewAllClients: true,
    canManageBilling: true
  },
  [ROLES.THERAPIST]: {
    dashboard: true,
    clients: true,
    calendar: true,
    clinicalForms: true,
    aiSummary: true,
    canViewAllClients: false,
    canManageBilling: false
  }
};

// Helper function to check if a user has a specific permission
export const hasPermission = (userRole, permission) => {
  return PERMISSIONS[userRole]?.[permission] || false;
};

// Helper function to get accessible routes for a role
export const getAccessibleRoutes = (userRole) => {
  const routes = [];
  const permissions = PERMISSIONS[userRole];

  if (permissions.dashboard) routes.push('/dashboard');
  if (permissions.clients) routes.push('/clients');
  if (permissions.associates) routes.push('/associates');
  if (permissions.billing) routes.push('/billing');
  if (permissions.calendar) routes.push('/calendar');
  if (permissions.clinicalForms) routes.push('/clinical-forms');
  if (permissions.adminPanel) routes.push('/admin');
  if (permissions.aiSummary) routes.push('/ai-summary');

  return routes;
};

// Helper function to filter clients based on role and therapist
export const filterClientsByRole = (clients, userRole, therapistName) => {
  if (userRole === ROLES.ADMIN || userRole === ROLES.BILLING) {
    return clients; // Return all clients for admin and billing
  }
  
  if (userRole === ROLES.THERAPIST) {
    return clients.filter(client => client.therapist?.name === therapistName);
  }
  
  return []; // Return empty array for unknown roles
}; 