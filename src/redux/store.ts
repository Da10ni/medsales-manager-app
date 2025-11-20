import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import salesRepsReducer from './slices/salesRepsSlice';
import locationsReducer from './slices/locationsSlice';
import routesReducer from './slices/routesSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    salesReps: salesRepsReducer,
    locations: locationsReducer,
    routes: routesReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['auth/login/fulfilled', 'auth/register/fulfilled'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['payload.createdAt', 'payload.date'],
        // Ignore these paths in the state
        ignoredPaths: ['auth.user.createdAt', 'salesReps.salesReps', 'locations.locations', 'routes.routes'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
