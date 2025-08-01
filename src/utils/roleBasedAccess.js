// Role-based access control configuration
const ROLES = {
  ADMIN: 'admin',
  THERAPIST: 'therapist',
  ASSOCIATE: 'associate',
  VIEWER: 'viewer'
};

// Permission definitions
const PERMISSIONS = {
  // Client management
  VIEW_CLIENTS: 'view_clients',
  CREATE_CLIENTS: 'create_clients',
  EDIT_CLIENTS: 'edit_clients',
  DELETE_CLIENTS: 'delete_clients',
  ASSIGN_THERAPISTS: 'assign_therapists',
  
  // Therapy notes
  VIEW_NOTES: 'view_notes',
  CREATE_NOTES: 'create_notes',
  EDIT_NOTES: 'edit_notes',
  DELETE_NOTES: 'delete_notes',
  
  // Billing and financial
  VIEW_BILLING: 'view_billing',
  EDIT_BILLING: 'edit_billing',
  PROCESS_PAYMENTS: 'process_payments',
  
  // User management
  VIEW_USERS: 'view_users',
  CREATE_USERS: 'create_users',
  EDIT_USERS: 'edit_users',
  DELETE_USERS: 'delete_users',
  
  // System administration
  VIEW_LOGS: 'view_logs',
  MANAGE_SETTINGS: 'manage_settings',
  EXPORT_DATA: 'export_data',
  
  // Calendar and scheduling
  VIEW_CALENDAR: 'view_calendar',
  MANAGE_APPOINTMENTS: 'manage_appointments',
  
  // Documents and files
  VIEW_DOCUMENTS: 'view_documents',
  UPLOAD_DOCUMENTS: 'upload_documents',
  DELETE_DOCUMENTS: 'delete_documents'
};

// Role permissions mapping
const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    // Full access to everything
    ...Object.values(PERMISSIONS)
  ],
  
  [ROLES.THERAPIST]: [
    // Client management
    PERMISSIONS.VIEW_CLIENTS,
    PERMISSIONS.EDIT_CLIENTS,
    PERMISSIONS.ASSIGN_THERAPISTS,
    
    // Therapy notes (for assigned clients only)
    PERMISSIONS.VIEW_NOTES,
    PERMISSIONS.CREATE_NOTES,
    PERMISSIONS.EDIT_NOTES,
    PERMISSIONS.DELETE_NOTES,
    
    // Billing (therapist role is used for billing users)
    PERMISSIONS.VIEW_BILLING,
    PERMISSIONS.EDIT_BILLING,
    
    // Calendar
    PERMISSIONS.VIEW_CALENDAR,
    PERMISSIONS.MANAGE_APPOINTMENTS,
    
    // Documents
    PERMISSIONS.VIEW_DOCUMENTS,
    PERMISSIONS.UPLOAD_DOCUMENTS,
    PERMISSIONS.DELETE_DOCUMENTS
  ],
  
  [ROLES.ASSOCIATE]: [
    // Limited client access
    PERMISSIONS.VIEW_CLIENTS,
    PERMISSIONS.EDIT_CLIENTS,
    
    // Therapy notes (for assigned clients only)
    PERMISSIONS.VIEW_NOTES,
    PERMISSIONS.CREATE_NOTES,
    PERMISSIONS.EDIT_NOTES,
    PERMISSIONS.DELETE_NOTES,
    
    // Limited billing access
    PERMISSIONS.VIEW_BILLING,
    
    // Calendar access
    PERMISSIONS.VIEW_CALENDAR,
    PERMISSIONS.MANAGE_APPOINTMENTS,
    
    // Limited document access
    PERMISSIONS.VIEW_DOCUMENTS,
    PERMISSIONS.UPLOAD_DOCUMENTS
  ],
  
  [ROLES.VIEWER]: [
    // Read-only access to basic information
    PERMISSIONS.VIEW_CLIENTS,
    PERMISSIONS.VIEW_BILLING,
    PERMISSIONS.VIEW_CALENDAR,
    PERMISSIONS.VIEW_DOCUMENTS
  ]
};

// Data access levels for sensitive information
const DATA_ACCESS_LEVELS = {
  PUBLIC: 'public',
  INTERNAL: 'internal',
  CONFIDENTIAL: 'confidential',
  RESTRICTED: 'restricted'
};

// Data sensitivity mapping
const DATA_SENSITIVITY = {
  // Client data
  'client.basic': DATA_ACCESS_LEVELS.INTERNAL,
  'client.personal': DATA_ACCESS_LEVELS.CONFIDENTIAL,
  'client.medical': DATA_ACCESS_LEVELS.RESTRICTED,
  'client.financial': DATA_ACCESS_LEVELS.RESTRICTED,
  
  // Therapy notes
  'notes.basic': DATA_ACCESS_LEVELS.CONFIDENTIAL,
  'notes.detailed': DATA_ACCESS_LEVELS.RESTRICTED,
  
  // Billing information
  'billing.basic': DATA_ACCESS_LEVELS.INTERNAL,
  'billing.detailed': DATA_ACCESS_LEVELS.CONFIDENTIAL,
  'billing.payment': DATA_ACCESS_LEVELS.RESTRICTED,
  
  // User data
  'user.basic': DATA_ACCESS_LEVELS.INTERNAL,
  'user.detailed': DATA_ACCESS_LEVELS.CONFIDENTIAL,
  
  // System data
  'system.logs': DATA_ACCESS_LEVELS.RESTRICTED,
  'system.settings': DATA_ACCESS_LEVELS.CONFIDENTIAL
};

// Role-based access control class
class RoleBasedAccessControl {
  constructor() {
    this.currentUser = null;
    this.userRole = null;
    this.userPermissions = [];
  }

  // Set current user and their role
  setUser(user) {
    this.currentUser = user;
    this.userRole = user?.role || ROLES.VIEWER;
    this.userPermissions = ROLE_PERMISSIONS[this.userRole] || [];
  }

  // Check if user has a specific permission
  hasPermission(permission) {
    if (!this.currentUser) return false;
    
    // Admin has all permissions
    if (this.userRole === ROLES.ADMIN) return true;
    
    return this.userPermissions.includes(permission);
  }

  // Check if user has any of the specified permissions
  hasAnyPermission(permissions) {
    return permissions.some(permission => this.hasPermission(permission));
  }

  // Check if user has all of the specified permissions
  hasAllPermissions(permissions) {
    return permissions.every(permission => this.hasPermission(permission));
  }

  // Check if user can access data of a specific sensitivity level
  canAccessData(dataType) {
    if (!this.currentUser) return false;
    
    const sensitivityLevel = DATA_SENSITIVITY[dataType];
    if (!sensitivityLevel) return false;

    switch (sensitivityLevel) {
      case DATA_ACCESS_LEVELS.PUBLIC:
        return true;
      
      case DATA_ACCESS_LEVELS.INTERNAL:
        return this.userRole !== ROLES.VIEWER;
      
      case DATA_ACCESS_LEVELS.CONFIDENTIAL:
        return [ROLES.ADMIN, ROLES.THERAPIST, ROLES.ASSOCIATE].includes(this.userRole);
      
      case DATA_ACCESS_LEVELS.RESTRICTED:
        return [ROLES.ADMIN, ROLES.THERAPIST].includes(this.userRole);
      
      default:
        return false;
    }
  }

  // Filter sensitive data based on user permissions
  filterSensitiveData(data, dataType) {
    if (!this.canAccessData(dataType)) {
      return null;
    }

    // Apply role-specific data filtering
    switch (this.userRole) {
      case ROLES.ADMIN:
        return data; // Full access
        
      case ROLES.THERAPIST:
        return this.filterForTherapist(data, dataType);
        
      case ROLES.ASSOCIATE:
        return this.filterForAssociate(data, dataType);
        
      case ROLES.VIEWER:
        return this.filterForViewer(data, dataType);
        
      default:
        return null;
    }
  }

  // Filter data for therapist role
  filterForTherapist(data, dataType) {
    switch (dataType) {
      case 'client.personal':
        // Remove sensitive financial information
        const { billing, ...filteredData } = data;
        return filteredData;
      
      case 'client.financial':
        // Only show basic billing info
        return {
          paymentOption: data.paymentOption,
          provider: data.provider,
          planName: data.planName
        };
      
      default:
        return data;
    }
  }

  // Filter data for associate role
  filterForAssociate(data, dataType) {
    switch (dataType) {
      case 'client.personal':
        // Remove medical and financial information
        const { medical, billing, insurance, ...filteredData } = data;
        return filteredData;
      
      case 'client.medical':
        return null; // No access to medical data
      
      case 'client.financial':
        return null; // No access to financial data
      
      default:
        return data;
    }
  }

  // Filter data for viewer role
  filterForViewer(data, dataType) {
    switch (dataType) {
      case 'client.basic':
        return {
          id: data.id,
          name: data.name,
          active: data.active
        };
      
      case 'notes.basic':
        return {
          id: data.id,
          subject: data.subject,
          timestamp: data.timestamp,
          therapistName: data.therapistName
        };
      
      default:
        return null;
    }
  }

  // Get user's role
  getUserRole() {
    return this.userRole;
  }

  // Get user's permissions
  getUserPermissions() {
    return [...this.userPermissions];
  }

  // Check if user is admin
  isAdmin() {
    return this.userRole === ROLES.ADMIN;
  }

  // Check if user is therapist
  isTherapist() {
    return this.userRole === ROLES.THERAPIST;
  }

  // Check if user is associate
  isAssociate() {
    return this.userRole === ROLES.ASSOCIATE;
  }

  // Check if user is viewer
  isViewer() {
    return this.userRole === ROLES.VIEWER;
  }

  // Get all available roles
  getAvailableRoles() {
    return Object.values(ROLES);
  }

  // Get all available permissions
  getAvailablePermissions() {
    return Object.values(PERMISSIONS);
  }

  // Get permissions for a specific role
  getRolePermissions(role) {
    return ROLE_PERMISSIONS[role] || [];
  }
}

// Create singleton instance
const rbac = new RoleBasedAccessControl();

export default rbac;
export { ROLES, PERMISSIONS, DATA_ACCESS_LEVELS, DATA_SENSITIVITY }; 