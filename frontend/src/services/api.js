import axios from 'axios';
import { store } from '../store/store';
import { login, logout, normalizeUser } from '../store/slices/authSlice';
import { API_BASE_URL } from '../config';

const api = axios.create({
    baseURL: `${API_BASE_URL}/api/v1`,
    withCredentials: true // Ensures HttpOnly cookies (like refreshToken) are sent
});

// Request Interceptor: Attach access token to headers
api.interceptors.request.use((config) => {
    const state = store.getState();
    const token = state.auth?.accessToken;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => Promise.reject(error));

// Response Interceptor: Handle 401 and auto-refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        
        // If 401 Unauthorized and we haven't already retried this request, and it's NOT the refresh endpoint itself
        if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url.includes('/auth/refresh')) {
            originalRequest._retry = true;
            try {
                // Attempt silent refresh
                const refreshRes = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, {}, {
                    withCredentials: true // Must explicitly send cookie
                });
                
                const { accessToken, user } = refreshRes.data;

                // Update global Redux state with new token - normalized the same way as
                // the login flow, so the auth state shape never diverges between the two.
                store.dispatch(login({ ...normalizeUser(user), accessToken }));
                
                // Update the original request's authorization header and retry
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                return api(originalRequest);
            } catch (err) {
                // Refresh token also failed/expired. Force logout.
                store.dispatch(logout());
                window.location.href = '/auth'; // Redirect to login
                return Promise.reject(err);
            }
        }
        return Promise.reject(error);
    }
);

export default api;
