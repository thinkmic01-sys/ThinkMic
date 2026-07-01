// frontend/src/pages/Auth.jsx
import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { login } from '../store/slices/authSlice';

export default function Auth() {
    const [isLoginView, setIsLoginView] = useState(true);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const handleAuthSubmit = (e) => {
        e.preventDefault();

        // In the future, this is where we call the real Node/Express backend!
        // For now, we dispatch our Redux login action with dummy user data.
        dispatch(login({
            name: 'Dr. Aria Thorne',
            role: 'Researcher',
            coins: 1250,
            avatar: 'https://i.pravatar.cc/150?u=aria'
        }));

        // Redirect to the dashboard after logging in
        navigate('/app/dashboard');
    };

    return (
        <main className="flex w-full h-screen bg-background text-gray-900 antialiased">
            {/* Left Panel: Branding & Value Props */}
            <section className="hidden lg:flex flex-col justify-between w-1/2 bg-sidebar text-white p-12 relative overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan/40 via-sidebar to-sidebar pointer-events-none"></div>

                <div className="z-10 mt-12">
                    <div className="flex items-center gap-2 mb-12">
                        <div className="w-8 h-8 rounded-full bg-cyan-soft ring-2 ring-cyan/50 flex items-center justify-center">
                            <span className="material-symbols-outlined text-sidebar text-sm">mic</span>
                        </div>
                        <h1 className="font-bold text-3xl tracking-tight">ThinkMic</h1>
                    </div>

                    <h2 className="font-bold text-5xl max-w-md mt-12 leading-tight">
                        Think it. <br/>
                        <span className="text-cyan">Mic it.</span> <br/>
                        Know it.
                    </h2>
                    <p className="text-lg text-sidebar-text mt-6 max-w-md">
                        The premier AI research hub that transforms your voice notes into structured, searchable intelligence.
                    </p>

                    <ul className="mt-12 space-y-6">
                        <li className="flex items-start gap-4">
                            <span className="material-symbols-outlined text-cyan mt-1">check_circle</span>
                            <div>
                                <h3 className="font-mono font-medium text-white mb-1">Instant Transcription</h3>
                                <p className="text-sidebar-text opacity-80">Capture ideas at the speed of thought with unmatched accuracy.</p>
                            </div>
                        </li>
                        <li className="flex items-start gap-4">
                            <span className="material-symbols-outlined text-cyan mt-1">check_circle</span>
                            <div>
                                <h3 className="font-mono font-medium text-white mb-1">AI Structuring</h3>
                                <p className="text-sidebar-text opacity-80">Automatically organize notes into actionable insights and summaries.</p>
                            </div>
                        </li>
                    </ul>
                </div>
                <div className="z-10 font-mono text-sm text-sidebar-text opacity-60">
                    © 2026 ThinkMic Systems.
                </div>
            </section>

            {/* Right Panel: Form Canvas */}
            <section className="w-full lg:w-1/2 bg-surface flex items-center justify-center p-6 lg:p-12 relative">
                <div className="w-full max-w-[440px]">

                    {/* Tab Navigation */}
                    <div className="flex border-b border-surface-border mb-8">
                        <button
                            onClick={() => setIsLoginView(true)}
                            className={`flex-1 pb-2 text-center text-sm font-semibold transition-colors border-b-2 ${isLoginView ? 'text-primary border-primary' : 'text-gray-400 hover:text-primary border-transparent'}`}
                        >
                            Sign In
                        </button>
                        <button
                            onClick={() => setIsLoginView(false)}
                            className={`flex-1 pb-2 text-center text-sm font-semibold transition-colors border-b-2 ${!isLoginView ? 'text-primary border-primary' : 'text-gray-400 hover:text-primary border-transparent'}`}
                        >
                            Register
                        </button>
                    </div>

                    {/* Form Card */}
                    <div className="bg-white rounded-xl shadow-md p-8 border border-gray-100">
                        <div className="mb-8 text-center">
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                {isLoginView ? 'Welcome back' : 'Create an account'}
                            </h2>
                            <p className="text-gray-500">
                                {isLoginView ? 'Enter your credentials to access your workspace.' : 'Sign up to start transforming your research.'}
                            </p>
                        </div>

                        <form onSubmit={handleAuthSubmit} className="space-y-5">
                            {!isLoginView && (
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Full Name</label>
                                    <input required type="text" placeholder="Dr. Jane Doe" className="w-full h-10 px-4 rounded-lg border border-surface-border focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow" />
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Work Email</label>
                                <input required type="email" placeholder="name@company.com" className="w-full h-10 px-4 rounded-lg border border-surface-border focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow" />
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-xs font-semibold text-gray-600">Password</label>
                                    {isLoginView && <a href="#" className="text-xs text-primary hover:underline">Forgot password?</a>}
                                </div>
                                <div className="relative">
                                    <input required type="password" placeholder="••••••••" className="w-full h-10 px-4 rounded-lg border border-surface-border focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow pr-10" />
                                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                        <span className="material-symbols-outlined text-[20px]">visibility_off</span>
                                    </button>
                                </div>
                            </div>

                            <button type="submit" className="w-full h-10 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-opacity-90 transition-colors flex items-center justify-center gap-2 mt-4">
                                {isLoginView ? 'Sign In to Workspace' : 'Create Account'}
                                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                            </button>
                        </form>

                        {/* Social Login Divider */}
                        <div className="relative flex py-8 items-center">
                            <div className="flex-grow border-t border-surface-border"></div>
                            <span className="flex-shrink-0 mx-4 text-gray-400 font-mono text-xs uppercase tracking-wider">Or</span>
                            <div className="flex-grow border-t border-surface-border"></div>
                        </div>

                        <button type="button" className="w-full h-10 border border-surface-border rounded-lg bg-white text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
                            </svg>
                            Continue with Google
                        </button>
                    </div>

                    <div className="mt-8 text-center font-mono text-xs text-gray-500 flex justify-center gap-4">
                        <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
                        <span>•</span>
                        <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
                    </div>
                </div>
            </section>
        </main>
    );
}