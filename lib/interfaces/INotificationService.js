/**
 * Notification Service Interface
 * Defines the contract for notification implementations
 */

class INotificationService {
  /**
   * Send notifications for rental properties
   * @param {Array} rentals - Array of rental objects to notify about
   * @param {Object} options - Notification options
   * @returns {Promise<Object>} Notification result
   */
  async sendNotifications(rentals, options = {}) {
    throw new Error('sendNotifications() method must be implemented');
  }

  /**
   * Send error notification
   * @param {Error} error - Error to notify about
   * @param {Object} context - Additional context information
   * @returns {Promise<void>}
   */
  async sendErrorNotification(error, context = {}) {
    throw new Error('sendErrorNotification() method must be implemented');
  }

  /**
   * Test notification connection
   * @returns {Promise<boolean>} True if connection is working
   */
  async testConnection() {
    throw new Error('testConnection() method must be implemented');
  }
}

module.exports = INotificationService;