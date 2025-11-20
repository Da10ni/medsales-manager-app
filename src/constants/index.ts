// App Constants

export const COLORS = {
  primary: '#2196F3',
  secondary: '#FF9800',
  success: '#4CAF50',
  error: '#F44336',
  warning: '#FFC107',
  info: '#2196F3',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#212121',
  textSecondary: '#666666',
  border: '#E0E0E0',
};

export const STATUS_COLORS = {
  'on-route': '#4CAF50',
  'available': '#2196F3',
  'on-break': '#FF9800',
  'offline': '#9E9E9E',
  'assigned': '#FF9800',
  'in-progress': '#2196F3',
  'completed': '#4CAF50',
  'cancelled': '#F44336',
};

export const LOCATION_TYPES = [
  { value: 'hospital', label: 'Hospital', icon: 'hospital-building' },
  { value: 'lab', label: 'Laboratory', icon: 'flask' },
  { value: 'clinic', label: 'Clinic', icon: 'medical-bag' },
  { value: 'pharmacy', label: 'Pharmacy', icon: 'pill' },
];

export const ROUTE_STATUSES = [
  { value: 'assigned', label: 'Assigned', color: STATUS_COLORS.assigned },
  { value: 'in-progress', label: 'In Progress', color: STATUS_COLORS['in-progress'] },
  { value: 'completed', label: 'Completed', color: STATUS_COLORS.completed },
  { value: 'cancelled', label: 'Cancelled', color: STATUS_COLORS.cancelled },
];

export const SALES_REP_STATUSES = [
  { value: 'available', label: 'Available', color: STATUS_COLORS.available },
  { value: 'on-route', label: 'On Route', color: STATUS_COLORS['on-route'] },
  { value: 'on-break', label: 'On Break', color: STATUS_COLORS['on-break'] },
  { value: 'offline', label: 'Offline', color: STATUS_COLORS.offline },
];

export const TASK_PRIORITIES = [
  { value: 'high', label: 'High', color: '#F44336' },
  { value: 'medium', label: 'Medium', color: '#FF9800' },
  { value: 'low', label: 'Low', color: '#4CAF50' },
];

export const DEFAULT_COORDINATES = {
  // Karachi, Pakistan
  lat: 24.8607,
  lng: 67.0011,
};

export const MAP_CONFIG = {
  defaultZoom: 12,
  defaultRegion: {
    latitude: DEFAULT_COORDINATES.lat,
    longitude: DEFAULT_COORDINATES.lng,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  },
};

export const VALIDATION_RULES = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/,
  minPasswordLength: 6,
};

export const ERROR_MESSAGES = {
  auth: {
    invalidEmail: 'Please enter a valid email address',
    invalidPassword: 'Password must be at least 6 characters',
    loginFailed: 'Invalid email or password',
    networkError: 'Network error. Please check your connection',
  },
  route: {
    noSalesRep: 'Please select a sales representative',
    noLocations: 'Please add at least one location',
    noRouteName: 'Please enter a route name',
    assignFailed: 'Failed to assign route. Please try again',
  },
  salesRep: {
    createFailed: 'Failed to create sales rep',
    updateFailed: 'Failed to update sales rep',
    deleteFailed: 'Failed to delete sales rep',
  },
  location: {
    createFailed: 'Failed to create location',
    updateFailed: 'Failed to update location',
    deleteFailed: 'Failed to delete location',
  },
};

export const SUCCESS_MESSAGES = {
  route: {
    assigned: 'Route assigned successfully!',
    updated: 'Route updated successfully!',
    cancelled: 'Route cancelled successfully!',
  },
  salesRep: {
    created: 'Sales representative added successfully!',
    updated: 'Sales representative updated successfully!',
    deleted: 'Sales representative deleted successfully!',
  },
  location: {
    created: 'Location added successfully!',
    updated: 'Location updated successfully!',
    deleted: 'Location deleted successfully!',
  },
};

export const FIREBASE_COLLECTIONS = {
  MANAGERS: 'managers',
  SALES_REPS: 'salesReps',
  LOCATIONS: 'locations',
  ROUTES: 'routes',
  ROUTE_TEMPLATES: 'routeTemplates',
  TASKS: 'tasks',
  NOTIFICATIONS: 'notifications',
};

export const APP_CONFIG = {
  appName: 'MedSales Manager',
  version: '1.0.0',
  defaultLanguage: 'en',
  dateFormat: 'DD/MM/YYYY',
  timeFormat: 'hh:mm A',
};
