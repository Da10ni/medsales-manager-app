# Manager App - Complete Setup Guide

This guide will help you set up and run the Manager App from scratch.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

1. **Node.js** (v16 or higher)
   - Download from: https://nodejs.org/
   - Verify: `node --version`

2. **npm** (comes with Node.js)
   - Verify: `npm --version`

3. **Expo CLI** (optional, but recommended)
   ```bash
   npm install -g expo-cli
   ```

4. **Expo Go App** on your phone
   - Android: https://play.google.com/store/apps/details?id=host.exp.exponent
   - iOS: https://apps.apple.com/app/expo-go/id982107779

5. **Firebase Account**
   - Sign up at: https://firebase.google.com/

## 🔥 Firebase Setup (CRITICAL)

### Step 1: Create Firebase Project

1. Go to https://console.firebase.google.com/
2. Click "Add Project"
3. Enter project name: `medsales-manager`
4. Disable Google Analytics (optional)
5. Click "Create Project"

### Step 2: Enable Authentication

1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Enable **Email/Password** provider
3. Click "Save"

### Step 3: Create Firestore Database

1. Go to **Firestore Database** → **Create Database**
2. Select **Start in test mode** (for development)
3. Choose your location (closest to you)
4. Click "Enable"

### Step 4: Set Up Firestore Collections

Click **Start collection** and create these collections:

#### Collection: `managers`
- Document ID: Auto-ID
- Fields:
  ```
  name: string
  email: string
  phone: string
  createdAt: timestamp
  ```

#### Collection: `salesReps`
- Document ID: Auto-ID
- Fields:
  ```
  name: string
  email: string
  phone: string
  managerId: string
  status: string (available/on-route/on-break/offline)
  isActive: boolean
  currentRoute: string (optional)
  currentLocation: map { lat: number, lng: number }
  stats: map {
    totalVisits: number
    completedRoutes: number
    totalDistance: number
    rating: number
  }
  createdAt: timestamp
  ```

#### Collection: `locations`
- Document ID: Auto-ID
- Fields:
  ```
  name: string
  type: string (hospital/lab/clinic/pharmacy)
  address: string
  coordinates: map { lat: number, lng: number }
  contactPerson: string
  phone: string
  email: string
  tags: array
  createdBy: string (managerId)
  totalVisits: number
  createdAt: timestamp
  ```

#### Collection: `routes`
- Document ID: Auto-ID
- Fields:
  ```
  routeName: string
  assignedTo: string (salesRepId)
  assignedBy: string (managerId)
  date: timestamp
  status: string (assigned/in-progress/completed/cancelled)
  locations: array (of route location objects)
  totalDistance: string
  estimatedTotalTime: string
  createdAt: timestamp
  ```

### Step 5: Get Firebase Config

1. Go to **Project Settings** (gear icon)
2. Scroll down to **Your apps**
3. Click **Web** icon (</>)
4. Register app name: `manager-app`
5. Copy the Firebase config object

It looks like this:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:xxxxxxxxxxxxx"
};
```

### Step 6: Update Firebase Config in App

1. Open `manager-app/src/services/firebase.ts`
2. Replace the placeholder config with your actual Firebase config:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "YOUR_ACTUAL_AUTH_DOMAIN",
  projectId: "YOUR_ACTUAL_PROJECT_ID",
  storageBucket: "YOUR_ACTUAL_STORAGE_BUCKET",
  messagingSenderId: "YOUR_ACTUAL_SENDER_ID",
  appId: "YOUR_ACTUAL_APP_ID"
};
```

### Step 7: Set Up Security Rules (Production)

When ready for production, update Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function
    function isAuthenticated() {
      return request.auth != null;
    }

    function isManager(managerId) {
      return isAuthenticated() && request.auth.uid == managerId;
    }

    // Managers collection
    match /managers/{managerId} {
      allow read, write: if isManager(managerId);
    }

    // Sales Reps - only the assigned manager can access
    match /salesReps/{repId} {
      allow read, write: if isAuthenticated() &&
        get(/databases/$(database)/documents/salesReps/$(repId)).data.managerId == request.auth.uid;
    }

    // Locations - only the creator can access
    match /locations/{locationId} {
      allow read, write: if isAuthenticated() &&
        get(/databases/$(database)/documents/locations/$(locationId)).data.createdBy == request.auth.uid;
    }

    // Routes - only the assigning manager can access
    match /routes/{routeId} {
      allow read, write: if isAuthenticated() &&
        get(/databases/$(database)/documents/routes/$(routeId)).data.assignedBy == request.auth.uid;
    }

    // Route Templates
    match /routeTemplates/{templateId} {
      allow read, write: if isAuthenticated();
    }
  }
}
```

## 💻 App Installation

### Step 1: Navigate to Directory

```bash
cd manager-app
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages including:
- React Native
- Redux Toolkit
- Firebase
- React Navigation
- React Native Paper
- And more...

### Step 3: Verify Installation

Check if all packages are installed:
```bash
npm list --depth=0
```

## 🚀 Running the App

### Start Development Server

```bash
npm start
```

or

```bash
expo start
```

This will:
1. Start the Metro bundler
2. Show a QR code in the terminal
3. Open Expo DevTools in your browser

### Run on Your Device

#### Option 1: Physical Device (Recommended)
1. Install "Expo Go" app from App Store (iOS) or Play Store (Android)
2. Scan the QR code from terminal
3. App will load on your device

#### Option 2: Android Emulator
1. Install Android Studio
2. Set up Android emulator
3. Press `a` in terminal to run on Android

#### Option 3: iOS Simulator (Mac only)
1. Install Xcode
2. Press `i` in terminal to run on iOS

## 🧪 Testing the App

### Step 1: Create Test Manager Account

1. In Firebase Console → Authentication → Users
2. Click "Add user"
3. Email: `manager@test.com`
4. Password: `Test123!`
5. Click "Add user"

### Step 2: Create Manager Profile in Firestore

1. Go to Firestore Database
2. Collection: `managers`
3. Document ID: Copy the UID from Authentication users
4. Add fields:
   ```
   name: "Test Manager"
   email: "manager@test.com"
   phone: "+92-300-1234567"
   createdAt: [Click "Add timestamp"]
   ```

### Step 3: Add Sample Sales Rep

1. Collection: `salesReps`
2. Auto-generate Document ID
3. Add fields:
   ```
   name: "Ahmed Khan"
   email: "ahmed@sales.com"
   phone: "+92-301-1234567"
   managerId: [Manager's UID from step 2]
   status: "available"
   isActive: true
   currentLocation: {
     lat: 24.8607
     lng: 67.0011
   }
   stats: {
     totalVisits: 15
     completedRoutes: 5
     totalDistance: 120.5
     rating: 4.5
   }
   createdAt: [timestamp]
   ```

### Step 4: Add Sample Locations

#### Location 1: Hospital
```
name: "Aga Khan University Hospital"
type: "hospital"
address: "Stadium Road, Karachi"
coordinates: {
  lat: 24.8934
  lng: 67.0721
}
contactPerson: "Dr. Ahmed"
phone: "+92-21-34864000"
tags: ["premium", "university"]
createdBy: [Manager's UID]
totalVisits: 0
createdAt: [timestamp]
```

#### Location 2: Lab
```
name: "Chughtai Lab"
type: "lab"
address: "Shahrah-e-Faisal, Karachi"
coordinates: {
  lat: 24.8745
  lng: 67.0612
}
contactPerson: "Lab Manager"
phone: "+92-21-111-456-789"
tags: ["diagnostic", "chain"]
createdBy: [Manager's UID]
totalVisits: 0
createdAt: [timestamp]
```

### Step 5: Login and Test

1. Launch the app
2. Login with:
   - Email: `manager@test.com`
   - Password: `Test123!`
3. You should see:
   - Dashboard with stats
   - 1 Sales Rep in Sales Reps tab
   - 2 Locations
4. Test Route Assignment:
   - Go to Dashboard
   - Click "Assign Route"
   - Select "Ahmed Khan"
   - Enter route name: "Shahrah-e-Faisal Morning Route"
   - Select both locations
   - Review and Assign

## 🔧 Troubleshooting

### Issue: "Unable to resolve module"
**Solution:**
```bash
expo start -c
```
(This clears the cache)

### Issue: Firebase connection error
**Solution:**
- Verify Firebase config is correct
- Check internet connection
- Ensure Firebase project is active

### Issue: App crashes on startup
**Solution:**
```bash
rm -rf node_modules
npm install
expo start -c
```

### Issue: "Invariant Violation: Module AppRegistry is not registered"
**Solution:**
- Restart Metro bundler
- Clear cache: `expo start -c`

### Issue: Can't scan QR code
**Solution:**
- Make sure phone and computer are on same WiFi network
- Try tunnel mode: `expo start --tunnel`

## 📱 App Usage

### Login
- Use your Firebase authenticated email/password

### Dashboard
- View overview statistics
- Quick access to common actions
- See active routes

### Sales Reps
- View all sales representatives
- Add new reps
- Assign routes to reps
- View rep performance

### Assign Route
1. Select sales representative
2. Enter route name
3. Select locations to visit
4. Reorder locations as needed
5. Review and assign

## 🎯 Next Steps

After successful setup:

1. **Customize Theme**: Edit colors in `src/navigation/AppNavigator.tsx`
2. **Add More Features**: Implement remaining screens
3. **Enable Push Notifications**: Set up Firebase Cloud Messaging
4. **Add Maps**: Integrate Google Maps API for route visualization
5. **Deploy**: Build production APK/IPA

## 📞 Support

If you encounter any issues:
1. Check Firebase Console for errors
2. Review logs in terminal
3. Check Expo DevTools
4. Clear cache and reinstall dependencies

---

**Ready to manage your medical sales team! 🚀**
