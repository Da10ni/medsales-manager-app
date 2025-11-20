import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  getRoutesByManager,
  assignRoute,
  updateRoute,
  getRouteTemplatesByManager,
  addRouteTemplate,
} from '../../services/firestoreService';
import { Route, RouteTemplate, RoutesState } from '../../types';

const initialState: RoutesState = {
  routes: [],
  routeTemplates: [],
  selectedRoute: null,
  loading: false,
  error: null,
};

// Async thunks
export const fetchRoutes = createAsyncThunk(
  'routes/fetchAll',
  async (managerId: string, { rejectWithValue }) => {
    try {
      const routes = await getRoutesByManager(managerId);
      return routes;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const createRoute = createAsyncThunk(
  'routes/create',
  async (routeData: Omit<Route, 'id'>, { rejectWithValue }) => {
    try {
      const id = await assignRoute(routeData);
      return { id, ...routeData };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const editRoute = createAsyncThunk(
  'routes/edit',
  async (
    { id, updates }: { id: string; updates: Partial<Route> },
    { rejectWithValue }
  ) => {
    try {
      await updateRoute(id, updates);
      return { id, updates };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchRouteTemplates = createAsyncThunk(
  'routes/fetchTemplates',
  async (managerId: string, { rejectWithValue }) => {
    try {
      const templates = await getRouteTemplatesByManager(managerId);
      return templates;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const createRouteTemplate = createAsyncThunk(
  'routes/createTemplate',
  async (templateData: Omit<RouteTemplate, 'id'>, { rejectWithValue }) => {
    try {
      const id = await addRouteTemplate(templateData);
      return { id, ...templateData };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const routesSlice = createSlice({
  name: 'routes',
  initialState,
  reducers: {
    setRoutes: (state, action: PayloadAction<Route[]>) => {
      state.routes = action.payload;
    },
    setSelectedRoute: (state, action: PayloadAction<Route | null>) => {
      state.selectedRoute = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch routes
    builder.addCase(fetchRoutes.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchRoutes.fulfilled, (state, action) => {
      state.loading = false;
      state.routes = action.payload;
    });
    builder.addCase(fetchRoutes.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Create route
    builder.addCase(createRoute.fulfilled, (state, action) => {
      state.routes.unshift(action.payload as Route);
    });

    // Edit route
    builder.addCase(editRoute.fulfilled, (state, action) => {
      const index = state.routes.findIndex(route => route.id === action.payload.id);
      if (index !== -1) {
        state.routes[index] = { ...state.routes[index], ...action.payload.updates };
      }
    });

    // Fetch templates
    builder.addCase(fetchRouteTemplates.fulfilled, (state, action) => {
      state.routeTemplates = action.payload;
    });

    // Create template
    builder.addCase(createRouteTemplate.fulfilled, (state, action) => {
      state.routeTemplates.unshift(action.payload as RouteTemplate);
    });
  },
});

export const { setRoutes, setSelectedRoute, clearError } = routesSlice.actions;
export default routesSlice.reducer;
