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
import ReportExport from './pages/Rrports/ReportExport.jsx';
import Settings from './pages/Setting/Settings.jsx';
import Support from "./pages/Support/Support.jsx";
import Achievements from "./pages/Achievement/Achievements.jsx";
import Courses from "./pages/Courses/Courses.jsx";
import UserManagement from "./pages/Management/UserManagement.jsx";
import Collaboration from "./pages/Collaboration/Collaboration.jsx";
import ResearchResults from "./pages/projects/ResearchResults.jsx";
import SchemaBuilder from "./pages/Management/SchemaBuilder.jsx";
import SchemaLibrary from "./pages/Management/SchemaLibrary.jsx";
import AdminDashboard from "./pages/dahboard/AdminDashboard.jsx";
import ProjectNotes from "./pages/projects/ProjectNotes.jsx";
import UserTimeline from "./pages/Achievement/UserTimeline.jsx";
import CreateSeminar from "./pages/projects/CreateSeminar.jsx";
import ReportsLibrary from "./pages/Rrports/ReportsLibrary.jsx";
import CourseLibrary from "./pages/Courses/CourseLibrary.jsx";
import MyLearningList from "./pages/Courses/MyLearningList.jsx";
import CourseWorkbook from "./pages/Courses/CourseWorkbook.jsx";
import NearbySeminars from "./pages/Courses/NearbySeminars.jsx";

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

                                {/* The Research Pipeline (Step 1 & 2) */}
                                <Route path="research" element={<SpeechWorkspace />} />
                                <Route path="research/results" element={<ResearchResults />} />

                                {/* The Projects Hub (Acts as Step 3 AND the Sidebar target) */}
                                <Route path="projects" element={<ProjectNotes />} />
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

                                <Route path="forms" element={<Collaboration />} />

                                <Route path="achievements" element={<Achievements />} />
                                <Route path="achievements/timeline" element={<UserTimeline />} />

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