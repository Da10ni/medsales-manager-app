import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  getSalesRepsByManager,
  addSalesRep,
  updateSalesRep,
  deleteSalesRep,
} from '../../services/firestoreService';
import { SalesRep, SalesRepsState } from '../../types';

const initialState: SalesRepsState = {
  salesReps: [],
  selectedSalesRep: null,
  loading: false,
  error: null,
};

// Async thunks
export const fetchSalesReps = createAsyncThunk(
  'salesReps/fetchAll',
  async (managerId: string, { rejectWithValue }) => {
    try {
      const salesReps = await getSalesRepsByManager(managerId);
      return salesReps;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const createSalesRep = createAsyncThunk(
  'salesReps/create',
  async (salesRepData: Omit<SalesRep, 'id'>, { rejectWithValue }) => {
    try {
      const id = await addSalesRep(salesRepData);
      return { id, ...salesRepData };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const editSalesRep = createAsyncThunk(
  'salesReps/edit',
  async (
    { id, updates }: { id: string; updates: Partial<SalesRep> },
    { rejectWithValue }
  ) => {
    try {
      await updateSalesRep(id, updates);
      return { id, updates };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const removeSalesRep = createAsyncThunk(
  'salesReps/remove',
  async (salesRepId: string, { rejectWithValue }) => {
    try {
      await deleteSalesRep(salesRepId);
      return salesRepId;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const salesRepsSlice = createSlice({
  name: 'salesReps',
  initialState,
  reducers: {
    setSalesReps: (state, action: PayloadAction<SalesRep[]>) => {
      state.salesReps = action.payload;
    },
    setSelectedSalesRep: (state, action: PayloadAction<SalesRep | null>) => {
      state.selectedSalesRep = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch
    builder.addCase(fetchSalesReps.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchSalesReps.fulfilled, (state, action) => {
      state.loading = false;
      state.salesReps = action.payload;
    });
    builder.addCase(fetchSalesReps.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Create
    builder.addCase(createSalesRep.fulfilled, (state, action) => {
      state.salesReps.unshift(action.payload as SalesRep);
    });

    // Edit
    builder.addCase(editSalesRep.fulfilled, (state, action) => {
      const index = state.salesReps.findIndex(rep => rep.id === action.payload.id);
      if (index !== -1) {
        state.salesReps[index] = { ...state.salesReps[index], ...action.payload.updates };
      }
    });

    // Remove
    builder.addCase(removeSalesRep.fulfilled, (state, action) => {
      state.salesReps = state.salesReps.filter(rep => rep.id !== action.payload);
    });
  },
});

export const { setSalesReps, setSelectedSalesRep, clearError } = salesRepsSlice.actions;
export default salesRepsSlice.reducer;
