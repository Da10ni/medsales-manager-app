import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import * as functions from "firebase-functions/v2";
import { RIDE_STATUS } from "../app/types/rideStatus" 


initializeApp();
const auth = getAuth();
const db = getFirestore();

// Define secrets
const twilioSid = process.env.TWILIO_SID;
const twilioAuthToken = process.env.TWILIO_ACCOUNT_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_ACCOUNT_PHONE_NUMBER;
const stripeSecretKey = process.env.STRIPE_ACCOUNT_SECRET_KEY;

export const helloWorld = functions.https.onRequest((req, res) => {
  res.send("Hello from Firebase! Functions are working!");
});

export const sendVerificationCode = functions.https.onCall(
  async (data, context) => {
    const phoneNumber = data?.data?.phoneNumber || data?.phoneNumber;
    console.log("data==>", data);
    console.log("phoneNumber", phoneNumber);

    if (!phoneNumber) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Phone number is required"
      );
    }

    try {
      // Import Twilio only when needed
      const twilio = (await import("twilio")).default;
      const client = twilio(twilioSid, twilioAuthToken);
      console.log("client", client);

      const verificationCode = Math.floor(100000 + Math.random() * 900000);
      const expiresAt = Timestamp.fromDate(
        new Date(Date.now() + 5 * 60 * 1000)
      );

      await db.collection("verificationCodes").doc(phoneNumber).set({
        code: verificationCode,
        expiresAt,
        verified: false,
        createdAt: FieldValue.serverTimestamp(),
      });

      await client.messages.create({
        body: `Your verification code is: ${verificationCode}`,
        from: twilioPhoneNumber,
        to: phoneNumber,
      });

      return { success: true, message: "Verification code sent successfully" };
    } catch (error) {
      console.error("Error sending verification code:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to send verification code"
      );
    }
  }
);

export const verifyPhoneNumber = functions.https.onCall(
  async (data, context) => {
    const phoneNumber = data?.data?.phoneNumber || data?.phoneNumber;
    const code = data?.data?.code || data?.code;
    const role = data?.data?.role || data?.role || "user";

    if (!phoneNumber || !code) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Phone number and code are required"
      );
    }

    if (!role || !["user", "driver"].includes(role)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Role is required and must be either 'user' or 'driver'"
      );
    }

    try {
      // Verify the code from Firestore
      const docRef = db.collection("verificationCodes").doc(phoneNumber);
      const doc = await docRef.get();

      if (!doc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "Verification code not found"
        );
      }

      const docData = doc.data();
      const now = Timestamp.now();

      if (now.toMillis() > docData.expiresAt.toMillis()) {
        throw new functions.https.HttpsError(
          "deadline-exceeded",
          "Verification code has expired"
        );
      }

      if (docData.code !== parseInt(code)) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Invalid verification code"
        );
      }

      if (docData.verified) {
        throw new functions.https.HttpsError(
          "already-exists",
          "Code has already been used"
        );
      }
      await docRef.update({ verified: true });

      // Create or get Firebase Auth user
      let userRecord;
      try {
        userRecord = await auth.getUserByPhoneNumber(phoneNumber);
      } catch (error) {
        userRecord = await auth.createUser({
          phoneNumber: phoneNumber,
        });
      }

      let isCreated = true;
      if (role === "user") {
        const userDoc = await db.collection("user").doc(userRecord.uid).get();
        if (userDoc.exists) {
          // User already exists
          isCreated = false;
          await db.collection("user").doc(userRecord.uid).update({
            verified: true,
            uid: userRecord.uid,
          });
        } else {
          isCreated = true;
          await db.collection("user").doc(userRecord.uid).set({
            phoneNumber: phoneNumber,
            createdAt: FieldValue.serverTimestamp(),
            verified: true,
            firstName: "",
            lastName: "",
            profilePicture: "",
            uid: userRecord.uid,
            stripeCustomerId: null,
          });
        }
      } else if (role === "driver") {
        const driverDoc = await db
          .collection("drivers")
          .doc(userRecord.uid)
          .get();
        if (driverDoc.exists) {
          isCreated = false;
          await db.collection("drivers").doc(userRecord.uid).update({
            verified: true,
            uid: userRecord.uid,
          });
        } else {
          isCreated = true;

          await db.collection("drivers").doc(userRecord.uid).set({
            phoneNumber: phoneNumber,
            createdAt: FieldValue.serverTimestamp(),
            verified: true,
            firstName: "",
            lastName: "",
            profilePicture: "",
            uid: userRecord.uid,
          });
        }
      }
      const customToken = await auth.createCustomToken(userRecord.uid, {
        role: role,
        phoneNumber: phoneNumber,
      });

      await docRef.delete();

      return {
        success: true,
        customToken: customToken,
        uid: userRecord.uid,
        role: role,
        isCreated: isCreated,
        message: `Phone number verified successfully. ${isCreated ? "New" : "Existing"} ${role} ${isCreated ? "created" : "updated"}.`,
      };
    } catch (error) {
      console.error("Error verifying phone number:", error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError(
        "internal",
        "Failed to verify phone number"
      );
    }
  }
);

export const resendVerificationCode = functions.https.onCall(
  async (data, context) => {
    const phoneNumber = data?.data?.phoneNumber || data?.phoneNumber;

    if (!phoneNumber) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Phone number is required"
      );
    }

    try {
      // Import Twilio only when needed
      const twilio = (await import("twilio")).default;
      const client = twilio(twilioSid, twilioAuthToken);

      const docRef = db.collection("verificationCodes").doc(phoneNumber);
      const doc = await docRef.get();

      if (doc.exists) {
        const docData = doc.data();
        const now = Timestamp.now();
        const timeDiff = now.toMillis() - docData.createdAt.toMillis();
        if (timeDiff < 60000) {
          throw new functions.https.HttpsError(
            "resource-exhausted",
            "Please wait before requesting another code"
          );
        }
      }

      const verificationCode = Math.floor(100000 + Math.random() * 900000);
      const expiresAt = Timestamp.fromDate(
        new Date(Date.now() + 5 * 60 * 1000)
      );

      await docRef.set({
        code: verificationCode,
        expiresAt,
        verified: false,
        createdAt: FieldValue.serverTimestamp(),
      });

      await client.messages.create({
        body: `Your verification code is: ${verificationCode}`,
        from: twilioPhoneNumber,
        to: phoneNumber,
      });

      return {
        success: true,
        message: "Verification code resent successfully",
      };
    } catch (error) {
      console.error("Error resending verification code:", error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError(
        "internal",
        "Failed to resend verification code"
      );
    }
  }
);

export const createStripeCustomer = functions.https.onCall(
  async (data, context) => {
    const Stripe = (await import("stripe")).default;
    if (!stripeSecretKey) {
      console.error("❌ STRIPE_ACCOUNT_SECRET_KEY is not set!");
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Stripe secret key is not configured"
      );
    }
    const stripe = new Stripe(stripeSecretKey);
    console.log("✅ Stripe initialized successfully");
    const phoneNumber = data?.data?.phoneNumber || data?.phoneNumber;
    const uid = data?.data?.uid || data?.uid;
    const customer = await stripe.customers.create({
      phone: phoneNumber,
    });

    if (!customer?.id) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Stripe customer creation failed"
      );
    }

    const userDoc = db.collection("user").doc(uid);
    await userDoc.update(
      {
        stripeCustomerId: customer.id,
      },
      { merge: true }
    );

    return {
      customerId: customer.id,
    };
  }
);

export const getClientSecretFromStripe = functions.https.onCall(
  async (data, context) => {
    const stripeCustomerID = data?.data?.customerId || data?.customerId;
    if (!stripeCustomerID) {
      console.error("❌ STRIPE_ACCOUNT_SECRET_KEY is not set!");
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Stripe secret key is not configured"
      );
    }
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(stripeSecretKey);
    const stripeIntent = await stripe.setupIntents.create({
      customer: stripeCustomerID,
      payment_method_types: ["card"],
    });
    if (!stripeIntent?.client_secret) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Stripe client secret creation failed"
      );
    }

    return {
      clientSecret: stripeIntent.client_secret,
    };
  }
);

export const createPaymentIntent = functions.https.onCall(
  async (data, context) => {
    // ============ DEBUGGING LOGS START ============
    console.log("🔵 createPaymentIntent CALLED");
    console.log("📦 Raw data received:", data);
    console.log("📦 Data type:", typeof data);
    console.log(
      "📦 Data keys:",
      data ? Object.keys(data) : "data is null/undefined"
    );

    // Check if data is nested
    if (data?.data) {
      console.log("📦 Found nested data.data:", JSON.stringify(data.data));
    }

    // Context info
    console.log(
      "👤 Auth context:",
      context.auth ? "Authenticated" : "Not authenticated"
    );
    console.log("👤 User ID:", context.auth?.uid || "No user ID");

    try {
      // ============ STRIPE INITIALIZATION ============
      console.log("💳 Initializing Stripe...");
      const Stripe = (await import("stripe")).default;

      if (!stripeSecretKey) {
        console.error("❌ STRIPE_ACCOUNT_SECRET_KEY is not set!");
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Stripe secret key is not configured"
        );
      }

      const stripe = new Stripe(stripeSecretKey);
      console.log("✅ Stripe initialized successfully");

      // ============ DATA EXTRACTION WITH FALLBACKS ============
      // Try multiple ways to get the data (handle both nested and direct)
      let amount = data?.amount;
      let currency = data?.currency;
      let customerId = data?.customerId;

      // Check if data is nested (common in Firebase Functions)
      if (!amount && data?.data) {
        console.log("🔄 Trying to extract from nested data.data...");
        amount = data.data.amount;
        currency = data.data.currency;
        customerId = data.data.customerId;
      }

      // Set defaults
      currency = currency || "usd";

      console.log("📊 Extracted values:");
      console.log("  - amount:", amount, `(type: ${typeof amount})`);
      console.log("  - currency:", currency);
      console.log("  - customerId:", customerId || "not provided");

      // ============ AMOUNT VALIDATION & CONVERSION ============
      // Convert amount to number if it's a string
      let amountNumber;

      if (typeof amount === "string") {
        console.log("🔄 Converting string amount to number...");
        amountNumber = parseFloat(amount);
      } else if (typeof amount === "number") {
        amountNumber = amount;
      } else {
        console.error("❌ Invalid amount type:", typeof amount);
        throw new functions.https.HttpsError(
          "invalid-argument",
          `Amount must be a number or string, received: ${typeof amount}`
        );
      }

      console.log("🔢 Amount as number:", amountNumber);

      // Validate the number
      if (isNaN(amountNumber)) {
        console.error("❌ Amount is NaN after conversion");
        throw new functions.https.HttpsError(
          "invalid-argument",
          `Invalid amount: ${amount} could not be converted to a number`
        );
      }

      if (amountNumber <= 0) {
        console.error("❌ Amount must be greater than 0");
        throw new functions.https.HttpsError(
          "invalid-argument",
          `Amount must be greater than 0, received: ${amountNumber}`
        );
      }

      // Check if amount is reasonable (prevent mistakes)
      if (amountNumber > 999999) {
        console.warn("⚠️ Unusually large amount:", amountNumber);
        throw new functions.https.HttpsError(
          "invalid-argument",
          `Amount seems too large: ${amountNumber}. Please verify.`
        );
      }

      // ============ CONVERT TO CENTS ============
      // Stripe expects amount in cents (smallest currency unit)
      const amountInCents = Math.round(amountNumber * 100);
      console.log(
        "💰 Amount in cents:",
        amountInCents,
        `($${(amountInCents / 100).toFixed(2)})`
      );

      // Final validation
      if (amountInCents < 50) {
        // Stripe minimum is 50 cents
        console.error("❌ Amount is below Stripe minimum (50 cents)");
        throw new functions.https.HttpsError(
          "invalid-argument",
          `Amount must be at least $0.50, received: $${(amountInCents / 100).toFixed(2)}`
        );
      }

      // ============ CREATE PAYMENT INTENT ============
      console.log("🚀 Creating payment intent...");

      const paymentIntentParams = {
        amount: amountInCents,
        currency: currency.toLowerCase(),
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          created_by: context.auth?.uid || "anonymous",
          created_at: new Date().toISOString(),
        },
      };

      // Only add customer if provided and valid
      if (
        customerId &&
        typeof customerId === "string" &&
        customerId.startsWith("cus_")
      ) {
        console.log("👤 Adding customer ID to payment intent:", customerId);
        paymentIntentParams.customer = customerId;
      } else if (customerId) {
        console.warn("⚠️ Invalid customer ID format:", customerId);
      }

      console.log(
        "📋 Payment intent params:",
        JSON.stringify(paymentIntentParams)
      );

      const paymentIntent =
        await stripe.paymentIntents.create(paymentIntentParams);

      console.log("✅ Payment intent created successfully!");
      console.log("  - ID:", paymentIntent.id);
      console.log("  - Amount:", paymentIntent.amount, "cents");
      console.log("  - Status:", paymentIntent.status);
      console.log(
        "  - Client Secret:",
        paymentIntent.client_secret ? "Generated" : "Missing"
      );

      // ============ RETURN SUCCESS ============
      const response = {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
      };

      console.log("✅ Returning response to client");
      return response;
    } catch (error) {
      // ============ ERROR HANDLING ============
      console.error("❌ ERROR in createPaymentIntent:");
      console.error("  - Name:", error.name);
      console.error("  - Message:", error.message);
      console.error("  - Code:", error.code);
      console.error("  - Type:", error.type);
      console.error("  - Stack:", error.stack);

      // If it's already a Firebase HttpsError, throw it as-is
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      // If it's a Stripe error, provide better message
      if (error.type === "StripeCardError") {
        throw new functions.https.HttpsError(
          "invalid-argument",
          `Card error: ${error.message}`
        );
      }

      if (error.type === "StripeInvalidRequestError") {
        throw new functions.https.HttpsError(
          "invalid-argument",
          `Invalid request: ${error.message}`
        );
      }

      // Generic error
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to create payment intent"
      );
    }
  }
);

export const deletePaymentMethodFromStripe = functions.https.onCall(
  async (data, context) => {
    const paymentMethodId =
      data?.data?.paymentMethodId || data?.paymentMethodId;
    if (!paymentMethodId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Payment Method Id is required"
      );
    }
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(stripeSecretKey);
    try {
      const detached = await stripe.paymentMethods.detach(paymentMethodId);
      return { success: true, detached };
    } catch (error) {
      console.error("❌ Error detaching payment method:", error);
      throw new functions.https.HttpsError(
        "unknown",
        "Failed to delete payment method"
      );
    }
  }
);
// ========== REPLACE getPaymentMethods function (Line 398-417) ==========
export const getPaymentMethods = functions.https.onCall(
  async (data, context) => {
    console.log("🔵 getPaymentMethods CALLED");
    console.log("📦 Raw data received:", data);

    try {
      // Import Stripe only when needed
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(stripeSecretKey);

      // Handle both nested and direct data
      const customerId = data?.data?.customerId || data?.customerId;

      console.log("📊 Customer ID:", customerId);

      // Validation
      if (!customerId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Customer ID is required"
        );
      }

      if (!customerId.startsWith("cus_")) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          `Invalid customer ID format: ${customerId}`
        );
      }

      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: "card",
      });

      console.log("✅ Payment methods retrieved:", paymentMethods.data.length);

      return {
        paymentMethods: paymentMethods.data,
      };
    } catch (error) {
      console.error("❌ ERROR in getPaymentMethods:", error.message);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError("internal", error.message);
    }
  }
);

// ========== REPLACE attachPaymentMethod function (Line 420-437) ==========
export const attachPaymentMethod = functions.https.onCall(
  async (data, context) => {
    console.log("🔵 attachPaymentMethod CALLED");
    console.log("📦 Raw data received:", data);

    try {
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(stripeSecretKey);
      const paymentMethodId =
        data?.data?.paymentMethodId || data?.paymentMethodId;
      const customerId = data?.data?.customerId || data?.customerId;

      console.log("📊 Extracted values:");
      console.log("  - paymentMethodId:", paymentMethodId);
      console.log("  - customerId:", customerId);

      if (!paymentMethodId || !customerId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Both paymentMethodId and customerId are required"
        );
      }

      if (!paymentMethodId.startsWith("pm_")) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          `Invalid payment method ID format: ${paymentMethodId}`
        );
      }

      if (!customerId.startsWith("cus_")) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          `Invalid customer ID format: ${customerId}`
        );
      }

      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      console.log("✅ Payment method attached successfully");

      return { success: true };
    } catch (error) {
      console.error("❌ ERROR in attachPaymentMethod:", error.message);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError("internal", error.message);
    }
  }
);

export const chargeCustomer = functions.https.onCall(async (data, context) => {
  const stripeCustomerId = data?.data?.customerId || data?.customerId;
  const payAmount = data?.data?.amount | data?.amount;
  const payCurrencuy = data?.data?.currency || data?.currency;
  const stripePaymentMethodsId =
    data?.data?.paymentMethodId || data?.paymentMethodId;
  console.log("data?.data ", data?.data);
  if (
    !stripeCustomerId ||
    !payAmount ||
    !payCurrencuy ||
    !stripePaymentMethodsId
  ) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Missing required parameters."
    );
  }
  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(stripeSecretKey);
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(payAmount * 100),
      currency: payCurrencuy,
      customer: stripeCustomerId,
      payment_method: stripePaymentMethodsId,
      off_session: true,
      confirm: true,
    });

    console.log("paymentIntent", paymentIntent);

    return {
      success: true,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
    };
  } catch (error) {
    if (error.code === "authentication_required") {
      return {
        success: false,
        requiresAction: true,
        paymentIntentClientSecret: error.raw.payment_intent.client_secret,
      };
    }
    throw new functions.https.HttpsError("internal", error.message);
  }
});


export const getCustomToken = functions.https.onCall(async (data, context) => {
  throw new functions.https.HttpsError(
    "unimplemented",
    "This function is deprecated."
  );
});

// Add this to the top of your Firebase Functions file
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));


// Modified sendNotificationToUser function for Expo
export const sendNotificationToUser = functions.https.onCall(
  async (data, context) => {
    try {
      // Handle both nested and direct data structures
      const userId = data?.data?.userId || data?.userId;
      const title = data?.data?.title || data?.title;
      const body = data?.data?.body || data?.body;
      const customData = data?.data?.data || data?.data || {};

      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`📤 SEND NOTIFICATION TO USER`);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("userId:", userId);
      console.log("title:", title);
      console.log("body:", body);

      // Validate userId
      if (!userId || typeof userId !== "string" || userId.trim() === "") {
        console.error("❌ Invalid userId provided");
        throw new functions.https.HttpsError(
          "invalid-argument",
          "userId is required and must be a valid string"
        );
      }

      // Get user's Expo Push Token from Firestore
      console.log("🔍 Looking up user in Firestore...");
      const userDoc = await db.collection("user").doc(userId).get();

      if (!userDoc.exists) {
        console.error("❌ User not found in Firestore:", userId);
        throw new functions.https.HttpsError("not-found", "User not found");
      }

      console.log("✅ User found in Firestore");

      // Get the Expo Push Token (not FCM token)
      const expoPushToken = userDoc.data()?.expoPushToken;
      console.log("🎫 Expo Push Token:", expoPushToken);

      if (!expoPushToken) {
        console.error("❌ No Expo Push Token found for user:", userId);
        console.log("User data:", JSON.stringify(userDoc.data()));
        throw new functions.https.HttpsError(
          "not-found",
          "Expo Push Token not found for this user"
        );
      }

      // Validate token format
      if (!expoPushToken.startsWith("ExponentPushToken[")) {
        console.warn(
          "⚠️ Token doesn't look like a valid Expo token:",
          expoPushToken
        );
      }

      // Prepare Expo notification message
      const message = {
        to: expoPushToken,
        sound: "default",
        title: title,
        body: body,
        data: customData || {},
        priority: "high",
        channelId: "default", // Android only
      };

      console.log("📨 Sending to Expo Push API...");
      console.log("Message:", JSON.stringify(message, null, 2));

      // Send via Expo Push Notification Service
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      });

      console.log("📡 Expo API Response Status:", response.status);

      const responseData = await response.json();
      console.log(
        "📦 Expo API Response Data:",
        JSON.stringify(responseData, null, 2)
      );

      // Check if there were any errors from Expo
      if (responseData.data && responseData.data[0]) {
        const ticket = responseData.data[0];
        if (ticket.status === "error") {
          console.error("❌ Expo returned an error:", ticket.message);
          console.error("Error details:", ticket.details);
          throw new functions.https.HttpsError(
            "internal",
            `Expo notification failed: ${ticket.message}`
          );
        } else if (ticket.status === "ok") {
          console.log("✅ Expo accepted the notification with ID:", ticket.id);
        }
      }

      console.log("✅ Notification request completed successfully");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

      return {
        success: true,
        response: responseData,
        recipient: userId,
      };
    } catch (error) {
      console.error("❌ Error sending notification:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  }
);

// Modified sendNotificationToMultipleUsers for Expo
export const sendNotificationToMultipleUsers = functions.https.onCall(
  async (data, context) => {
    try {
      const { userIds, title, body, data: customData } = data;

      console.log(`📤 Sending Expo notifications to ${userIds.length} users`);

      // Get all Expo Push Tokens
      const tokens = [];
      for (const userId of userIds) {
        const userDoc = await db.collection("user").doc(userId).get();

        if (userDoc.exists && userDoc.data()?.expoPushToken) {
          tokens.push(userDoc.data().expoPushToken);
        }
      }

      if (tokens.length === 0) {
        throw new functions.https.HttpsError(
          "not-found",
          "No valid Expo Push Tokens found"
        );
      }

      // Prepare messages array for Expo
      const messages = tokens.map((token) => ({
        to: token,
        sound: "default",
        title: title,
        body: body,
        data: customData || {},
        priority: "high",
        channelId: "default", // Android only
      }));

      // Send to multiple devices via Expo Push Service
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messages),
      });

      const responseData = await response.json();
      console.log("✅ Expo notifications response:", responseData);

      return {
        success: true,
        response: responseData,
        totalRecipients: userIds.length,
      };
    } catch (error) {
      console.error("❌ Error sending notifications:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  }
);

// Modified onRideCreated function
export const onRideCreated = onDocumentCreated(
  "rides/{rideId}",
  async (event) => {
    const snapshot = event.data;
    const rideData = snapshot.data();
    const driverId = rideData.driverId;
    const userId = rideData.userId;

    console.log("🚗 New ride created:", event.params.rideId);

    if (!driverId && !userId) {
      console.log("No driverId or userId found in new ride");
      return;
    }

    try {
      // Determine who to notify (driver or user)
      const recipientId = driverId || userId;
      const recipientType = driverId ? "driver" : "user";
      const collectionName = driverId ? "drivers" : "user";

      // Fetch recipient's Expo Push Token
      const recipientDoc = await db
        .collection(collectionName)
        .doc(recipientId)
        .get();

      if (!recipientDoc.exists) {
        console.log(`${recipientType} document not found:`, recipientId);
        return;
      }

      const expoPushToken = recipientDoc.data()?.expoPushToken;

      if (!expoPushToken) {
        console.log(
          `No Expo Push token found for ${recipientType}:`,
          recipientId
        );
        return;
      }

      // Prepare Expo notification
      const message = {
        to: expoPushToken,
        sound: "default",
        title: "🚗 New Ride Request!",
        body: `Pickup from ${rideData.pickupLocation || "unknown location"}`,
        data: {
          type: "ride_request",
          rideId: event.params.rideId,
          pickupLocation: rideData.pickupLocation || "",
          dropoffLocation: rideData.dropoffLocation || "",
        },
        priority: "high",
        channelId: "default", // Android only
      };

      // Send via Expo Push Notification Service
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      });

      const responseData = await response.json();
      console.log(
        `✅ Expo notification sent to ${recipientType}:`,
        recipientId,
        "Response:",
        responseData
      );
    } catch (error) {
      console.error("❌ Error sending ride notification:", error);
    }
  }
);

// Modified onRideAccepted function
export const onRideAccepted = onDocumentUpdated(
  "rides/{rideId}",
  async (event) => {
    const beforeData = event.data.before.data();
    const afterData = event.data.after.data();

    // NEW CODE: Check if status changed to DRIVER_ASSIGNED (2)
    if (
      beforeData.status !== RIDE_STATUS.DRIVER_ASSIGNED &&
      afterData.status === RIDE_STATUS.DRIVER_ASSIGNED 
    ) {
      console.log(
        "🔔 Status changed to DRIVER_ASSIGNED (2). Sending notification..."
      );
      const userId = afterData.userId;
      const rideId = event.params.rideId;

      console.log("✅ Ride accepted! Notifying user:", userId);

      try {
        // Get user's Expo Push Token
        const userDoc = await db.collection("user").doc(userId).get();

        if (!userDoc.exists) {
          console.log("User not found:", userId);
          return;
        }

        const expoPushToken = userDoc.data()?.expoPushToken;

        if (!expoPushToken) {
          console.log("No Expo Push Token found for user:", userId);
          return;
        }

        // Get driver details if available
        const driverName = afterData.assignedDriverDetails?.firstName
          ? `${afterData.assignedDriverDetails.firstName}`
          : "Your driver";

        // Prepare Expo notification
        const message = {
          to: expoPushToken,
          sound: "default",
          title: "🎉 Driver Found!",
          body: `${driverName} accepted your ride request and is on the way!`,
          data: {
            type: "ride_accepted",
            rideId: rideId,
            driverName: driverName,
            status: "assigned",
          },
          badge: 1, // iOS only
          priority: "high",
          channelId: "default", // Android only
        };

        // Send notification via Expo
        const response = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(message),
        });

        const responseData = await response.json();
        console.log("✅ Driver acceptance notification sent:", responseData);

        return { success: true, response: responseData };
      } catch (error) {
        console.error(
          "❌ Error sending driver acceptance notification:",
          error
        );
        return { success: false, error: error.message };
      }
    }

    return null;
  }
);