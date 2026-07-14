// frontend/src/store/slices/authSlice.js
import { createSlice } from '@reduxjs/toolkit';

// This is the default dummy data for our logged-in user
const initialState = {
    isAuthenticated: false,
    accessToken: null,
    user: null
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        login: (state, action) => {
            state.isAuthenticated = true;
            state.accessToken = action.payload.accessToken;
            state.user = action.payload;
        },
        logout: (state) => {
            state.isAuthenticated = false;
            state.accessToken = null;
            state.user = null;
        }
    }
});

export const { login, logout } = authSlice.actions;
export default authSlice.reducer;