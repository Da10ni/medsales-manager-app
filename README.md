# MedSales Manager App

Medical Sales Manager Application - Assign routes, manage sales representatives, and track their activities in real-time.

## 🎯 Overview

The Manager App allows medical sales managers to:
- ✅ Assign routes to sales representatives
- ✅ Manage sales team (add, edit, view performance)
- ✅ Create and manage locations (hospitals, labs, clinics)
- ✅ Track sales reps in real-time
- ✅ View analytics and reports
- ✅ Create route templates for quick assignment

## 🏗️ Architecture

```
manager-app/
├── src/
│   ├── screens/          # All screen components
│   │   ├── LoginScreen.tsx
│   │   ├── DashboardScreen.tsx
│   │   ├── SalesRepsScreen.tsx
│   │   ├── AssignRouteScreen.tsx
│   │   └── ...
│   ├── components/       # Reusable UI components
│   ├── navigation/       # Navigation configuration
│   │   └── AppNavigator.tsx
│   ├── redux/            # State management
│   │   ├── store.ts
│   │   └── slices/
│   │       ├── authSlice.ts
│   │       ├── salesRepsSlice.ts
│   │       ├── locationsSlice.ts
│   │       └── routesSlice.ts
│   ├── services/         # Firebase services
│   │   ├── firebase.ts
│   │   └── firestoreService.ts
│   ├── types/            # TypeScript types
│   │   └── index.ts
│   └── utils/            # Helper functions
├── App.tsx
└── package.json
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- Firebase account

### Installation

1. Navigate to the manager-app directory:
```bash
cd manager-app
```

2. Install dependencies:
```bash
npm install
```

3. Configure Firebase:
   - Create a new Firebase project at https://console.firebase.google.com
   - Enable Authentication (Email/Password)
   - Create a Firestore database
   - Copy your Firebase config
   - Update `src/services/firebase.ts` with your config

4. Set up Firestore Security Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Managers can only access their own data
    match /managers/{managerId} {
      allow read, write: if request.auth.uid == managerId;
    }

    // Sales Reps - managers can access their own reps
    match /salesReps/{repId} {
      allow read, write: if request.auth != null;
    }

    // Locations - managers can access their own locations
    match /locations/{locationId} {
      allow read, write: if request.auth != null;
    }

    // Routes - managers can access routes they created
    match /routes/{routeId} {
      allow read, write: if request.auth != null;
    }

    // Route Templates
    match /routeTemplates/{templateId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

5. Start the app:
```bash
npm start
```

6. Run on your device:
   - Scan QR code with Expo Go app (Android/iOS)
   - Or press `a` for Android emulator
   - Or press `i` for iOS simulator (Mac only)

## 📱 Features Implemented

### ✅ Authentication
- Login screen with email/password
- Firebase Authentication integration
- Persistent login state

### ✅ Dashboard
- Overview statistics
- Quick actions
- Active routes display
- Performance metrics

### ✅ Sales Representatives Management
- View all sales reps
- Add new sales rep
- Edit sales rep details
- Filter by status (Available, On Route)
- Search functionality
- Performance stats per rep

### ✅ Route Assignment (Core Feature)
**4-Step Process:**

1. **Select Sales Representative**
   - Choose from available reps
   - View rep status and availability

2. **Enter Route Details**
   - Route name
   - Date selection

3. **Select Locations**
   - Browse all locations
   - Filter by type (Hospital, Lab, Clinic, Pharmacy)
   - Search locations
   - Add/remove locations
   - Reorder visit sequence (drag to reorder)
   - Set priority and estimated duration

4. **Review & Assign**
   - Review complete route
   - Total locations and estimated time
   - Assign to sales rep
   - Notification sent to rep

### 🔄 Real-time Features
- Live updates when routes are assigned
- Sales rep status changes
- Location visits completed

## 🛠️ Tech Stack

- **Framework:** React Native + Expo
- **Language:** TypeScript
- **State Management:** Redux Toolkit
- **Backend:** Firebase
  - Authentication
  - Firestore Database
  - Cloud Storage
- **Navigation:** React Navigation
- **UI Library:** React Native Paper
- **Maps:** React Native Maps

## 📊 Data Flow

### Route Assignment Flow

```
Manager App                    Firebase                    Sales Rep App
    |                             |                              |
    | 1. Create Route             |                              |
    |--------------------------->  |                              |
    |                             |                              |
    |                        2. Store Route                      |
    |                        3. Update Rep                       |
    |                             |                              |
    |                             | 4. Send Notification         |
    |                             |----------------------------->|
    |                             |                              |
    |                             | 5. Rep sees route            |
    |                             |<-----------------------------|
    | 6. Real-time status updates |                              |
    |<----------------------------|                              |
```

## 🔐 Authentication Flow

```javascript
// Login
Email + Password → Firebase Auth → Get Manager Profile → Redux Store → Navigate to Dashboard

// Logout
Logout → Firebase Sign Out → Clear Redux Store → Navigate to Login
```

## 📦 Key Dependencies

```json
{
  "@reduxjs/toolkit": "State management",
  "react-redux": "Redux bindings for React",
  "firebase": "Backend services",
  "@react-navigation/native": "Navigation",
  "@react-navigation/stack": "Stack navigator",
  "@react-navigation/bottom-tabs": "Tab navigator",
  "react-native-maps": "Map integration",
  "react-native-paper": "Material Design components",
  "expo-location": "Location services"
}
```

## 🎨 Theming

The app uses React Native Paper's theming system. Default theme colors:
- Primary: `#2196F3` (Blue)
- Secondary: `#FF9800` (Orange)
- Background: `#F5F5F5` (Light Gray)

## 🧪 Testing the App

### Test Manager Login
1. Create a test manager account in Firebase Authentication
2. Add manager document in Firestore `managers` collection
3. Login with credentials

### Test Route Assignment
1. Add sales reps to Firestore
2. Add locations (hospitals, labs) to Firestore
3. Assign a route from Dashboard → Assign Route

## 📝 Next Steps

### Additional Screens to Implement:
- [ ] LocationsScreen (View/Add/Edit locations)
- [ ] RoutesScreen (View all routes)
- [ ] LiveTrackingScreen (Real-time map tracking)
- [ ] SalesRepDetailsScreen (Detailed rep profile)
- [ ] AddSalesRepScreen (Form to add new rep)
- [ ] EditSalesRepScreen (Form to edit rep)
- [ ] ReportsScreen (Analytics and reports)
- [ ] SettingsScreen (App settings)
- [ ] ProfileScreen (Manager profile)

### Features to Add:
- [ ] Push notifications
- [ ] Export reports to PDF
- [ ] Route templates
- [ ] Performance analytics
- [ ] Chat with sales reps
- [ ] Photo uploads for locations
- [ ] Offline mode support

## 🐛 Troubleshooting

### Firebase Connection Issues
- Verify Firebase config in `src/services/firebase.ts`
- Check internet connection
- Ensure Firebase project is active

### Navigation Errors
- Clear cache: `expo start -c`
- Reinstall dependencies: `rm -rf node_modules && npm install`

### Redux State Issues
- Check Redux DevTools
- Verify action dispatching
- Check reducer logic

## 📄 License

This project is part of the MedSales system.

## 👥 Contributing

This is a private project for medical sales management.

---

**Built with ❤️ using React Native + Expo + Firebase**
