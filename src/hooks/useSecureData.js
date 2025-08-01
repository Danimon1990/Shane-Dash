import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import authTokenManager from '../utils/authToken.js';
import secureApiClient from '../utils/secureApiClient.js';
import rbac from '../utils/roleBasedAccess.js';

// Custom hook for secure data access
export const useSecureData = () => {
  const { currentUser } = useAuth();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [userPermissions, setUserPermissions] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize authentication and RBAC
  useEffect(() => {
    const initializeAuth = async () => {
      if (currentUser) {
        console.log('🔍 Initializing auth for user:', currentUser.email, 'role:', currentUser.role);
        
        // Set user in RBAC system
        rbac.setUser(currentUser);
        setUserRole(rbac.getUserRole());
        setUserPermissions(rbac.getUserPermissions());
        
        // Check if we have a valid token
        try {
          const token = await authTokenManager.getValidAccessToken();
          const hasToken = !!token;
          console.log('🔍 Token check result:', hasToken);
          setIsAuthenticated(hasToken);
        } catch (error) {
          console.log('❌ Token check failed:', error.message);
          setIsAuthenticated(false);
        }
      } else {
        console.log('❌ No current user, setting auth to false');
        setIsAuthenticated(false);
        setUserRole(null);
        setUserPermissions([]);
      }
      
      setIsInitialized(true);
    };

    initializeAuth();
  }, [currentUser]);

  // Secure data fetching with authentication
  const fetchSecureData = useCallback(async (url, options = {}) => {
    try {
      // Wait for initialization
      if (!isInitialized) {
        console.log('⏳ Waiting for auth initialization...');
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Check authentication
      if (!isAuthenticated) {
        console.log('❌ Not authenticated in fetchSecureData');
        throw new Error('Authentication required');
      }

      // Check if token is valid
      const token = await authTokenManager.getValidAccessToken();
      if (!token) {
        console.log('❌ No valid token in fetchSecureData');
        throw new Error('Invalid or expired token');
      }

      console.log('✅ Making secure API call');
      // Make secure API call
      return await secureApiClient.makeSecureRequest(url, options);
    } catch (error) {
      console.error('Secure data fetch failed:', error);
      throw error;
    }
  }, [isAuthenticated, isInitialized]);

  // Get filtered client data based on user role
  const getFilteredClientData = useCallback((clientData) => {
    if (!isAuthenticated) return null;

    // Determine data type based on content
    let dataType = 'client.basic';
    if (clientData.medical || clientData.billing) {
      dataType = 'client.personal';
    }
    if (clientData.medical) {
      dataType = 'client.medical';
    }
    if (clientData.billing && clientData.billing.cardNumber) {
      dataType = 'client.financial';
    }

    return rbac.filterSensitiveData(clientData, dataType);
  }, [isAuthenticated]);

  // Get filtered notes data based on user role
  const getFilteredNotesData = useCallback((notesData) => {
    if (!isAuthenticated) return null;

    const dataType = notesData.subjective || notesData.assessment ? 'notes.detailed' : 'notes.basic';
    return rbac.filterSensitiveData(notesData, dataType);
  }, [isAuthenticated]);

  // Check if user can perform an action
  const canPerform = useCallback((permission) => {
    return rbac.hasPermission(permission);
  }, []);

  // Check if user can access specific data type
  const canAccess = useCallback((dataType) => {
    return rbac.canAccessData(dataType);
  }, []);

  // Secure client operations
  const secureClientOperations = useMemo(() => ({
    // Get all clients with filtering
    getAllClients: async () => {
      try {
        const clients = await fetchSecureData(secureApiClient.baseURLs.cloudFunctions.getSheetData);
        return clients.map(client => getFilteredClientData(client)).filter(Boolean);
      } catch (error) {
        console.error('Failed to fetch clients:', error);
        throw error;
      }
    },

    // Get single client with filtering
    getClient: async (clientId) => {
      try {
        const clients = await fetchSecureData(secureApiClient.baseURLs.cloudFunctions.getSheetData);
        const client = clients.find(c => c.id === clientId);
        return client ? getFilteredClientData(client) : null;
      } catch (error) {
        console.error('Failed to fetch client:', error);
        throw error;
      }
    },

    // Update client therapist (requires permission)
    updateClientTherapist: async (clientId, therapist) => {
      if (!canPerform('assign_therapists')) {
        throw new Error('Insufficient permissions to assign therapists');
      }

      try {
        return await secureApiClient.updateClientTherapist(clientId, therapist);
      } catch (error) {
        console.error('Failed to update client therapist:', error);
        throw error;
      }
    },

    // Update client status (requires permission)
    updateClientStatus: async (clientId, status) => {
      if (!canPerform('edit_clients')) {
        throw new Error('Insufficient permissions to update client status');
      }

      try {
        return await secureApiClient.updateClientStatus(clientId, status);
      } catch (error) {
        console.error('Failed to update client status:', error);
        throw error;
      }
    },

    // Update user role (admin only)
    updateUserRole: async (userId, role) => {
      if (!canPerform('manage_users')) {
        throw new Error('Insufficient permissions to update user roles');
      }

      try {
        return await secureApiClient.updateUserRole(userId, role);
      } catch (error) {
        console.error('Failed to update user role:', error);
        throw error;
      }
    },

    // Create user profile (any authenticated user)
    createUserProfile: async (firstName, lastName, role) => {
      try {
        return await secureApiClient.createUserProfile(firstName, lastName, role);
      } catch (error) {
        console.error('Failed to create user profile:', error);
        throw error;
      }
    }
  }), [fetchSecureData, getFilteredClientData, canPerform]);

  // Secure notes operations
  const secureNotesOperations = useMemo(() => ({
    // Get notes for a client with filtering
    getClientNotes: async (clientId) => {
      if (!canPerform('view_notes')) {
        throw new Error('Insufficient permissions to view notes');
      }

      try {
        // This would typically fetch from Firestore
        // For now, return empty array as placeholder
        return [];
      } catch (error) {
        console.error('Failed to fetch client notes:', error);
        throw error;
      }
    },

    // Create new note (requires permission)
    createNote: async (clientId, noteData) => {
      if (!canPerform('create_notes')) {
        throw new Error('Insufficient permissions to create notes');
      }

      try {
        // This would typically save to Firestore
        // For now, return success as placeholder
        return { success: true, noteId: 'temp_' + Date.now() };
      } catch (error) {
        console.error('Failed to create note:', error);
        throw error;
      }
    }
  }), [canPerform]);

  // Secure billing operations
  const secureBillingOperations = useMemo(() => ({
    // Get billing information with filtering
    getBillingInfo: async (clientId) => {
      if (!canPerform('view_billing')) {
        throw new Error('Insufficient permissions to view billing');
      }

      try {
        const clients = await fetchSecureData(secureApiClient.baseURLs.cloudFunctions.getSheetData);
        const client = clients.find(c => c.id === clientId);
        
        if (!client) return null;

        const billingData = client.billing || {};
        return rbac.filterSensitiveData(billingData, 'billing.detailed');
      } catch (error) {
        console.error('Failed to fetch billing info:', error);
        throw error;
      }
    }
  }), [canPerform, fetchSecureData]);

  return {
    // Authentication state
    isAuthenticated,
    userRole,
    userPermissions,
    isInitialized,
    
    // Permission checks
    canPerform,
    canAccess,
    
    // Data filtering
    getFilteredClientData,
    getFilteredNotesData,
    
    // Secure operations
    secureClientOperations,
    secureNotesOperations,
    secureBillingOperations,
    
    // Direct API access
    fetchSecureData,
    
    // Utility functions
    refreshToken: authTokenManager.refreshAccessToken,
    clearTokens: authTokenManager.clearTokens
  };
};

// Hook for secure data with automatic refresh
export const useSecureDataWithRefresh = (dataFetcher, dependencies = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isAuthenticated, fetchSecureData } = useSecureData();

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) {
      setData(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await dataFetcher(fetchSecureData);
      setData(result);
    } catch (err) {
      console.error('Data fetch error:', err);
      setError(err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, dataFetcher, fetchSecureData, ...dependencies]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refresh,
    isAuthenticated
  };
};

// Hook for real-time secure data
export const useSecureRealtimeData = (dataType, clientId = null) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isAuthenticated, canAccess, getFilteredClientData, getFilteredNotesData } = useSecureData();

  useEffect(() => {
    if (!isAuthenticated || !canAccess(dataType)) {
      setData(null);
      setLoading(false);
      return;
    }

    // Set up real-time listeners here
    // For now, this is a placeholder for Firestore real-time listeners
    setLoading(false);
  }, [isAuthenticated, canAccess, dataType, clientId]);

  return {
    data,
    loading,
    error,
    isAuthenticated
  };
}; 