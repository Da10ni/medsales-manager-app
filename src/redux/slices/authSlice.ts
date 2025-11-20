import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  User,
} from 'firebase/auth';
import { auth } from '../../services/firebase';
import { getManager, createManager } from '../../services/firestoreService';
import { AuthState, Manager } from '../../types';

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

// Async thunks
export const loginManager = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Get manager data from Firestore
      const manager = await getManager(firebaseUser.uid);

      if (!manager) {
        throw new Error('Manager profile not found');
      }

      return manager;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const registerManager = createAsyncThunk(
  'auth/register',
  async (
    {
      email,
      password,
      name,
      phone,
    }: { email: string; password: string; name: string; phone: string },
    { rejectWithValue }
  ) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Create manager profile in Firestore
      const managerData: Omit<Manager, 'id'> = {
        name,
        email,
        phone,
        createdAt: new Date(),
      };

      await createManager(managerData);

      const manager = await getManager(firebaseUser.uid);
      return manager;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const logoutManager = createAsyncThunk('auth/logout', async (_, { rejectWithValue }) => {
  try {
    await signOut(auth);
  } catch (error: any) {
    return rejectWithValue(error.message);
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<Manager | null>) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
    },
    setManager: (state, action: PayloadAction<Manager | null>) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Login
    builder.addCase(loginManager.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(loginManager.fulfilled, (state, action) => {
      state.loading = false;
      state.user = action.payload;
      state.isAuthenticated = true;
      state.error = null;
    });
    builder.addCase(loginManager.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Register
    builder.addCase(registerManager.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(registerManager.fulfilled, (state, action) => {
      state.loading = false;
      state.user = action.payload;
      state.isAuthenticated = true;
      state.error = null;
    });
    builder.addCase(registerManager.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Logout
    builder.addCase(logoutManager.fulfilled, (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
    });
  },
});

export const { setUser, setManager, clearError } = authSlice.actions;
export default authSlice.reducer;
