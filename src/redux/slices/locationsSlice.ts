import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  getLocationsByManager,
  addLocation,
  updateLocation,
  deleteLocation,
} from '../../services/firestoreService';
import { Location, LocationsState } from '../../types';

const initialState: LocationsState = {
  locations: [],
  selectedLocation: null,
  loading: false,
  error: null,
};

// Async thunks
export const fetchLocations = createAsyncThunk(
  'locations/fetchAll',
  async (managerId: string, { rejectWithValue }) => {
    try {
      const locations = await getLocationsByManager(managerId);
      return locations;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const createLocation = createAsyncThunk(
  'locations/create',
  async (locationData: Omit<Location, 'id'>, { rejectWithValue }) => {
    try {
      const id = await addLocation(locationData);
      return { id, ...locationData };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const editLocation = createAsyncThunk(
  'locations/edit',
  async (
    { id, updates }: { id: string; updates: Partial<Location> },
    { rejectWithValue }
  ) => {
    try {
      await updateLocation(id, updates);
      return { id, updates };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const removeLocation = createAsyncThunk(
  'locations/remove',
  async (locationId: string, { rejectWithValue }) => {
    try {
      await deleteLocation(locationId);
      return locationId;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const locationsSlice = createSlice({
  name: 'locations',
  initialState,
  reducers: {
    setLocations: (state, action: PayloadAction<Location[]>) => {
      state.locations = action.payload;
    },
    setSelectedLocation: (state, action: PayloadAction<Location | null>) => {
      state.selectedLocation = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch
    builder.addCase(fetchLocations.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchLocations.fulfilled, (state, action) => {
      state.loading = false;
      state.locations = action.payload;
    });
    builder.addCase(fetchLocations.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Create
    builder.addCase(createLocation.fulfilled, (state, action) => {
      state.locations.unshift(action.payload as Location);
    });

    // Edit
    builder.addCase(editLocation.fulfilled, (state, action) => {
      const index = state.locations.findIndex(loc => loc.id === action.payload.id);
      if (index !== -1) {
        state.locations[index] = { ...state.locations[index], ...action.payload.updates };
      }
    });

    // Remove
    builder.addCase(removeLocation.fulfilled, (state, action) => {
      state.locations = state.locations.filter(loc => loc.id !== action.payload);
    });
  },
});

export const { setLocations, setSelectedLocation, clearError } = locationsSlice.actions;
export default locationsSlice.reducer;
