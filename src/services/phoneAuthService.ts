import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

// Generate random 6-digit OTP
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send verification code (save to Firestore)
export const sendVerificationCode = async (phoneNumber: string) => {
  try {
    const code = generateOTP();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes expiry

    await setDoc(doc(db, 'verificationCodes', phoneNumber), {
      code: code,
      phoneNumber: phoneNumber,
      createdAt: Timestamp.now(),
      expiresAt: Timestamp.fromDate(expiresAt),
    });

    console.log(`OTP for ${phoneNumber}: ${code}`);
    return { success: true, code }; // Return code for testing
  } catch (error: any) {
    console.error('Error sending verification code:', error);
    throw new Error('Failed to send verification code');
  }
};

// Verify phone number and OTP
export const verifyPhoneNumber = async (phoneNumber: string, code: string) => {
  try {
    // Check verification code
    const codeDocRef = doc(db, 'verificationCodes', phoneNumber);
    const codeDoc = await getDoc(codeDocRef);

    if (!codeDoc.exists()) {
      throw new Error('Verification code not found. Please request a new code.');
    }

    const codeData = codeDoc.data();
    const storedCode = codeData.code;
    const expiresAt = codeData.expiresAt.toDate();

    // Check if code expired
    if (new Date() > expiresAt) {
      throw new Error('Verification code has expired. Please request a new code.');
    }

    // Verify code (trim whitespace)
    if (storedCode.trim() !== code.trim()) {
      throw new Error('Invalid verification code. Please try again.');
    }

    // Check if manager exists
    const managerRef = doc(db, 'managers', phoneNumber);
    const managerDoc = await getDoc(managerRef);

    let isCreated = false;

    if (!managerDoc.exists()) {
      // Manager account not found - Block self-registration
      throw new Error(
        'No manager account found with this phone number. Please contact your administrator to create your account.'
      );
    }

    return {
      success: true,
      isCreated,
      user: {
        uid: phoneNumber,
        phoneNumber: phoneNumber,
      },
    };
  } catch (error: any) {
    console.error('Error verifying phone number:', error);
    throw error;
  }
};

// Get manager by phone
export const getManagerByPhone = async (phoneNumber: string) => {
  try {
    const managerDoc = await getDoc(doc(db, 'managers', phoneNumber));

    if (!managerDoc.exists()) {
      return null;
    }

    return {
      id: managerDoc.id,
      ...managerDoc.data(),
    };
  } catch (error: any) {
    console.error('Error getting manager:', error);
    throw error;
  }
};

// Create or update manager
export const createOrUpdateManager = async (phoneNumber: string, data: any) => {
  try {
    await setDoc(doc(db, 'managers', phoneNumber), data, { merge: true });
    return { success: true };
  } catch (error: any) {
    console.error('Error updating manager:', error);
    throw error;
  }
};
