import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { store } from './store/store';
import { login, logout, normalizeUser } from './store/slices/authSlice'; // Ensure this path is correct
import api from './services/api';

// Pages & Components
import Layout from './components/Layout';
import Auth from './pages/Auth';
import Dashboard from './pages/dahboard/Dashboard.jsx';
import SpeechWorkspace from './pages/projects/SpeechWorkspace.jsx';
import ReportExport from './pages/Rrports/ReportExport.jsx';
import Settings from './pages/Setting/Settings.jsx';
import Support from "./pages/Support/Support.jsx";
import Achievements from "./pages/Achievement/Achievements.jsx";
import Courses from "./pages/Courses/Courses.jsx";
import UserManagement from "./pages/Management/UserManagement.jsx";
import AdminUserDetail from "./pages/Management/AdminUserDetail.jsx";
import Collaboration from "./pages/Collaboration/Collaboration.jsx";
import ResearchResults from "./pages/projects/ResearchResults.jsx";
import SchemaBuilder from "./pages/Management/SchemaBuilder.jsx";
import SchemaLibrary from "./pages/Management/SchemaLibrary.jsx";
import SupportInbox from "./pages/Management/SupportInbox.jsx";
import ReferralCoinManagement from "./pages/Management/ReferralCoinManagement.jsx";
import AdminDashboard from "./pages/dahboard/AdminDashboard.jsx";
import ProjectsList from "./pages/projects/ProjectsList.jsx";
import ProjectDashboard from "./pages/projects/ProjectDashboard.jsx";
import UserTimeline from "./pages/Achievement/UserTimeline.jsx";
import CreateSeminar from "./pages/projects/CreateSeminar.jsx";
import ReportsLibrary from "./pages/Rrports/ReportsLibrary.jsx";
import CourseLibrary from "./pages/Courses/CourseLibrary.jsx";
import MyLearningList from "./pages/Courses/MyLearningList.jsx";
import CourseWorkbook from "./pages/Courses/CourseWorkbook.jsx";
import NearbySeminars from "./pages/Courses/NearbySeminars.jsx";
import SeminarBroadcast from "./pages/Courses/SeminarBroadcast.jsx";

const Placeholder = ({ title }) => (
    <div className="p-8 bg-white rounded-xl shadow-md h-64 flex items-center justify-center border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-400">{title} Module Coming Soon</h2>
    </div>
);

// Redirects away from a route if the current user's role isn't in `allowed`
function RequireRole({ allowed, role, children }) {
    return allowed.includes(role) ? children : <Navigate to="/app/dashboard" replace />;
}

// Inner component to handle Redux logic and route protection
function AppRoutes() {
    const dispatch = useDispatch();

    // Safely check if user is authenticated via Redux
    const isAuthenticated = useSelector((state) => state.auth?.isAuthenticated);
    const role = useSelector((state) => state.auth?.user?.role);

    // State to block rendering until the backend confirms the cookie
    const [isAuthReady, setIsAuthReady] = useState(false);

    useEffect(() => {
        const attemptSilentLogin = async () => {
            try {
                // Silently request a new access token using our HttpOnly cookie
                const response = await api.post('/auth/refresh');

                const data = response.data;

                if (data.accessToken) {
                    // Success! Put the user back into Redux
                    dispatch(login({ ...normalizeUser(data.user), accessToken: data.accessToken }));
                } else {
                    // No valid cookie, clear Redux
                    dispatch(logout());
                }
            } catch (error) {
                console.error("Silent login failed:", error);
                dispatch(logout());
            } finally {
                // Tell React it's safe to render the UI
                setIsAuthReady(true);
            }
        };

        attemptSilentLogin();
    }, [dispatch]);

    // Show a full-screen loading spinner while checking the cookie on initial load
    if (!isAuthReady) {
        return (
            <div className="w-screen h-screen flex items-center justify-center bg-[#222777]">
                <svg className="animate-spin h-12 w-12 text-[#6bf6ff]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            </div>
        );
    }

    return (
        <Routes>
            {/* Public Routes - Redirect to dashboard if already logged in */}
            <Route path="/" element={<Navigate to={isAuthenticated ? "/app/dashboard" : "/login"} replace />} />
            <Route path="/login" element={isAuthenticated ? <Navigate to="/app/dashboard" replace /> : <Auth />} />
            <Route path="/join" element={isAuthenticated ? <Navigate to="/app/dashboard" replace /> : <Auth />} />

            {/* Protected Routes Wrapper */}
            <Route path="/app/*" element={
                isAuthenticated ? (
                    <Layout>
                        <Routes>
                            {/* Live Modules we have built */}
                            <Route path="dashboard" element={role === 'admin' ? <AdminDashboard /> : <Dashboard />} />

                            {/* The Research Pipeline (Step 1 & 2) */}
                            <Route path="research" element={<SpeechWorkspace />} />
                            <Route path="research/results" element={<ResearchResults />} />

                            {/* The Projects Hub */}
                            <Route path="projects" element={<ProjectsList />} />
                            <Route path="projects/:id" element={<ProjectDashboard />} />
                            <Route path="projects/create-seminar" element={<CreateSeminar />} />

                            {/* Reports Module */}
                            <Route path="reports" element={<ReportsLibrary />} />
                            <Route path="reports/:id" element={<ReportExport />} />

                            <Route path="support" element={<Support />} />
                            <Route path="settings/*" element={<Settings />} />

                            {/* Courses & Learning LMS */}
                            <Route path="courses" element={<CourseLibrary />} />
                            <Route path="courses/my-learning" element={<MyLearningList />} />
                            <Route path="courses/workbook" element={<CourseWorkbook />} />
                            <Route path="courses/seminars" element={<NearbySeminars />} />
                            <Route path="courses/broadcast/:seminarId" element={<SeminarBroadcast />} />

                            <Route path="forms" element={<Collaboration />} />

                            <Route path="achievements" element={<Achievements />} />
                            <Route path="achievements/timeline" element={<UserTimeline />} />

                            {/* ADMIN ZONE (Nested Routes) */}
                            <Route path="admin">
                                <Route index element={<Navigate to="users" replace />} />
                                <Route path="users" element={<RequireRole allowed={['admin']} role={role}><UserManagement /></RequireRole>} />
                                <Route path="users/:userId" element={<RequireRole allowed={['admin']} role={role}><AdminUserDetail /></RequireRole>} />
                                <Route path="schemas" element={<RequireRole allowed={['admin']} role={role}><SchemaLibrary /></RequireRole>} />
                                <Route path="schemas/new" element={<RequireRole allowed={['admin']} role={role}><SchemaBuilder /></RequireRole>} />
                                <Route path="schemas/edit/:id" element={<RequireRole allowed={['admin']} role={role}><SchemaBuilder /></RequireRole>} />
                                <Route path="support" element={<RequireRole allowed={['admin', 'manager']} role={role}><SupportInbox /></RequireRole>} />
                                <Route path="rewards" element={<RequireRole allowed={['admin']} role={role}><ReferralCoinManagement /></RequireRole>} />
                                <Route path="analytics" element={<RequireRole allowed={['admin']} role={role}><Dashboard /></RequireRole>} />
                            </Route>
                        </Routes>
                    </Layout>
                ) : (
                    // Kick unauthenticated users back to login
                    <Navigate to="/login" replace />
                )
            } />
        </Routes>
    );
}

function App() {
    return (
        <Provider store={store}>
            <BrowserRouter>
                <AppRoutes />
            </BrowserRouter>
        </Provider>
    );
}

export default App;