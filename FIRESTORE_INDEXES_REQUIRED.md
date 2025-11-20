# Firestore Composite Indexes Required

## Issue

The Manager App uses compound Firestore queries that require composite indexes to be created in Firebase Console.

## Errors You'll See:

```
ERROR  Error fetching sales reps: [FirebaseError: The query requires an index...]
ERROR  Error fetching locations: [FirebaseError: The query requires an index...]
```

## Solution

Firebase provides automatic links to create these indexes. When you see the error, simply:

1. **Click the URL in the error message** - It will take you directly to Firebase Console
2. **Click "Create Index"** button
3. **Wait 2-5 minutes** for the index to build
4. **Refresh the app** - The query will now work

## Required Indexes:

### 1. Sales Reps Collection
- **Collection ID**: `salesReps`
- **Fields**:
  - `managerId` (Ascending)
  - `createdAt` (Descending)

### 2. Locations Collection
- **Collection ID**: `locations`
- **Fields**:
  - `createdBy` (Ascending)
  - `createdAt` (Descending)

### 3. Routes Collection
- **Collection ID**: `routes`
- **Fields**:
  - `assignedBy` (Ascending)
  - `createdAt` (Descending)

### 4. Route Templates Collection
- **Collection ID**: `routeTemplates`
- **Fields**:
  - `createdBy` (Ascending)
  - `createdAt` (Descending)

## Manual Index Creation

If you prefer to create indexes manually:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **healthpanda-30dcf**
3. Click **Firestore Database** in left menu
4. Click **Indexes** tab
5. Click **Create Index**
6. Fill in the collection and fields as listed above
7. Click **Create**

## Alternative: Use Simple Queries (No Index Required)

If you don't want to create indexes, you can modify the queries to remove `orderBy`:

**File**: `manager-app/src/services/firestoreService.ts`

```typescript
// Before (requires index):
const q = query(
  collection(db, COLLECTIONS.SALES_REPS),
  where('managerId', '==', managerId),
  orderBy('createdAt', 'desc')  // <-- This causes index requirement
);

// After (no index required):
const q = query(
  collection(db, COLLECTIONS.SALES_REPS),
  where('managerId', '==', managerId)
  // Sort in JavaScript after fetching
);
```

Then sort the results in JavaScript:
```typescript
const salesReps = snapshot.docs
  .map(doc => ({ id: doc.id, ...doc.data() }))
  .sort((a, b) => b.createdAt - a.createdAt);  // Sort in memory
```

## Recommendation

**Create the indexes** - It's the best practice for production apps and provides better performance.

The first time you run each screen, you'll see the error with a clickable link. Just click it and create the index!

---

**Note**: You only need to create each index once. After that, all queries will work automatically.
