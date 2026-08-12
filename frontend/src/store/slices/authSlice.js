// frontend/src/store/slices/authSlice.js
import { createSlice } from '@reduxjs/toolkit';

// This is the default dummy data for our logged-in user
const initialState = {
    isAuthenticated: false,
    accessToken: null,
    user: null
};

// Single source of truth for mapping a raw backend User object (fullName, avatarUrl,
// id/_id, ...) into the normalized shape this app stores in Redux (name, avatar, ...).
// Every place that dispatches `login` or `updateUser` with server data MUST route the
// user object through this function first - that's what keeps the auth state shape
// identical after login, silent/page refresh, token refresh, and profile updates.
export function normalizeUser(rawUser) {
    if (!rawUser) return rawUser;
    return {
        id: rawUser.id || rawUser._id,
        name: rawUser.fullName,
        email: rawUser.email,
        role: rawUser.role,
        // Auth endpoints (login/register/refresh) return roleName/permissions flat; the
        // self-profile endpoints (GET/PATCH /users/me) return a populated roleId object
        // instead - accept either shape so a Settings save never wipes out permissions
        // that just weren't present in that particular response.
        roleName: rawUser.roleName || rawUser.roleId?.name,
        permissions: rawUser.permissions || rawUser.roleId?.permissions || [],
        title: rawUser.title,
        coins: rawUser.coins || 0,
        referralCode: rawUser.referralCode,
        avatar: rawUser.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(rawUser.fullName || '')}&background=222777&color=fff`
    };
}

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        login: (state, action) => {
            state.isAuthenticated = true;
            state.accessToken = action.payload.accessToken;
            state.user = action.payload;
        },
        // Merges partial profile changes into the existing user object (e.g. after a
        // Settings save) without touching accessToken/isAuthenticated or dropping fields
        // the caller didn't include - unlike `login`, which replaces `state.user` wholesale.
        updateUser: (state, action) => {
            if (state.user) {
                state.user = { ...state.user, ...action.payload };
            }
        },
        logout: (state) => {
            state.isAuthenticated = false;
            state.accessToken = null;
            state.user = null;
        }
    }
});

export const { login, logout, updateUser } = authSlice.actions;
export default authSlice.reducer;