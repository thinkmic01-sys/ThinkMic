// frontend/src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/store';

// Pages & Components
import Layout from './components/Layout';
import Auth from './pages/Auth';
import Dashboard from './pages/dahboard/Dashboard.jsx';
import SpeechWorkspace from './pages/projects/SpeechWorkspace.jsx';
import ReportExport from './pages/ReportExport';
import Settings from './pages/Settings';
import Support from "./pages/Support.jsx";
import Achievements from "./pages/Achievements.jsx";
import Courses from "./pages/Courses.jsx";
import UserManagement from "./pages/UserManagement.jsx";
import Collaboration from "./pages/Collaboration.jsx";
import ResearchResults from "./pages/projects/ResearchResults.jsx";
import SchemaBuilder from "./pages/SchemaBuilder.jsx";
import SchemaLibrary from "./pages/SchemaLibrary.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";

const Placeholder = ({ title }) => (
    <div className="p-8 bg-white rounded-xl shadow-md h-64 flex items-center justify-center border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-400">{title} Module Coming Soon</h2>
    </div>
);

function App() {
    return (
        <Provider store={store}>
            <BrowserRouter>
                <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<Navigate to="/login" replace />} />
                    <Route path="/login" element={<Auth />} />

                    {/* Authenticated Routes (Inside Layout) */}
                    <Route path="/app/*" element={
                        <Layout>
                            <Routes>
                                {/* Live Modules we have built */}
                                <Route path="dashboard" element={<Dashboard />} />
                                <Route path="research" element={<SpeechWorkspace />} />
                                {/* <Route path="research/results" element={<ResearchResults />} /> */}
                                <Route path="reports" element={<ReportExport />} />
                                <Route path="support" element={<Support />} />
                                <Route path="settings/*" element={<Settings />} />
                                <Route path="courses" element={<Courses />} />
                                <Route path="forms" element={<Collaboration />} />
                                <Route path="achievements" element={<Achievements />} />

                                {/* ADMIN ZONE (Nested Routes) */}
                                <Route path="admin">
                                    {/* By default, navigating to /app/admin opens the Analytics Dashboard */}
                                    <Route index element={<Navigate to="dashboard" replace />} />

                                    {/* /app/admin/dashboard */}
                                    <Route path="dashboard" element={<AdminDashboard />} />

                                    {/* /app/admin/users */}
                                    <Route path="users" element={<UserManagement />} />

                                    {/* /app/admin/schemas */}
                                    <Route path="schemas" element={<SchemaLibrary />} />

                                    {/* /app/admin/schemas/new */}
                                    <Route path="schemas/new" element={<SchemaBuilder />} />
                                </Route>

                            </Routes>
                        </Layout>
                    } />
                </Routes>
            </BrowserRouter>
        </Provider>
    );
}

export default App;