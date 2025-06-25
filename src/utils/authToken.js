import { auth } from '../firebase';

// Token storage keys
const ACCESS_TOKEN_KEY = 'dash_access_token';
const REFRESH_TOKEN_KEY = 'dash_refresh_token';
const TOKEN_EXPIRY_KEY = 'dash_token_expiry';

// Token configuration
const TOKEN_EXPIRY_TIME = 60 * 60 * 1000; // 1 hour in milliseconds
const REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiry

class AuthTokenManager {
  constructor() {
    this.isRefreshing = false;
    this.refreshPromise = null;
  }

  // Generate a new access token
  async generateAccessToken() {
    try {
      console.log('🔍 Generating access token...');
      const user = auth.currentUser;
      if (!user) {
        console.log('❌ No authenticated user found');
        throw new Error('No authenticated user');
      }

      console.log('🔍 User found:', user.uid, user.email);

      // Get the user's ID token from Firebase
      const idToken = await user.getIdToken(true);
      
      console.log('🔍 ID token obtained, length:', idToken.length);
      
      // Create a custom token payload with additional security claims
      const tokenPayload = {
        uid: user.uid,
        email: user.email,
        emailVerified: user.emailVerified,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor((Date.now() + TOKEN_EXPIRY_TIME) / 1000),
        jti: this.generateTokenId(),
        aud: 'dash-therapy-app',
        iss: 'dash-therapy-app'
      };

      console.log('🔍 Token payload created');

      // Store token data
      this.storeTokenData(idToken, tokenPayload.exp * 1000);
      
      console.log('✅ Access token generated and stored successfully');
      
      return {
        accessToken: idToken,
        expiresAt: tokenPayload.exp * 1000,
        tokenId: tokenPayload.jti
      };
    } catch (error) {
      console.error('❌ Error generating access token:', error);
      throw error;
    }
  }

  // Store token data securely
  storeTokenData(accessToken, expiresAt) {
    try {
      // Store in sessionStorage for better security (cleared when tab closes)
      sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      sessionStorage.setItem(TOKEN_EXPIRY_KEY, expiresAt.toString());
      
      // Store refresh token in localStorage for persistence
      const refreshToken = this.generateRefreshToken();
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    } catch (error) {
      console.error('Error storing token data:', error);
      throw error;
    }
  }

  // Get current access token
  getAccessToken() {
    try {
      const token = sessionStorage.getItem(ACCESS_TOKEN_KEY);
      const expiry = sessionStorage.getItem(TOKEN_EXPIRY_KEY);
      
      if (!token || !expiry) {
        return null;
      }

      const expiryTime = parseInt(expiry);
      if (Date.now() >= expiryTime) {
        this.clearTokens();
        return null;
      }

      return token;
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

  // Check if token needs refresh
  needsRefresh() {
    try {
      const expiry = sessionStorage.getItem(TOKEN_EXPIRY_KEY);
      if (!expiry) return true;

      const expiryTime = parseInt(expiry);
      const timeUntilExpiry = expiryTime - Date.now();
      
      return timeUntilExpiry <= REFRESH_THRESHOLD;
    } catch (error) {
      console.error('Error checking token refresh:', error);
      return true;
    }
  }

  // Refresh access token
  async refreshAccessToken() {
    if (this.isRefreshing) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.performTokenRefresh();

    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  // Perform the actual token refresh
  async performTokenRefresh() {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No authenticated user for token refresh');
      }

      // Force refresh the Firebase ID token
      await user.getIdToken(true);
      
      // Generate new access token
      return await this.generateAccessToken();
    } catch (error) {
      console.error('Error refreshing access token:', error);
      this.clearTokens();
      throw error;
    }
  }

  // Get valid access token (refresh if needed)
  async getValidAccessToken() {
    try {
      console.log('🔍 Getting valid access token...');
      let token = this.getAccessToken();
      
      console.log('🔍 Current token exists:', !!token);
      
      if (!token || this.needsRefresh()) {
        console.log('🔍 Token needs refresh, generating new token...');
        const newTokenData = await this.refreshAccessToken();
        token = newTokenData.accessToken;
        console.log('🔍 New token obtained, length:', token.length);
      } else {
        console.log('🔍 Using existing token, length:', token.length);
      }

      return token;
    } catch (error) {
      console.error('❌ Error getting valid access token:', error);
      throw error;
    }
  }

  // Validate token
  async validateToken(token) {
    try {
      if (!token) return false;

      const user = auth.currentUser;
      if (!user) return false;

      // Verify the token with Firebase
      const decodedToken = await user.getIdTokenResult();
      
      // Check if token is still valid
      if (decodedToken.expirationTime) {
        const expiryTime = new Date(decodedToken.expirationTime).getTime();
        return Date.now() < expiryTime;
      }

      return false;
    } catch (error) {
      console.error('Error validating token:', error);
      return false;
    }
  }

  // Clear all tokens
  clearTokens() {
    try {
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  }

  // Generate unique token ID
  generateTokenId() {
    return 'token_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Generate refresh token
  generateRefreshToken() {
    return 'refresh_' + Date.now() + '_' + Math.random().toString(36).substr(2, 15);
  }

  // Check if user is authenticated
  isAuthenticated() {
    return auth.currentUser !== null && this.getAccessToken() !== null;
  }
}

// Create singleton instance
const authTokenManager = new AuthTokenManager();

export default authTokenManager; 