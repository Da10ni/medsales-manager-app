// Common Types for Manager App

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Manager {
  id: string;
  name: string;
  email: string;
  phone: string;
  photoURL?: string;
  createdAt: Date;
}

export interface SalesRep {
  id: string;
  name: string;
  email: string;
  phone: string;
  photoURL?: string;
  managerId: string;
  currentRoute?: string; // routeId
  status: 'available' | 'on-route' | 'on-break' | 'offline';
  currentLocation?: Coordinates;
  stats: {
    totalVisits: number;
    completedRoutes: number;
    totalDistance: number;
    rating: number;
  };
  createdAt: Date;
  isActive: boolean;
}

export type LocationType = 'hospital' | 'lab' | 'clinic' | 'pharmacy';

export interface Location {
  id: string;
  name: string;
  type: LocationType;
  address: string;
  area: string; // Area/Region (e.g., "Clifton", "Gulshan", "DHA")
  coordinates: Coordinates;
  contactPerson?: string;
  phone?: string;
  email?: string;
  businessHours?: string;
  tags: string[];
  createdBy: string; // managerId
  createdAt: Date;
  lastVisited?: Date;
  totalVisits: number;
}

export type TaskStatus = 'pending' | 'completed' | 'skipped';
export type TaskPriority = 'high' | 'medium' | 'low';

export interface RouteLocation {
  locationId: string;
  location?: Location; // populated location data
  visitOrder: number;
  estimatedDuration: number; // minutes
  tasks: string[];
  products: string[];
  priority: TaskPriority;
  status: TaskStatus;
  actualVisitTime?: Date;
  notes: string;
  checkInTime?: Date;
  checkOutTime?: Date;
}

export type RouteStatus = 'assigned' | 'in-progress' | 'completed' | 'cancelled';

export interface Route {
  id: string;
  routeName: string;
  assignedTo: string; // salesRepId
  assignedBy: string; // managerId
  salesRep?: SalesRep; // populated data
  date: Date;
  status: RouteStatus;
  locations: RouteLocation[];
  totalDistance: string;
  estimatedTotalTime: string;
  actualStartTime?: Date;
  actualCompletionTime?: Date;
  createdAt: Date;
}

export interface RouteTemplate {
  id: string;
  templateName: string;
  description?: string;
  locations: {
    locationId: string;
    visitOrder: number;
    estimatedDuration: number;
    defaultTasks: string[];
  }[];
  createdBy: string; // managerId
  createdAt: Date;
  lastUsed?: Date;
  timesUsed: number;
}

export interface Task {
  id: string;
  routeId: string;
  locationId: string;
  salesRepId: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: Date;
  completedAt?: Date;
  notes?: string;
}

export interface DashboardStats {
  totalSalesReps: number;
  activeSalesReps: number;
  routesAssignedToday: number;
  completedTasks: number;
  pendingTasks: number;
  totalLocations: number;
  routesInProgress: number;
}

export interface Notification {
  id: string;
  type: 'route_assigned' | 'route_started' | 'location_completed' | 'route_completed' | 'issue_reported';
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: Date;
  userId: string; // managerId
}

// Redux State Types
export interface AuthState {
  user: Manager | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

export interface SalesRepsState {
  salesReps: SalesRep[];
  selectedSalesRep: SalesRep | null;
  loading: boolean;
  error: string | null;
}

export interface LocationsState {
  locations: Location[];
  selectedLocation: Location | null;
  loading: boolean;
  error: string | null;
}

export interface RoutesState {
  routes: Route[];
  routeTemplates: RouteTemplate[];
  selectedRoute: Route | null;
  loading: boolean;
  error: string | null;
}

export interface DashboardState {
  stats: DashboardStats;
  recentActivities: any[];
  loading: boolean;
  error: string | null;
}

// Navigation Types
export type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
  AssignRoute: { salesRepId?: string };
  RouteDetails: { routeId: string };
  SalesRepDetails: { salesRepId: string };
  AddSalesRep: undefined;
  EditSalesRep: { salesRepId: string };
  LocationDetails: { locationId: string };
  AddLocation: undefined;
  EditLocation: { locationId: string };
  LiveTracking: undefined;
  Reports: undefined;
  Settings: undefined;
  CreateRouteTemplate: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  SalesReps: undefined;
  Routes: undefined;
  Locations: undefined;
  Profile: undefined;
};
