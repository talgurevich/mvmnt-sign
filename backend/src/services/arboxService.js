// Arbox API Service
// Handles all interactions with Arbox API for customer/member data

const axios = require('axios');

class ArboxService {
  constructor() {
    this.baseURL = process.env.ARBOX_API_URL;
    this.apiKey = process.env.ARBOX_API_KEY;

    if (!this.baseURL || !this.apiKey) {
      throw new Error('Arbox API configuration missing');
    }

    // Create axios instance with default config
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'apiKey': this.apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 seconds
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      response => response,
      error => {
        console.error('Arbox API Error:', {
          url: error.config?.url,
          status: error.response?.status,
          message: error.response?.data?.message || error.message
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get all users/members from Arbox
   * @returns {Promise<Array>} List of users
   */
  async getUsers() {
    try {
      const response = await this.client.get('/users');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch Arbox users: ${error.message}`);
    }
  }

  /**
   * Search users by query
   * @param {string} query - Search term
   * @returns {Promise<Array>} Matching users
   */
  async searchUsers(query) {
    try {
      const response = await this.client.get('/users/search', {
        params: { q: query }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to search Arbox users: ${error.message}`);
    }
  }

  /**
   * Get user by ID
   * @param {string} userId - Arbox user ID
   * @returns {Promise<Object>} User details
   */
  async getUserById(userId) {
    try {
      const response = await this.client.get(`/users/${userId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch Arbox user ${userId}: ${error.message}`);
    }
  }

  /**
   * Get active members
   * @returns {Promise<Array>} Active members
   */
  async getActiveMembers() {
    try {
      const response = await this.client.get('/reports/active-members');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch active members: ${error.message}`);
    }
  }

  /**
   * Get membership data for all users
   * @returns {Promise<Array>} Membership data including subscription types
   */
  async getMembershipsData() {
    try {
      const response = await this.client.get('/users/membershipsData');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch memberships data: ${error.message}`);
    }
  }

  /**
   * Transform Arbox user data to our customer format
   * @param {Object} arboxUser - User data from Arbox API
   * @returns {Object} Formatted customer data
   */
  transformArboxUserToCustomer(arboxUser) {
    return {
      arbox_customer_id: arboxUser.id?.toString(),
      first_name: arboxUser.firstName || arboxUser.first_name || '',
      last_name: arboxUser.lastName || arboxUser.last_name || '',
      email: arboxUser.email || null,
      phone_number: arboxUser.phone || arboxUser.phoneNumber || '',
      date_of_birth: arboxUser.dateOfBirth || arboxUser.birthDate || null,
      address: arboxUser.address || null,
      city: arboxUser.city || null,
      state: arboxUser.state || null,
      zip_code: arboxUser.zipCode || arboxUser.zip || null,
      country: 'IL', // Israel
      is_active: arboxUser.status === 'active' || arboxUser.isActive || true
    };
  }

  /**
   * Sync all users from Arbox to our database
   * Returns array of transformed customers ready for database insert
   * @returns {Promise<Array>} Array of customer objects
   */
  async syncAllUsers() {
    try {
      const arboxUsers = await this.getUsers();

      if (!Array.isArray(arboxUsers)) {
        throw new Error('Invalid response from Arbox API');
      }

      // Transform all users to our customer format
      const customers = arboxUsers.map(user =>
        this.transformArboxUserToCustomer(user)
      );

      return customers;
    } catch (error) {
      throw new Error(`Failed to sync Arbox users: ${error.message}`);
    }
  }

  /**
   * Get user by email
   * @param {string} email - User email
   * @returns {Promise<Object|null>} User or null if not found
   */
  async getUserByEmail(email) {
    try {
      const users = await this.searchUsers(email);
      if (users && users.length > 0) {
        return users[0];
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to find user by email: ${error.message}`);
    }
  }

  /**
   * Get user by phone number
   * @param {string} phone - Phone number
   * @returns {Promise<Object|null>} User or null if not found
   */
  async getUserByPhone(phone) {
    try {
      const users = await this.searchUsers(phone);
      if (users && users.length > 0) {
        return users[0];
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to find user by phone: ${error.message}`);
    }
  }

  /**
   * Get all leads
   * @returns {Promise<Array>} List of leads
   */
  async getLeads() {
    try {
      const response = await this.client.get('/leads');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch Arbox leads: ${error.message}`);
    }
  }

  /**
   * Get converted leads
   * @returns {Promise<Array>} List of converted leads
   */
  async getConvertedLeads() {
    try {
      const response = await this.client.get('/convertedLeads');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch converted leads: ${error.message}`);
    }
  }

  /**
   * Get lost leads
   * @returns {Promise<Array>} List of lost leads
   */
  async getLostLeads() {
    try {
      const response = await this.client.get('/lostLeads');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch lost leads: ${error.message}`);
    }
  }

  /**
   * Get trial classes report
   * @param {string} fromDate - Start date in YYYY-MM-DD format
   * @param {string} toDate - End date in YYYY-MM-DD format
   * @returns {Promise<Array>} List of trial bookings
   */
  async getTrials(fromDate, toDate) {
    try {
      const response = await this.client.request({
        method: 'GET',
        url: '/reports/trialClassesReport',
        data: { fromDate, toDate }
      });
      return response.data?.data || response.data || [];
    } catch (error) {
      throw new Error(`Failed to fetch trials: ${error.message}`);
    }
  }
}

// Export singleton instance
module.exports = new ArboxService();
