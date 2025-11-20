# Manager App - Complete Setup Guide

## Overview

Modern Manager App with 2025 design aesthetics, phone authentication, and sales rep management.

---

## Installation

```bash
cd manager-app
npm install
```

**New packages added:**
- `expo-linear-gradient` - For gradient backgrounds
- `expo-blur` - For glass effects
- `expo-image-picker` - For avatar upload
- `world-countries` - For country code selector

---

## App Structure

```
manager-app/
├── src/
│   ├── screens/
│   │   ├── onboarding/
│   │   │   ├── WelcomeScreen.tsx
│   │   │   └── OnboardingScreen.tsx
│   │   ├── auth/
│   │   │   ├── PhoneSignUpScreen.tsx
│   │   │   └── ModernProfileSetupScreen.tsx
│   │   └── main/
│   │       ├── ModernDashboardScreen.tsx
│   │       ├── SalesRepsScreen.tsx
│   │       ├── AssignRouteScreen.tsx
│   │       └── ModernProfileScreen.tsx
│   ├── navigation/
│   │   └── AppNavigator.tsx
│   ├── redux/
│   │   ├── slices/
│   │   │   ├── authSlice.ts
│   │   │   ├── salesRepsSlice.ts
│   │   │   └── routesSlice.ts
│   │   └── store.ts
│   ├── services/
│   │   ├── firebase.ts
│   │   └── phoneAuthService.ts
│   ├── types/
│   │   └── index.ts
│   └── constants/
│       └── index.ts
└── App.tsx
```

---

## Authentication Flow

Same as Sales Rep App:

```
Welcome → Get Started → Onboarding → Login (Phone + OTP) → ProfileSetup → Dashboard
```

### Key Files:

1. **phoneAuthService.ts** - OTP generation and verification
2. **authSlice.ts** - Redux state management
3. **AppNavigator.tsx** - Conditional navigation based on auth

---

## Firebase Setup

### Collections:

#### 1. `verificationCodes` - OTP storage
```typescript
{
  code: "503869",
  phoneNumber: "+923001234567",
  createdAt: Timestamp,
  expiresAt: Timestamp // 10 minutes
}
```

#### 2. `managers` - Manager profiles
```typescript
{
  phone: "+923001234567",
  name: "Manager Name",
  email: "manager@example.com",
  photoURL: "https://...",
  role: "manager",
  isActive: true,
  stats: {
    totalSalesReps: 10,
    activeRoutes: 5,
    completedRoutes: 50
  },
  createdAt: Timestamp
}
```

#### 3. `salesReps` - Sales representatives
```typescript
{
  phone: "+923001234567",
  name: "Sales Rep Name",
  managerId: "manager_phone",
  status: "available", // available | busy | offline
  currentRoute: "route_id" | null,
  stats: { ... }
}
```

#### 4. `routes` - Assigned routes
```typescript
{
  routeName: "North Sector Route",
  managerId: "+923001234567",
  salesRepId: "+923009876543",
  status: "pending", // pending | in-progress | completed
  locations: [ ... ],
  totalDistance: "15 km",
  estimatedTotalTime: "2 hours",
  createdAt: Timestamp
}
```

---

## Design System

### Colors

```typescript
{
  primary: '#2196F3',      // Blue
  secondary: '#2196F3',    // Blue
  tertiary: '#64B5F6',     // Light Blue
  background: '#F8F9FA',   // Light gray background
  surface: '#FFFFFF',      // White cards
  success: '#4CAF50',      // Green
  warning: '#FF9800',      // Orange
  error: '#D32F2F',        // Red
}
```

### Gradients

```typescript
// Header gradient
['#2196F3', '#1976D2', '#0D47A1']

// Button gradient
['#2196F3', '#1976D2']

// Stats cards
Blue: ['#2196F3', '#1E88E5']
Green: ['#4CAF50', '#43A047']
Orange: ['#FF9800', '#FB8C00']
Purple: ['#673AB7', '#5E35B1']
```

---

## Screens Overview

### 1. WelcomeScreen
- Full-screen blue gradient
- App logo and name
- Feature list
- "Get Started" button → Onboarding
- "Already have an account? Login" → Login

### 2. OnboardingScreen
- 3 slides showing manager features:
  1. Manage Sales Reps
  2. Assign Routes
  3. Track Performance
- Skip/Next buttons
- Last slide → Login

### 3. PhoneSignUpScreen
- Country code selector
- Phone number input
- Send OTP button
- OTP input (6 digits)
- Verify button
- Shows OTP in alert (for testing)

### 4. ModernProfileSetupScreen
- Gradient header with progress bar
- Avatar upload (camera/gallery)
- Name input
- Email input
- Phone display (verified)
- Continue/Skip buttons

### 5. ModernDashboardScreen
- Gradient header with avatar
- 3 gradient stat cards:
  - Total Sales Reps
  - Active Routes
  - Completed Routes
- Quick Actions:
  - View Sales Reps
  - Assign Route
  - View Reports
  - Settings

### 6. SalesRepsScreen
- List of all sales reps
- Search functionality
- Filter by status
- Each rep card shows:
  - Avatar
  - Name
  - Status badge
  - Current route (if any)
  - Stats
- Tap to assign route

### 7. AssignRouteScreen
- 4-step wizard:
  1. Select Sales Rep
  2. Add Locations
  3. Optimize Route
  4. Review & Assign
- Map preview
- Route summary

### 8. ModernProfileScreen
- Same as Sales Rep App
- Edit name/email
- Change avatar
- View stats
- Logout

---

## Navigation Structure

```typescript
{!isAuthenticated ? (
  // Auth stack
  <>
    <Stack.Screen name="Welcome" component={WelcomeScreen} />
    <Stack.Screen name="Onboarding" component={OnboardingScreen} />
    <Stack.Screen name="Login" component={PhoneSignUpScreen} />
    <Stack.Screen name="ProfileSetup" component={ModernProfileSetupScreen} />
  </>
) : (
  // Main app
  <>
    <Stack.Screen name="MainTabs" component={MainTabs} />
    <Stack.Screen name="SalesReps" component={SalesRepsScreen} />
    <Stack.Screen name="AssignRoute" component={AssignRouteScreen} />
  </>
)}
```

### Main Tabs
1. **Dashboard** - Overview and quick actions
2. **Sales Reps** - Manage team
3. **Routes** - View all routes
4. **Profile** - Manager profile

---

## Key Differences from Sales Rep App

| Feature | Sales Rep App | Manager App |
|---------|---------------|-------------|
| **Main Function** | Complete assigned routes | Assign routes to reps |
| **Dashboard** | Show current route | Show team overview |
| **Navigation** | Route navigator | Sales rep management |
| **Stats** | Personal stats | Team stats |
| **Profile Collection** | `salesReps` | `managers` |

---

## Implementation Steps

### Step 1: Create Folder Structure ✅
```bash
mkdir -p src/screens/onboarding
mkdir -p src/screens/auth
mkdir -p src/screens/main
```

### Step 2: Install Dependencies
```bash
npx expo install expo-linear-gradient expo-image-picker expo-blur world-countries
```

### Step 3: Create Phone Auth Service
- Copy from Sales Rep App
- Update to use `managers` collection

### Step 4: Create Onboarding Screens
- WelcomeScreen
- OnboardingScreen (3 slides for manager features)

### Step 5: Create Auth Screens
- PhoneSignUpScreen
- ModernProfileSetupScreen

### Step 6: Create Main Screens
- ModernDashboardScreen
- SalesRepsScreen
- AssignRouteScreen
- ModernProfileScreen

### Step 7: Update Navigation
- AppNavigator with conditional rendering
- Tab Navigator for main app

### Step 8: Update Redux
- authSlice for manager auth
- salesRepsSlice for team management
- routesSlice for route assignment

---

## Testing

### Test Authentication
1. Open Welcome screen
2. Tap "Get Started"
3. View onboarding slides
4. Enter phone number
5. Get OTP in alert
6. Enter OTP
7. Complete profile setup
8. See Dashboard

### Test Sales Rep Management
1. View sales reps list
2. Search for rep
3. Filter by status
4. View rep details

### Test Route Assignment
1. Select sales rep
2. Add locations
3. Optimize route
4. Review and assign
5. Verify in Firestore

---

## Next Steps

After basic setup:
1. Add route optimization algorithm
2. Implement real-time tracking
3. Add notifications
4. Create reports/analytics
5. Add multi-language support

---

**Manager App is ready for development!** 🚀
