// frontend/src/store/slices/authSlice.js
import { createSlice } from '@reduxjs/toolkit';

// This is the default dummy data for our logged-in user
const initialState = {
    isAuthenticated: true,
    user: {
        name: 'Dr. Aria Thorne',
        role: 'Researcher',
        coins: 1250,
        avatar: 'https://i.pravatar.cc/150?u=aria'
    }
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        // We will use these later when we build the Login screen!
        login: (state, action) => {
            state.isAuthenticated = true;
            state.user = action.payload;
        },
        logout: (state) => {
            state.isAuthenticated = false;
            state.user = null;
        }
    }
});

export const { login, logout } = authSlice.actions;
export default authSlice.reducer;