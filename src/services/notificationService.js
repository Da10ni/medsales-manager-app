/**
 * Notification Service for Manager App
 *
 * Manager app se Sales Reps ko notifications bhejne ke liye
 * Future me Manager ko bhi notifications receive karni hon to yahan add kar sakte hain
 */

import { doc, getDoc, collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

// =============================================================================
// NOTIFICATION TYPES - Future ke liye easy to extend
// =============================================================================

/**
 * Notification types enum - Add new types here as needed
 */
export const NOTIFICATION_TYPES = {
  ROUTE_ASSIGNED: 'route_assigned',
  ROUTE_UPDATED: 'route_updated',
  ROUTE_COMPLETED: 'route_completed',     // Future: jab sales rep complete kare
  VISIT_COMPLETED: 'visit_completed',     // Future: jab sales rep visit kare
  ORDER_PLACED: 'order_placed',           // Future: jab order place ho
};

/**
 * Notification templates - Pre-defined messages
 */
export const NOTIFICATION_TEMPLATES = {
  [NOTIFICATION_TYPES.ROUTE_ASSIGNED]: {
    title: 'New Route Assigned!',
    getBody: (data) => `You have been assigned to route: ${data.routeName} with ${data.stopsCount} stops`,
  },
  [NOTIFICATION_TYPES.ROUTE_UPDATED]: {
    title: 'Route Updated',
    getBody: (data) => `Route "${data.routeName}" has been updated`,
  },
  [NOTIFICATION_TYPES.ROUTE_COMPLETED]: {
    title: 'Route Completed',
    getBody: (data) => `${data.salesRepName} has completed route: ${data.routeName}`,
  },
  [NOTIFICATION_TYPES.VISIT_COMPLETED]: {
    title: 'Visit Completed',
    getBody: (data) => `${data.salesRepName} visited ${data.distributorName}`,
  },
  [NOTIFICATION_TYPES.ORDER_PLACED]: {
    title: 'New Order Placed',
    getBody: (data) => `Order of Rs. ${data.amount} placed at ${data.distributorName}`,
  },
};

// =============================================================================
// MAIN NOTIFICATION FUNCTIONS
// =============================================================================

/**
 * Sales Rep ko push notification bhejne ka main function
 *
 * @param {string} salesRepId - Sales rep ka document ID (phone number)
 * @param {object} notificationData - Notification data object
 * @param {string} notificationData.title - Notification title
 * @param {string} notificationData.message - Notification body message
 * @param {object} notificationData.data - Extra data jo notification ke sath jaaye
 * @param {boolean} saveLog - Firestore me log save karna hai ya nahi (default: true)
 * @returns {Promise<{success: boolean, error?: string, result?: object}>}
 */
export async function sendPushNotification(salesRepId, notificationData, saveLog = true) {
  // Debug log - Start
  console.log('========================================');
  console.log('📤 NOTIFICATION SERVICE - START');
  console.log('========================================');
  console.log('📍 Target Sales Rep ID:', salesRepId);
  console.log('📝 Notification Data:', JSON.stringify(notificationData, null, 2));

  try {
    // Step 1: Sales Rep ka data fetch karo
    console.log('\n🔍 Step 1: Fetching sales rep data...');
    const salesRepDoc = await getDoc(doc(db, 'salesReps', salesRepId));

    if (!salesRepDoc.exists()) {
      console.error('❌ Sales rep not found in database:', salesRepId);
      return {
        success: false,
        error: 'SALES_REP_NOT_FOUND',
        message: `Sales rep with ID "${salesRepId}" not found in database`
      };
    }

    const salesRepData = salesRepDoc.data();
    console.log('✅ Sales Rep Found:', {
      id: salesRepId,
      name: salesRepData?.name || 'N/A',
      phone: salesRepData?.phone || 'N/A',
      platform: salesRepData?.platform || 'N/A',
    });

    // Step 2: Push token check karo
    console.log('\n🔍 Step 2: Checking push token...');
    const expoPushToken = salesRepData?.expoPushToken;

    if (!expoPushToken) {
      console.warn('⚠️ No push token found for sales rep');
      console.warn('💡 Sales Rep needs to open the app to register for notifications');

      // Log save karo with error
      if (saveLog) {
        await saveNotificationLog({
          salesRepId,
          salesRepName: salesRepData?.name || 'Unknown',
          notificationData,
          status: 'failed',
          error: 'NO_PUSH_TOKEN',
          platform: salesRepData?.platform || 'unknown',
        });
      }

      return {
        success: false,
        error: 'NO_PUSH_TOKEN',
        message: 'Sales Rep has not registered for push notifications'
      };
    }

    // Step 3: Token format validate karo
    console.log('\n🔍 Step 3: Validating token format...');
    if (!expoPushToken.startsWith('ExponentPushToken[')) {
      console.error('❌ Invalid token format:', expoPushToken);
      return {
        success: false,
        error: 'INVALID_TOKEN_FORMAT',
        message: 'Push token format is invalid'
      };
    }
    console.log('✅ Token format valid:', expoPushToken.substring(0, 30) + '...');

    // Step 4: Notification bhejo
    console.log('\n📨 Step 4: Sending notification to Expo...');
    const message = {
      to: expoPushToken,
      sound: 'default',
      title: notificationData.title,
      body: notificationData.message,
      data: notificationData.data || {},
      priority: 'high',
      channelId: 'default',
    };

    console.log('📦 Message payload:', {
      to: message.to.substring(0, 30) + '...',
      title: message.title,
      body: message.body,
      dataKeys: Object.keys(message.data),
    });

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    console.log('\n📬 Expo API Response:', JSON.stringify(result, null, 2));

    // Step 5: Response check karo
    console.log('\n🔍 Step 5: Processing response...');

    if (result.data?.status === 'error') {
      console.error('❌ Expo returned error:', result.data.message);

      if (saveLog) {
        await saveNotificationLog({
          salesRepId,
          salesRepName: salesRepData?.name || 'Unknown',
          notificationData,
          status: 'failed',
          error: result.data.message,
          expoResponse: result,
          platform: salesRepData?.platform || 'unknown',
        });
      }

      return {
        success: false,
        error: 'EXPO_ERROR',
        message: result.data.message
      };
    }

    if (result.data?.status === 'ok') {
      console.log('✅ Notification sent successfully!');
      console.log('========================================');

      if (saveLog) {
        await saveNotificationLog({
          salesRepId,
          salesRepName: salesRepData?.name || 'Unknown',
          notificationData,
          status: 'success',
          expoResponse: result,
          platform: salesRepData?.platform || 'unknown',
        });
      }

      return {
        success: true,
        result,
        message: `Notification sent to ${salesRepData?.name || salesRepId}`
      };
    }

    // Unexpected response
    console.warn('⚠️ Unexpected response from Expo:', result);
    return {
      success: false,
      error: 'UNEXPECTED_RESPONSE',
      message: 'Unexpected response from notification server'
    };

  } catch (error) {
    console.error('========================================');
    console.error('❌ NOTIFICATION ERROR:', error.message);
    console.error('Stack:', error.stack);
    console.error('========================================');

    if (saveLog) {
      await saveNotificationLog({
        salesRepId,
        notificationData,
        status: 'error',
        error: error.message,
      });
    }

    return {
      success: false,
      error: 'NETWORK_ERROR',
      message: error.message
    };
  }
}

/**
 * Notification log Firebase me save karo - Debugging ke liye
 */
async function saveNotificationLog(logData) {
  try {
    const logRef = collection(db, 'notificationLogs');
    await addDoc(logRef, {
      ...logData,
      createdAt: Timestamp.now(),
      app: 'manager', // Identify which app sent this
    });
    console.log('📝 Notification log saved');
  } catch (error) {
    console.error('⚠️ Failed to save notification log:', error.message);
    // Don't throw - logging failure shouldn't break the main flow
  }
}

// =============================================================================
// HELPER FUNCTIONS - Easy to use wrappers
// =============================================================================

/**
 * Route assign hone par notification bhejo
 *
 * @param {string} salesRepId - Sales rep ID
 * @param {object} routeInfo - Route information
 * @param {string} routeInfo.routeId - Route document ID
 * @param {string} routeInfo.routeName - Route name to display
 * @param {number} routeInfo.stopsCount - Number of stops
 * @param {string} routeInfo.assignmentId - Assignment document ID
 * @param {Date} routeInfo.date - Assignment date
 */
export async function sendRouteAssignedNotification(salesRepId, routeInfo) {
  const template = NOTIFICATION_TEMPLATES[NOTIFICATION_TYPES.ROUTE_ASSIGNED];

  const notificationData = {
    title: template.title,
    message: template.getBody(routeInfo),
    data: {
      type: NOTIFICATION_TYPES.ROUTE_ASSIGNED,
      routeId: routeInfo.routeId,
      assignmentId: routeInfo.assignmentId,
      screen: 'RouteDetailsScreen', // Sales rep app me navigate karne ke liye
      date: routeInfo.date?.toISOString?.() || new Date().toISOString(),
    },
  };

  return sendPushNotification(salesRepId, notificationData);
}

/**
 * Route update hone par notification bhejo
 */
export async function sendRouteUpdatedNotification(salesRepId, routeInfo) {
  const template = NOTIFICATION_TEMPLATES[NOTIFICATION_TYPES.ROUTE_UPDATED];

  const notificationData = {
    title: template.title,
    message: template.getBody(routeInfo),
    data: {
      type: NOTIFICATION_TYPES.ROUTE_UPDATED,
      routeId: routeInfo.routeId,
      assignmentId: routeInfo.assignmentId,
      screen: 'RouteDetailsScreen',
    },
  };

  return sendPushNotification(salesRepId, notificationData);
}

// =============================================================================
// FUTURE: Manager ko notifications bhejne ke functions
// Jab sales rep route complete kare ya koi action le
// =============================================================================

/**
 * Manager ko notification bhejo
 * Ye function tab use hoga jab sales rep kuch kare aur manager ko batana ho
 *
 * @param {string} managerId - Manager ID (phone number)
 * @param {object} notificationData - Notification data
 */
export async function sendNotificationToManager(managerId, notificationData) {
  console.log('📤 Sending notification to Manager:', managerId);

  try {
    // Manager ka token 'managers' collection se fetch karo
    const managerDoc = await getDoc(doc(db, 'managers', managerId));

    if (!managerDoc.exists()) {
      console.error('❌ Manager not found:', managerId);
      return { success: false, error: 'MANAGER_NOT_FOUND' };
    }

    const managerData = managerDoc.data();
    const expoPushToken = managerData?.expoPushToken;

    if (!expoPushToken) {
      console.warn('⚠️ Manager has no push token');
      return { success: false, error: 'NO_PUSH_TOKEN' };
    }

    // Same notification sending logic
    const message = {
      to: expoPushToken,
      sound: 'default',
      title: notificationData.title,
      body: notificationData.message,
      data: notificationData.data || {},
      priority: 'high',
      channelId: 'default',
    };

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();

    if (result.data?.status === 'ok') {
      console.log('✅ Notification sent to Manager');

      await saveNotificationLog({
        managerId,
        managerName: managerData?.name || 'Unknown',
        notificationData,
        status: 'success',
        expoResponse: result,
      });

      return { success: true, result };
    }

    return { success: false, error: result.data?.message || 'Unknown error' };

  } catch (error) {
    console.error('❌ Error sending to manager:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Route complete hone par manager ko notification bhejo
 * Ye Sales Rep app se call hogi
 */
export async function notifyManagerRouteCompleted(managerId, routeInfo) {
  const template = NOTIFICATION_TEMPLATES[NOTIFICATION_TYPES.ROUTE_COMPLETED];

  const notificationData = {
    title: template.title,
    message: template.getBody(routeInfo),
    data: {
      type: NOTIFICATION_TYPES.ROUTE_COMPLETED,
      routeId: routeInfo.routeId,
      salesRepId: routeInfo.salesRepId,
      screen: 'RouteDetailsScreen',
    },
  };

  return sendNotificationToManager(managerId, notificationData);
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check karo ke sales rep ka push token valid hai ya nahi
 */
export async function checkSalesRepNotificationStatus(salesRepId) {
  try {
    const salesRepDoc = await getDoc(doc(db, 'salesReps', salesRepId));

    if (!salesRepDoc.exists()) {
      return {
        exists: false,
        hasToken: false,
        canReceiveNotifications: false
      };
    }

    const data = salesRepDoc.data();
    const hasToken = !!data?.expoPushToken;
    const tokenValid = hasToken && data.expoPushToken.startsWith('ExponentPushToken[');

    return {
      exists: true,
      hasToken,
      tokenValid,
      canReceiveNotifications: tokenValid,
      platform: data?.platform || 'unknown',
      name: data?.name,
    };
  } catch (error) {
    console.error('Error checking notification status:', error);
    return { exists: false, hasToken: false, error: error.message };
  }
}
