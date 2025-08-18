import authTokenManager from './authToken.js';

class SecureApiClient {
  constructor() {
    this.baseURLs = {
      cloudFunctions: {
        getSheetData: process.env.REACT_APP_USE_LOCAL_FUNCTIONS === 'true'
          ? 'http://127.0.0.1:5001/therapist-online/us-central1/getSheetData'
          : 'https://getsheetdata-ccl4wg6xia-uc.a.run.app',
        updateClientTherapist: process.env.REACT_APP_USE_LOCAL_FUNCTIONS === 'true'
          ? 'http://127.0.0.1:5001/therapist-online/us-central1/updateClientTherapist'
          : 'https://updateclienttherapist-ccl4wg6xia-uc.a.run.app',
        updateClientStatus: process.env.REACT_APP_USE_LOCAL_FUNCTIONS === 'true'
          ? 'http://127.0.0.1:5001/therapist-online/us-central1/updateClientStatus'
          : 'https://updateclientstatus-ccl4wg6xia-uc.a.run.app',
        updateUserRole: process.env.REACT_APP_USE_LOCAL_FUNCTIONS === 'true'
          ? 'http://127.0.0.1:5001/therapist-online/us-central1/updateUserRole'
          : 'https://updateuserrole-ccl4wg6xia-uc.a.run.app',
        createUserProfile: process.env.REACT_APP_USE_LOCAL_FUNCTIONS === 'true'
          ? 'http://127.0.0.1:5001/therapist-online/us-central1/createUserProfile'
          : 'https://createuserprofile-ccl4wg6xia-uc.a.run.app'
      }
    };
  }

  // Generic secure request method
  async makeSecureRequest(url, options = {}) {
    try {
      console.log('🔍 Making secure request to:', url);
      
      // Get valid access token
      const token = await authTokenManager.getValidAccessToken();
      
      console.log('🔍 Token obtained:', token ? 'Yes' : 'No');
      if (token) {
        console.log('🔍 Token length:', token.length);
        console.log('🔍 Token preview:', token.substring(0, 20) + '...');
      }
      
      if (!token) {
        throw new Error('No valid authentication token available');
      }

      // Prepare request headers
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Requested-With': 'XMLHttpRequest',
        ...options.headers
      };

      console.log('🔍 Request headers:', headers);

      // Make the request
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include'
      });

      console.log('🔍 Response status:', response.status);
      console.log('🔍 Response headers:', response.headers);

      // Handle authentication errors
      if (response.status === 401) {
        console.log('Token expired, attempting refresh...');
        authTokenManager.clearTokens();
        throw new Error('Authentication required. Please log in again.');
      }

      if (response.status === 403) {
        throw new Error('Access denied. You do not have permission to access this resource.');
      }

      // Handle other errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.log('🔍 Error response data:', errorData);
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('🔍 Response data preview:', JSON.stringify(result).substring(0, 100) + '...');
      return result;
    } catch (error) {
      console.error('Secure API request failed:', error);
      throw error;
    }
  }

  // Get sheet data with authentication
  async getSheetData() {
    return this.makeSecureRequest(this.baseURLs.cloudFunctions.getSheetData, {
      method: 'GET'
    });
  }

  // Update client therapist with authentication
  async updateClientTherapist(clientId, therapist) {
    return this.makeSecureRequest(this.baseURLs.cloudFunctions.updateClientTherapist, {
      method: 'POST',
      body: JSON.stringify({
        clientId,
        therapist
      })
    });
  }

  // Update client status with authentication
  async updateClientStatus(clientId, status) {
    return this.makeSecureRequest(this.baseURLs.cloudFunctions.updateClientStatus, {
      method: 'POST',
      body: JSON.stringify({
        clientId,
        status
      })
    });
  }

  // Update user role with authentication (admin only)
  async updateUserRole(userId, role) {
    return this.makeSecureRequest(this.baseURLs.cloudFunctions.updateUserRole, {
      method: 'POST',
      body: JSON.stringify({
        userId,
        role
      })
    });
  }

  // Create user profile with authentication
  async createUserProfile(firstName, lastName, role) {
    return this.makeSecureRequest(this.baseURLs.cloudFunctions.createUserProfile, {
      method: 'POST',
      body: JSON.stringify({
        firstName,
        lastName,
        role
      })
    });
  }

  // Generic POST request
  async post(url, data) {
    return this.makeSecureRequest(url, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Generic GET request
  async get(url) {
    return this.makeSecureRequest(url, {
      method: 'GET'
    });
  }

  // Generic PUT request
  async put(url, data) {
    return this.makeSecureRequest(url, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  // Generic DELETE request
  async delete(url) {
    return this.makeSecureRequest(url, {
      method: 'DELETE'
    });
  }

  // Upload file with authentication
  async uploadFile(url, file, onProgress = null) {
    try {
      const token = await authTokenManager.getValidAccessToken();
      
      if (!token) {
        throw new Error('No valid authentication token available');
      }

      const formData = new FormData();
      formData.append('file', file);

      const xhr = new XMLHttpRequest();
      
      return new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (event) => {
          if (onProgress && event.lengthComputable) {
            const percentComplete = (event.loaded / event.total) * 100;
            onProgress(percentComplete);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (error) {
              resolve(xhr.responseText);
            }
          } else {
            reject(new Error(`Upload failed with status: ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed'));
        });

        xhr.open('POST', url);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(formData);
      });
    } catch (error) {
      console.error('File upload failed:', error);
      throw error;
    }
  }
}

// Create singleton instance
const secureApiClient = new SecureApiClient();

export default secureApiClient; 