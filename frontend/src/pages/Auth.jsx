import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { login, normalizeUser } from '../store/slices/authSlice';
import api from '../services/api';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

export default function Auth() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const referralCode = searchParams.get('ref');

    // --- Top-level flow: 'auth' (login/register form) or 'otp' (email verification) ---
    const [step, setStep] = useState('auth');

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

    // --- OTP Verification State ---
    const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
    const [verifyLoading, setVerifyLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const otpInputRefs = useRef([]);

    // --- Forgot Password Modal State ---
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [forgotStep, setForgotStep] = useState('email'); // 'email' | 'reset'
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotCode, setForgotCode] = useState('');
    const [forgotNewPassword, setForgotNewPassword] = useState('');
    const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
    const [forgotShowPassword, setForgotShowPassword] = useState(false);
    const [forgotError, setForgotError] = useState('');
    const [forgotSuccess, setForgotSuccess] = useState('');
    const [forgotLoading, setForgotLoading] = useState(false);

    // --- Google Identity Services ---
    const googleBtnRef = useRef(null);

    // Handle input changes
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Countdown ticker for the OTP resend cooldown
    useEffect(() => {
        if (step !== 'otp' || resendCooldown <= 0) return;
        const timer = setInterval(() => {
            setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
    }, [step, resendCooldown]);

    // --- API Submission Handler (Login / Register) ---
    const handleAuthSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setSuccessMsg('');

        const endpoint = isLoginView ? '/auth/login' : '/auth/register';

        try {
            const response = await api.post(endpoint,
                isLoginView
                    ? { email: formData.email, password: formData.password }
                    : { fullName: formData.fullName, email: formData.email, password: formData.password, referralCode }
            );

            const data = response.data;

            if (isLoginView) {
                // SUCCESSFUL LOGIN
                dispatch(login({ ...normalizeUser(data.user), accessToken: data.accessToken }));
                navigate('/app/dashboard');
            } else if (data.accessToken) {
                // Backend auto-verified the account (e.g. SKIP_EMAIL_VERIFICATION) and already
                // issued a session - log straight in instead of showing a stale OTP screen.
                dispatch(login({ ...normalizeUser(data.user), accessToken: data.accessToken }));
                navigate('/app/dashboard');
            } else {
                // REGISTRATION SUCCEEDED -> MUST VERIFY EMAIL BEFORE ENTERING WORKSPACE
                setOtp(Array(OTP_LENGTH).fill(''));
                setSuccessMsg(data.message || 'Verification code sent to your email.');
                setResendCooldown(RESEND_COOLDOWN_SECONDS);
                setStep('otp');
            }
        } catch (err) {
            const respData = err.response?.data;

            if (isLoginView && err.response?.status === 403 && respData?.requiresVerification) {
                // Unverified account tried to log in - send them straight to the OTP screen
                // with a freshly issued code so they aren't stuck waiting on a stale one.
                setOtp(Array(OTP_LENGTH).fill(''));
                setStep('otp');
                try {
                    await api.post('/auth/resend-verification', { email: respData.email || formData.email });
                    setResendCooldown(RESEND_COOLDOWN_SECONDS);
                    setSuccessMsg('Your account is not verified yet. We just sent a new verification code to your email.');
                } catch {
                    setResendCooldown(0);
                    setSuccessMsg('Your account is not verified yet. Please verify your email to continue.');
                }
            } else {
                console.error("Auth error:", err);
                setError(respData?.message || err.message || 'Network error occurred. Is the server running?');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // --- OTP Input Handlers ---
    const handleOtpChange = (index, rawValue) => {
        const value = rawValue.replace(/\D/g, '').slice(-1);
        const nextOtp = [...otp];
        nextOtp[index] = value;
        setOtp(nextOtp);

        if (value && index < OTP_LENGTH - 1) {
            otpInputRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            otpInputRefs.current[index - 1]?.focus();
        }
    };

    const handleOtpPaste = (e) => {
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
        if (!pasted) return;
        e.preventDefault();
        const nextOtp = Array(OTP_LENGTH).fill('');
        for (let i = 0; i < pasted.length; i++) nextOtp[i] = pasted[i];
        setOtp(nextOtp);
        otpInputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
    };

    const handleVerifySubmit = async (e) => {
        e.preventDefault();
        const code = otp.join('');
        if (code.length !== OTP_LENGTH) {
            setError('Please enter the full 6-digit code.');
            return;
        }

        setVerifyLoading(true);
        setError('');
        try {
            const response = await api.post('/auth/verify-email', { email: formData.email, code });
            const data = response.data;
            dispatch(login({ ...normalizeUser(data.user), accessToken: data.accessToken }));
            navigate('/app/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid or expired code. Please try again.');
        } finally {
            setVerifyLoading(false);
        }
    };

    const handleResendCode = async () => {
        if (resendCooldown > 0 || resendLoading) return;
        setResendLoading(true);
        setError('');
        try {
            await api.post('/auth/resend-verification', { email: formData.email });
            setOtp(Array(OTP_LENGTH).fill(''));
            otpInputRefs.current[0]?.focus();
            setResendCooldown(RESEND_COOLDOWN_SECONDS);
            setSuccessMsg('A new verification code has been sent to your email.');
        } catch (err) {
            setError(err.response?.data?.message || 'Could not resend code. Please try again shortly.');
        } finally {
            setResendLoading(false);
        }
    };

    // --- Google Identity Services ---
    const handleGoogleCredential = useCallback(async (googleResponse) => {
        setError('');
        setIsLoading(true);
        try {
            const response = await api.post('/auth/google', { credential: googleResponse.credential, referralCode });
            const data = response.data;
            dispatch(login({ ...normalizeUser(data.user), accessToken: data.accessToken }));
            navigate('/app/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Google sign-in failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [referralCode, dispatch, navigate]);

    useEffect(() => {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        if (!clientId || step !== 'auth') return;

        const renderGoogleButton = () => {
            if (!window.google?.accounts?.id || !googleBtnRef.current) return;
            window.google.accounts.id.initialize({
                client_id: clientId,
                callback: handleGoogleCredential
            });
            googleBtnRef.current.innerHTML = '';
            window.google.accounts.id.renderButton(googleBtnRef.current, {
                theme: 'outline',
                size: 'large',
                shape: 'rectangular',
                text: isLoginView ? 'signin_with' : 'signup_with',
                width: 376
            });
        };

        const scriptId = 'google-gsi-script';
        if (window.google?.accounts?.id) {
            renderGoogleButton();
        } else if (!document.getElementById(scriptId)) {
            const script = document.createElement('script');
            script.id = scriptId;
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.onload = renderGoogleButton;
            document.body.appendChild(script);
        } else {
            document.getElementById(scriptId).addEventListener('load', renderGoogleButton, { once: true });
        }
    }, [step, isLoginView, handleGoogleCredential]);

    // --- Forgot Password Modal ---
    const openForgotModal = (e) => {
        e.preventDefault();
        setForgotStep('email');
        setForgotEmail(formData.email || '');
        setForgotCode('');
        setForgotNewPassword('');
        setForgotConfirmPassword('');
        setForgotError('');
        setForgotSuccess('');
        setShowForgotModal(true);
    };

    const closeForgotModal = () => setShowForgotModal(false);

    const handleForgotRequestCode = async (e) => {
        e.preventDefault();
        setForgotLoading(true);
        setForgotError('');
        setForgotSuccess('');
        try {
            await api.post('/auth/forgot-password', { email: forgotEmail });
            setForgotSuccess('If an account with that email exists, a reset code has been sent.');
            setForgotStep('reset');
        } catch (err) {
            setForgotError(err.response?.data?.message || 'Something went wrong. Please try again.');
        } finally {
            setForgotLoading(false);
        }
    };

    const handleForgotResetPassword = async (e) => {
        e.preventDefault();
        setForgotError('');

        if (forgotNewPassword.length < 8) {
            setForgotError('Password must be at least 8 characters long.');
            return;
        }
        if (forgotNewPassword !== forgotConfirmPassword) {
            setForgotError('Passwords do not match.');
            return;
        }

        setForgotLoading(true);
        try {
            await api.post('/auth/reset-password', {
                email: forgotEmail,
                code: forgotCode,
                newPassword: forgotNewPassword
            });
            setShowForgotModal(false);
            setIsLoginView(true);
            setError('');
            setSuccessMsg('Password reset successfully. Please sign in with your new password.');
        } catch (err) {
            setForgotError(err.response?.data?.message || 'Invalid or expired code.');
        } finally {
            setForgotLoading(false);
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

                    {step === 'auth' && (
                        <>
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
                                            {isLoginView && (
                                                <button type="button" onClick={openForgotModal} className="text-xs text-[#222777] font-bold hover:underline">
                                                    Forgot password?
                                                </button>
                                            )}
                                        </div>
                                        <div className="relative">
                                            <input
                                                required
                                                type={showPassword ? "text" : "password"}
                                                name="password"
                                                value={formData.password}
                                                onChange={handleChange}
                                                placeholder="••••••••"
                                                className="w-full h-10 px-4 rounded-lg bg-[#f9f9ff] border border-[#c7c5d3] text-[#181c22] focus:outline-none focus:border-[#222777] focus:ring-1 focus:ring-[#222777] transition-shadow pr-10"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
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

                                {import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
                                    <div ref={googleBtnRef} className="w-full flex justify-center min-h-[44px]" />
                                ) : (
                                    <button
                                        type="button"
                                        disabled
                                        title="Set VITE_GOOGLE_CLIENT_ID in frontend/.env to enable Google sign-in"
                                        className="w-full h-11 border border-[#c7c5d3] rounded-lg bg-[#f9f9ff] text-[#777682] text-sm font-bold flex items-center justify-center gap-2 opacity-60 cursor-not-allowed"
                                    >
                                        <svg className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
                                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
                                        </svg>
                                        Continue with Google
                                    </button>
                                )}
                            </div>

                            <div className="mt-8 text-center font-mono text-xs text-[#777682] flex justify-center gap-4">
                                <a href="#" className="hover:text-[#222777] font-bold transition-colors">Privacy Policy</a>
                                <span>•</span>
                                <a href="#" className="hover:text-[#222777] font-bold transition-colors">Terms of Service</a>
                            </div>
                        </>
                    )}

                    {step === 'otp' && (
                        <div className="bg-white rounded-xl shadow-[0_4px_16px_rgba(58,63,143,0.08)] p-8 border border-[#e0e2eb]">
                            <div className="mb-8 text-center">
                                <div className="w-12 h-12 rounded-full bg-[#e6fbfc] flex items-center justify-center mx-auto mb-4">
                                    <span className="material-symbols-outlined text-[#00838a] text-[24px]">mail</span>
                                </div>
                                <h2 className="text-2xl font-bold text-[#181c22] mb-2">Verify your email</h2>
                                <p className="text-[#464651]">
                                    Enter the 6-digit code sent to <span className="font-semibold text-[#181c22]">{formData.email}</span>
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

                            <form onSubmit={handleVerifySubmit} className="space-y-6">
                                <div className="flex justify-between gap-2" onPaste={handleOtpPaste}>
                                    {otp.map((digit, index) => (
                                        <input
                                            key={index}
                                            ref={(el) => (otpInputRefs.current[index] = el)}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={1}
                                            value={digit}
                                            onChange={(e) => handleOtpChange(index, e.target.value)}
                                            onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                            className="w-full h-14 text-center text-xl font-bold rounded-lg bg-[#f9f9ff] border border-[#c7c5d3] text-[#181c22] focus:outline-none focus:border-[#222777] focus:ring-1 focus:ring-[#222777] transition-shadow"
                                        />
                                    ))}
                                </div>

                                <button
                                    type="submit"
                                    disabled={verifyLoading}
                                    className="w-full h-11 bg-[#222777] text-white rounded-lg text-sm font-bold hover:bg-[#3a3f8f] transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {verifyLoading ? 'Verifying...' : 'Verify & Enter Workspace'}
                                </button>

                                <div className="text-center">
                                    <button
                                        type="button"
                                        onClick={handleResendCode}
                                        disabled={resendCooldown > 0 || resendLoading}
                                        className="text-sm font-semibold text-[#222777] hover:underline disabled:text-[#777682] disabled:no-underline disabled:cursor-not-allowed"
                                    >
                                        {resendLoading
                                            ? 'Sending...'
                                            : resendCooldown > 0
                                                ? `Resend code in ${resendCooldown}s`
                                                : 'Resend verification code'}
                                    </button>
                                </div>

                                <div className="text-center">
                                    <button
                                        type="button"
                                        onClick={() => { setStep('auth'); setIsLoginView(true); setError(''); setSuccessMsg(''); }}
                                        className="text-xs font-semibold text-[#777682] hover:text-[#222777]"
                                    >
                                        Back to Sign In
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </section>

            {/* Forgot Password Modal */}
            {showForgotModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-[400px] bg-white rounded-xl shadow-xl p-8 relative border border-[#e0e2eb]">
                        <button
                            type="button"
                            onClick={closeForgotModal}
                            className="absolute top-4 right-4 text-[#777682] hover:text-[#181c22]"
                        >
                            <span className="material-symbols-outlined text-[20px]">close</span>
                        </button>

                        {forgotStep === 'email' ? (
                            <>
                                <h3 className="text-xl font-bold text-[#181c22] mb-2">Reset your password</h3>
                                <p className="text-[#464651] text-sm mb-6">Enter your email and we'll send you a 6-digit reset code.</p>

                                {forgotError && (
                                    <div className="mb-4 bg-[#ffdad6] text-[#ba1a1a] p-3 rounded-lg text-sm font-semibold">
                                        {forgotError}
                                    </div>
                                )}

                                <form onSubmit={handleForgotRequestCode} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-[#464651] mb-1 uppercase tracking-wider">Email</label>
                                        <input
                                            required
                                            type="email"
                                            value={forgotEmail}
                                            onChange={(e) => setForgotEmail(e.target.value)}
                                            placeholder="name@company.com"
                                            className="w-full h-10 px-4 rounded-lg bg-[#f9f9ff] border border-[#c7c5d3] text-[#181c22] focus:outline-none focus:border-[#222777] focus:ring-1 focus:ring-[#222777] transition-shadow"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={forgotLoading}
                                        className="w-full h-11 bg-[#222777] text-white rounded-lg text-sm font-bold hover:bg-[#3a3f8f] transition-colors disabled:opacity-70"
                                    >
                                        {forgotLoading ? 'Sending...' : 'Send Reset Code'}
                                    </button>
                                </form>
                            </>
                        ) : (
                            <>
                                <h3 className="text-xl font-bold text-[#181c22] mb-2">Enter reset code</h3>
                                <p className="text-[#464651] text-sm mb-6">
                                    We sent a 6-digit code to <span className="font-semibold text-[#181c22]">{forgotEmail}</span>. Enter it below with your new password.
                                </p>

                                {forgotError && (
                                    <div className="mb-4 bg-[#ffdad6] text-[#ba1a1a] p-3 rounded-lg text-sm font-semibold">
                                        {forgotError}
                                    </div>
                                )}
                                {forgotSuccess && !forgotError && (
                                    <div className="mb-4 bg-[#e6fbfc] text-[#006e73] p-3 rounded-lg text-sm font-semibold">
                                        {forgotSuccess}
                                    </div>
                                )}

                                <form onSubmit={handleForgotResetPassword} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-[#464651] mb-1 uppercase tracking-wider">Reset Code</label>
                                        <input
                                            required
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={6}
                                            value={forgotCode}
                                            onChange={(e) => setForgotCode(e.target.value.replace(/\D/g, ''))}
                                            placeholder="123456"
                                            className="w-full h-10 px-4 rounded-lg bg-[#f9f9ff] border border-[#c7c5d3] text-[#181c22] tracking-[0.3em] font-bold focus:outline-none focus:border-[#222777] focus:ring-1 focus:ring-[#222777] transition-shadow"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-[#464651] mb-1 uppercase tracking-wider">New Password</label>
                                        <div className="relative">
                                            <input
                                                required
                                                type={forgotShowPassword ? 'text' : 'password'}
                                                value={forgotNewPassword}
                                                onChange={(e) => setForgotNewPassword(e.target.value)}
                                                placeholder="••••••••"
                                                className="w-full h-10 px-4 rounded-lg bg-[#f9f9ff] border border-[#c7c5d3] text-[#181c22] focus:outline-none focus:border-[#222777] focus:ring-1 focus:ring-[#222777] transition-shadow pr-10"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setForgotShowPassword(!forgotShowPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#777682] hover:text-[#181c22]"
                                            >
                                                <span className="material-symbols-outlined text-[20px]">
                                                    {forgotShowPassword ? 'visibility' : 'visibility_off'}
                                                </span>
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-[#464651] mb-1 uppercase tracking-wider">Confirm Password</label>
                                        <input
                                            required
                                            type={forgotShowPassword ? 'text' : 'password'}
                                            value={forgotConfirmPassword}
                                            onChange={(e) => setForgotConfirmPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full h-10 px-4 rounded-lg bg-[#f9f9ff] border border-[#c7c5d3] text-[#181c22] focus:outline-none focus:border-[#222777] focus:ring-1 focus:ring-[#222777] transition-shadow"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={forgotLoading}
                                        className="w-full h-11 bg-[#222777] text-white rounded-lg text-sm font-bold hover:bg-[#3a3f8f] transition-colors disabled:opacity-70"
                                    >
                                        {forgotLoading ? 'Resetting...' : 'Reset Password'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setForgotStep('email')}
                                        className="w-full text-center text-xs font-semibold text-[#777682] hover:text-[#222777]"
                                    >
                                        Use a different email
                                    </button>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            )}
        </main>
    );
}
