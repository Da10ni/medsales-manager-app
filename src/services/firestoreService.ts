import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  Manager,
  SalesRep,
  Location,
  Route,
  RouteTemplate,
  Task,
} from '../types';

// Collections
const COLLECTIONS = {
  MANAGERS: 'managers',
  SALES_REPS: 'salesReps',
  LOCATIONS: 'locations',
  ROUTES: 'routes',
  ROUTE_TEMPLATES: 'routeTemplates',
  TASKS: 'tasks',
  NOTIFICATIONS: 'notifications',
};

// Helper to convert Firestore timestamp to Date
const timestampToDate = (timestamp: any): Date => {
  return timestamp?.toDate ? timestamp.toDate() : new Date();
};

// ========== Sales Reps ==========

export const getSalesRepsByManager = async (managerId: string): Promise<SalesRep[]> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.SALES_REPS),
      where('managerId', '==', managerId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: timestampToDate(doc.data().createdAt),
    })) as SalesRep[];
  } catch (error) {
    console.error('Error fetching sales reps:', error);
    throw error;
  }
};

export const addSalesRep = async (salesRepData: Omit<SalesRep, 'id'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, COLLECTIONS.SALES_REPS), {
      ...salesRepData,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding sales rep:', error);
    throw error;
  }
};

export const updateSalesRep = async (
  salesRepId: string,
  updates: Partial<SalesRep>
): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTIONS.SALES_REPS, salesRepId);
    await updateDoc(docRef, updates);
  } catch (error) {
    console.error('Error updating sales rep:', error);
    throw error;
  }
};

export const deleteSalesRep = async (salesRepId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, COLLECTIONS.SALES_REPS, salesRepId));
  } catch (error) {
    console.error('Error deleting sales rep:', error);
    throw error;
  }
};

// Listen to sales reps in real-time
export const subscribeSalesReps = (
  managerId: string,
  callback: (salesReps: SalesRep[]) => void
) => {
  const q = query(
    collection(db, COLLECTIONS.SALES_REPS),
    where('managerId', '==', managerId)
  );

  return onSnapshot(q, (snapshot) => {
    const salesReps = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: timestampToDate(doc.data().createdAt),
    })) as SalesRep[];
    callback(salesReps);
  });
};

// ========== Locations ==========

export const getLocationsByManager = async (managerId: string): Promise<Location[]> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.LOCATIONS),
      where('createdBy', '==', managerId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: timestampToDate(doc.data().createdAt),
      lastVisited: doc.data().lastVisited ? timestampToDate(doc.data().lastVisited) : undefined,
    })) as Location[];
  } catch (error) {
    console.error('Error fetching locations:', error);
    throw error;
  }
};

export const addLocation = async (locationData: Omit<Location, 'id'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, COLLECTIONS.LOCATIONS), {
      ...locationData,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding location:', error);
    throw error;
  }
};

export const updateLocation = async (
  locationId: string,
  updates: Partial<Location>
): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTIONS.LOCATIONS, locationId);
    await updateDoc(docRef, updates);
  } catch (error) {
    console.error('Error updating location:', error);
    throw error;
  }
};

export const deleteLocation = async (locationId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, COLLECTIONS.LOCATIONS, locationId));
  } catch (error) {
    console.error('Error deleting location:', error);
    throw error;
  }
};

// ========== Routes ==========

export const getRoutesByManager = async (managerId: string): Promise<Route[]> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.ROUTES),
      where('assignedBy', '==', managerId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: timestampToDate(doc.data().date),
      createdAt: timestampToDate(doc.data().createdAt),
      actualStartTime: doc.data().actualStartTime ? timestampToDate(doc.data().actualStartTime) : undefined,
      actualCompletionTime: doc.data().actualCompletionTime ? timestampToDate(doc.data().actualCompletionTime) : undefined,
    })) as Route[];
  } catch (error) {
    console.error('Error fetching routes:', error);
    throw error;
  }
};

export const assignRoute = async (routeData: Omit<Route, 'id'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, COLLECTIONS.ROUTES), {
      ...routeData,
      date: Timestamp.fromDate(routeData.date),
      createdAt: Timestamp.now(),
    });

    // Update sales rep's current route
    await updateSalesRep(routeData.assignedTo, {
      currentRoute: docRef.id,
      status: 'on-route',
    } as Partial<SalesRep>);

    return docRef.id;
  } catch (error) {
    console.error('Error assigning route:', error);
    throw error;
  }
};

export const updateRoute = async (
  routeId: string,
  updates: Partial<Route>
): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTIONS.ROUTES, routeId);
    const updateData: any = { ...updates };

    if (updates.date) {
      updateData.date = Timestamp.fromDate(updates.date);
    }
    if (updates.actualStartTime) {
      updateData.actualStartTime = Timestamp.fromDate(updates.actualStartTime);
    }
    if (updates.actualCompletionTime) {
      updateData.actualCompletionTime = Timestamp.fromDate(updates.actualCompletionTime);
    }

    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error updating route:', error);
    throw error;
  }
};

// Listen to routes in real-time
export const subscribeRoutes = (
  managerId: string,
  callback: (routes: Route[]) => void
) => {
  const q = query(
    collection(db, COLLECTIONS.ROUTES),
    where('assignedBy', '==', managerId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const routes = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: timestampToDate(doc.data().date),
      createdAt: timestampToDate(doc.data().createdAt),
      actualStartTime: doc.data().actualStartTime ? timestampToDate(doc.data().actualStartTime) : undefined,
      actualCompletionTime: doc.data().actualCompletionTime ? timestampToDate(doc.data().actualCompletionTime) : undefined,
    })) as Route[];
    callback(routes);
  });
};

// ========== Route Templates ==========

export const getRouteTemplatesByManager = async (managerId: string): Promise<RouteTemplate[]> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.ROUTE_TEMPLATES),
      where('createdBy', '==', managerId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: timestampToDate(doc.data().createdAt),
      lastUsed: doc.data().lastUsed ? timestampToDate(doc.data().lastUsed) : undefined,
    })) as RouteTemplate[];
  } catch (error) {
    console.error('Error fetching route templates:', error);
    throw error;
  }
};

export const addRouteTemplate = async (
  templateData: Omit<RouteTemplate, 'id'>
): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, COLLECTIONS.ROUTE_TEMPLATES), {
      ...templateData,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding route template:', error);
    throw error;
  }
};

// ========== Manager ==========

export const getManager = async (managerId: string): Promise<Manager | null> => {
  try {
    const docRef = doc(db, COLLECTIONS.MANAGERS, managerId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
        createdAt: timestampToDate(docSnap.data().createdAt),
      } as Manager;
    }
    return null;
  } catch (error) {
    console.error('Error fetching manager:', error);
    throw error;
  }
};

export const createManager = async (managerData: Omit<Manager, 'id'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, COLLECTIONS.MANAGERS), {
      ...managerData,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating manager:', error);
    throw error;
  }
};
