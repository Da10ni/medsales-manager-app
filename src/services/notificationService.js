

import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { doc, getFirestore, serverTimestamp, setDoc, getDoc } from "firebase/firestore";
import { Platform } from "react-native";
import { getDataFromDb } from "./firebaseServices";

// ✅ ADDED: Firestore data fetching function
const getDataFromFirestore = async (collectionName, documentId) => {
  try {
    console.log(`🟡 Fetching from Firestore: ${collectionName}/${documentId}`);
    
    const db = getFirestore();
    const docRef = doc(db, collectionName, documentId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      console.log(`✅ Document found in Firestore: ${documentId}`);
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      console.log(`❌ No document found in Firestore: ${documentId}`);
      return null;
    }
  } catch (error) {
    console.error("❌ Error fetching from Firestore:", error);
    throw error;
  }
};

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const setupNotificationChannel = async () => {
  if (Platform.OS === "android") {
    try {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default Notifications",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
        sound: "default",
        enableVibrate: true,
        showBadge: true,
      });
      console.log("✅ Android notification channel created");
      return true;
    } catch (error) {
      console.error("❌ Error creating notification channel:", error);
      return false;
    }
  }
  return true;
};

export const requestUserPermission = async () => {
  try {
    if (!Device.isDevice) {
      console.log("⚠️ Must use physical device for Push Notifications");
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      console.log("📱 Requesting notification permission...");
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("❌ Notification Permission DENIED by user");
      return false;
    }

    console.log("✅ Notification permission granted");
    return true;
  } catch (error) {
    console.error("❌ Error requesting notification permission:", error);
    return false;
  }
};

// MAIN FUNCTION - Get real Expo push token
export const getExpoPushToken = async (userId) => {
  console.log("🚀 STARTING REAL EXPO PUSH TOKEN PROCESS");

  try {
    // 1. Must be physical device
    if (!Device.isDevice) {
      console.log("❌ Cannot get real push tokens on simulator/emulator");
      console.log("💡 Test on a REAL Android/iOS device");
      return null;
    }

    // 2. Get permission
    console.log("🔔 Checking notification permission...");
    const hasPermission = await requestUserPermission();
    if (!hasPermission) {
      console.log("❌ User denied notification permission");
      return null;
    }

    // 3. Setup Android channel
    await setupNotificationChannel();

    // 4. Get the correct projectId from app.json
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    console.log("📋 Project ID from app.json:", projectId);

    if (!projectId) {
      console.log("❌ No projectId found in app.json");
      console.log("💡 Add your correct Project ID from expo.dev to app.json");
      return null;
    }

    // 5. Get Expo Push Token with projectId
    console.log("🎫 Requesting Expo Push Token...");
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId
    });

    const expoPushToken = tokenData?.data;
    
    // 6. Validate the token
    if (!expoPushToken) {
      console.log("❌ No token received from Expo");
      return null;
    }

    if (!expoPushToken.startsWith('ExponentPushToken')) {
      console.log("❌ Invalid token format:", expoPushToken);
      return null;
    }

    console.log("🎉 REAL EXPO PUSH TOKEN OBTAINED!");
    console.log("🔑 Token:", expoPushToken);
    console.log("📱 Platform:", Platform.OS);

    // 7. Save to Firestore - ✅ FIXED: Use 'users' collection consistently
    if (userId) {
      try {
        const db = getFirestore();
        await setDoc(
          doc(db, "users", userId), // ✅ CHANGED: 'user' to 'users'
          {
            expoPushToken: expoPushToken,
            platform: Platform.OS,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        console.log("💾 Token saved to Firestore for user:", userId);
      } catch (firestoreError) {
        console.error("❌ Firestore save error:", firestoreError);
        // Still return token even if save fails
      }
    }

    return expoPushToken;

  } catch (error) {
    console.error("❌ ERROR GETTING PUSH TOKEN:");
    console.error("Error message:", error.message);
    console.error("Full error:", error);
    
    return null;
  }
};

export const notificationListener = () => {
  const foregroundSubscription = Notifications.addNotificationReceivedListener(
    (notification) => {
      console.log("📬 Notification received in foreground:", notification);
    }
  );

  const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    console.log("👆 User tapped notification:", response);
  });

  return () => {
    foregroundSubscription.remove();
    responseSubscription.remove();
  };
};

export const setupTokenRefreshListener = (userId) => {
  console.log("🔄 Setting up token refresh for user:", userId);
  // Your existing refresh logic
};

// TEST: Send a real push notification
export const sendTestPushNotification = async (expoPushToken) => {
  if (!expoPushToken || !expoPushToken.startsWith('ExponentPushToken')) {
    console.log("❌ Cannot send test - no real token provided");
    return false;
  }

  try {
    console.log("📤 Sending test push notification to:", expoPushToken);
    
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{
        to: expoPushToken,
        title: 'Test from Lab App!',
        body: 'This is a real push notification! 🎉',
        sound: 'default',
        data: { test: true, timestamp: new Date().toISOString() },
      }]),
    });

    const result = await response.json();
    console.log("📨 Expo push response:", result);

    if (result.data && result.data.status === 'ok') {
      console.log("✅ Test notification sent successfully!");
      return true;
    } else {
      console.log("❌ Failed to send notification:", result);
      return false;
    }
  } catch (error) {
    console.error("❌ Error sending test notification:", error);
    return false;
  }
};

// Test local notification (always works)
export const testLocalNotification = async () => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Local Test ✅",
        body: "Local notifications are working!",
        sound: 'default',
        data: { test: true },
      },
      trigger: { seconds: 2 },
    });
    console.log("✅ Local test notification scheduled");
    return true;
  } catch (error) {
    console.error("❌ Local notification failed:", error);
    return false;
  }
};

/**
 * Send push notification when driver is assigned - FIXED VERSION
 */
export const sendDriverAssignedNotification = async (userId, notificationData) => {
    try {
        console.log("🎯 Sending driver assigned notification for user:", userId);
        
        // ✅ FIXED: Get user's Expo push token from Firestore
        const userData = await getDataFromFirestore('users', userId); // ✅ Use 'users' collection
        
        if (!userData) {
            console.log("❌ No user data found in Firestore for user:", userId);
            return {
                success: false,
                error: "User not found"
            };
        }

        const expoPushToken = userData?.expoPushToken;
        
        if (!expoPushToken) {
            console.log("❌ No Expo push token found for user:", userId);
            return {
                success: false,
                error: "No push token available"
            };
        }

        console.log("📱 Found Expo token:", expoPushToken);

        // ✅ FIXED: Background notification settings
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to: expoPushToken,
                title: notificationData.title || " partner Assigned!",
                body: notificationData.message || "Your partner has been assigned and is on the way!",
                sound: 'default',
                data: notificationData.data || {
                    type: "driver_assigned",
                    screen: "DriverInfoScreen"
                },
                // ✅ IMPORTANT: Background notification settings
                priority: 'high', // For Android
                ttl: 60, // Time to live in seconds
            }),
        });

        const result = await response.json();
        console.log("📨 Expo push response:", result);

        if (result.data && result.data.status === 'ok') {
            console.log("✅ Driver assigned notification sent successfully!");
            return {
                success: true,
                message: "Notification sent successfully"
            };
        } else {
            console.log("❌ Failed to send notification:", result);
            return {
                success: false,
                error: result.errors || "Unknown error"
            };
        }
    } catch (error) {
        console.error("🔴 Error in sendDriverAssignedNotification:", error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Generic push notification function
 */
export const sendPushNotification = async (userId, notificationData) => {
    return await sendDriverAssignedNotification(userId, notificationData);
};

/**
 * Test function for driver assigned notification
 */
export const testDriverAssignedNotification = async (userId) => {
    console.log("🧪 Testing driver assigned notification...");
    
    // const result = await sendDriverAssignedNotification(userId, {
    //     title: "TEST: Driver Assigned!",
    //     message: "This is a test notification for driver assignment",
    //     data: {
    //         type: "test_driver_assigned",
    //         rideId: "test_ride_123",
    //         driverId: "test_driver_456",
    //         test: true
    //     }
    // });
    
    console.log("🧪 Test result:", result);
    return result;
};

// Background notification setup
export const setupBackgroundNotifications = async () => {
  try {
    await Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    console.log("✅ Background notifications configured");
    return true;
  } catch (error) {
    console.error("❌ Error setting up background notifications:", error);
    return false;
  }
};

// Default export
export default {
  getExpoPushToken,
  notificationListener,
  requestUserPermission,
  setupNotificationChannel,
  setupTokenRefreshListener,
  sendTestPushNotification,
  testLocalNotification,
  sendDriverAssignedNotification,
  sendPushNotification,
  testDriverAssignedNotification,
  setupBackgroundNotifications
};