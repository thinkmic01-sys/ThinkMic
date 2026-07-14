import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { login } from '../store/slices/authSlice';

export default function Auth() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const referralCode = searchParams.get('ref');

    // --- UI State ---
    // If they have a referral code, default to the registration view instead of login
    const [isLoginView, setIsLoginView] = useState(!referralCode);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // --- Form Data State ---
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: ''
    });

    // Handle input changes
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // --- API Submission Handler ---
    const handleAuthSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setSuccessMsg('');

        const endpoint = isLoginView ? '/api/v1/auth/login' : '/api/v1/auth/register';
        const url = `http://localhost:5000${endpoint}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(
                    isLoginView
                        ? { email: formData.email, password: formData.password }
                        : { fullName: formData.fullName, email: formData.email, password: formData.password, referralCode }
                ),
                credentials: 'include'
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Authentication failed. Please try again.');
            }

            if (isLoginView) {
                // SUCCESSFUL LOGIN
                dispatch(login({
                    id: data.user.id,
                    name: data.user.fullName,
                    email: data.user.email,
                    role: data.user.role,
                    accessToken: data.accessToken,
                    coins: data.user.coins || 0,
                    referralCode: data.user.referralCode,
                    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.user.fullName)}&background=222777&color=fff`
                }));

                navigate('/app/dashboard');
            } else {
                // SUCCESSFUL REGISTRATION -> TRIGGER AUTO-LOGIN
                setSuccessMsg(data.message);

                // Behind the scenes, instantly log them in using the credentials they just created
                const loginRes = await fetch('http://localhost:5000/api/v1/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: formData.email, password: formData.password }),
                    credentials: 'include'
                });

                const loginData = await loginRes.json();

                if (loginRes.ok) {
                    dispatch(login({
                        id: loginData.user.id,
                        name: loginData.user.fullName,
                        email: loginData.user.email,
                        role: loginData.user.role,
                        accessToken: loginData.accessToken,
                        coins: loginData.user.coins || 0,
                        referralCode: loginData.user.referralCode,
                        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(loginData.user.fullName)}&background=222777&color=fff`
                    }));
                    navigate('/app/dashboard');
                } else {
                    // Fallback just in case auto-login fails
                    setIsLoginView(true);
                    setFormData({ ...formData, password: '' });
                }
            }

        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="flex w-full h-screen bg-[#f9f9ff] text-[#181c22] antialiased font-sans">

            {/* Left Panel: Branding & Value Props (Hidden on mobile) */}
            <section className="hidden lg:flex flex-col justify-between w-1/2 bg-[#222777] text-white p-12 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#00c2cb]/40 via-[#222777] to-[#181c22] pointer-events-none"></div>

                <div className="z-10 mt-12">
                    <div className="flex items-center gap-2 mb-12">
                        <div className="w-8 h-8 rounded-full bg-[#00c2cb] ring-2 ring-[#6bf6ff]/50 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[#222777] text-sm font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>mic</span>
                        </div>
                        <h1 className="font-bold text-3xl tracking-tight">ThinkMic</h1>
                    </div>

                    <h2 className="font-bold text-5xl max-w-md mt-12 leading-tight">
                        Think it. <br/>
                        <span className="text-[#6bf6ff]">Mic it.</span> <br/>
                        Know it.
                    </h2>
                    <p className="text-lg text-[#bfc2ff] mt-6 max-w-md">
                        The premier AI research hub that transforms your voice notes into structured, searchable intelligence.
                    </p>

                    <ul className="mt-12 space-y-6">
                        <li className="flex items-start gap-4">
                            <span className="material-symbols-outlined text-[#00c2cb] mt-1" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                            <div>
                                <h3 className="font-mono font-medium text-white mb-1">Instant Transcription</h3>
                                <p className="text-[#bfc2ff] opacity-80">Capture ideas at the speed of thought with unmatched accuracy.</p>
                            </div>
                        </li>
                        <li className="flex items-start gap-4">
                            <span className="material-symbols-outlined text-[#00c2cb] mt-1" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                            <div>
                                <h3 className="font-mono font-medium text-white mb-1">AI Structuring</h3>
                                <p className="text-[#bfc2ff] opacity-80">Automatically organize notes into actionable insights and summaries.</p>
                            </div>
                        </li>
                    </ul>
                </div>
                <div className="z-10 font-mono text-sm text-[#bfc2ff] opacity-60">
                    © 2026 ThinkMic Systems.
                </div>
            </section>

            {/* Right Panel: Form Canvas */}
            <section className="w-full lg:w-1/2 bg-white flex items-center justify-center p-6 lg:p-12 relative">
                <div className="w-full max-w-[440px]">

                    {/* Tab Navigation */}
                    <div className="flex border-b border-[#e0e2eb] mb-8">
                        <button
                            onClick={() => { setIsLoginView(true); setError(''); setSuccessMsg(''); }}
                            className={`flex-1 pb-2 text-center text-sm font-semibold transition-colors border-b-2 ${isLoginView ? 'text-[#222777] border-[#222777]' : 'text-[#777682] hover:text-[#222777] border-transparent'}`}
                        >
                            Sign In
                        </button>
                        <button
                            onClick={() => { setIsLoginView(false); setError(''); setSuccessMsg(''); }}
                            className={`flex-1 pb-2 text-center text-sm font-semibold transition-colors border-b-2 ${!isLoginView ? 'text-[#222777] border-[#222777]' : 'text-[#777682] hover:text-[#222777] border-transparent'}`}
                        >
                            Register
                        </button>
                    </div>

                    {/* Form Card */}
                    <div className="bg-white rounded-xl shadow-[0_4px_16px_rgba(58,63,143,0.08)] p-8 border border-[#e0e2eb]">

                        <div className="mb-8 text-center">
                            <h2 className="text-2xl font-bold text-[#181c22] mb-2">
                                {isLoginView ? 'Welcome back' : 'Create an account'}
                            </h2>
                            <p className="text-[#464651]">
                                {isLoginView ? 'Enter your credentials to access your workspace.' : 'Sign up to start transforming your research.'}
                            </p>
                        </div>

                        {error && (
                            <div className="mb-6 bg-[#ffdad6] text-[#ba1a1a] p-3 rounded-lg text-sm font-semibold flex items-center gap-2 border border-[#ffb4ab]">
                                <span className="material-symbols-outlined text-[18px]">error</span>
                                {error}
                            </div>
                        )}

                        {successMsg && (
                            <div className="mb-6 bg-[#e6fbfc] text-[#006e73] p-3 rounded-lg text-sm font-semibold flex items-center gap-2 border border-[#b2f0f4]">
                                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                                {successMsg}
                            </div>
                        )}

                        <form onSubmit={handleAuthSubmit} className="space-y-5">

                            {!isLoginView && (
                                <div>
                                    <label className="block text-xs font-semibold text-[#464651] mb-1 uppercase tracking-wider">Full Name</label>
                                    <input
                                        required
                                        type="text"
                                        name="fullName"
                                        value={formData.fullName}
                                        onChange={handleChange}
                                        placeholder="Dr. Jane Doe"
                                        className="w-full h-10 px-4 rounded-lg bg-[#f9f9ff] border border-[#c7c5d3] text-[#181c22] focus:outline-none focus:border-[#222777] focus:ring-1 focus:ring-[#222777] transition-shadow"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-[#464651] mb-1 uppercase tracking-wider">Work Email</label>
                                <input
                                    required
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="name@company.com"
                                    className="w-full h-10 px-4 rounded-lg bg-[#f9f9ff] border border-[#c7c5d3] text-[#181c22] focus:outline-none focus:border-[#222777] focus:ring-1 focus:ring-[#222777] transition-shadow"
                                />
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-xs font-semibold text-[#464651] uppercase tracking-wider">Password</label>
                                    {isLoginView && <a href="#" className="text-xs text-[#222777] font-bold hover:underline">Forgot password?</a>}
                                </div>
                                <div className="relative">
                                    <input
                                        required
                                        type={showPassword ? "text" : "password"} // <-- UPDATED FOR TOGGLE
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="••••••••"
                                        className="w-full h-10 px-4 rounded-lg bg-[#f9f9ff] border border-[#c7c5d3] text-[#181c22] focus:outline-none focus:border-[#222777] focus:ring-1 focus:ring-[#222777] transition-shadow pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)} // <-- UPDATED CLICK HANDLER
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#777682] hover:text-[#181c22]"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">
                                            {showPassword ? 'visibility' : 'visibility_off'}
                                        </span>
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full h-11 bg-[#222777] text-white rounded-lg text-sm font-bold hover:bg-[#3a3f8f] transition-colors flex items-center justify-center gap-2 mt-4 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        {isLoginView ? 'Sign In to Workspace' : 'Create Account'}
                                        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="relative flex py-8 items-center">
                            <div className="flex-grow border-t border-[#e0e2eb]"></div>
                            <span className="flex-shrink-0 mx-4 text-[#c7c5d3] font-mono text-xs uppercase tracking-wider">Or</span>
                            <div className="flex-grow border-t border-[#e0e2eb]"></div>
                        </div>

                        <button
                            type="button"
                            onClick={() => alert("Google OAuth will be implemented in a future phase!")} // <-- ADDED EXPLANATORY ALERT
                            className="w-full h-11 border border-[#c7c5d3] rounded-lg bg-[#f9f9ff] text-[#464651] text-sm font-bold hover:bg-[#e0e2eb] hover:text-[#181c22] transition-colors flex items-center justify-center gap-2"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
                            </svg>
                            Continue with Google
                        </button>
                    </div>

                    <div className="mt-8 text-center font-mono text-xs text-[#777682] flex justify-center gap-4">
                        <a href="#" className="hover:text-[#222777] font-bold transition-colors">Privacy Policy</a>
                        <span>•</span>
                        <a href="#" className="hover:text-[#222777] font-bold transition-colors">Terms of Service</a>
                    </div>
                </div>
            </section>
        </main>
    );
}