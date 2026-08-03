import React, { useState, useRef, useEffect } from 'react';

/**
 * VoiceRecorder — Uses the Browser Web Speech API (SpeechRecognition)
 * for live speech-to-text transcription.
 * Falls back to a "not supported" message on unsupported browsers.
 */
export default function VoiceRecorder({ value, onChange, prompt }) {
    const [isListening, setIsListening] = useState(false);
    const [interimText, setInterimText] = useState('');
    const [supported, setSupported] = useState(true);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [errorMessage, setErrorMessage] = useState('');
    const recognitionRef = useRef(null);
    const timerRef = useRef(null);

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setSupported(false);
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
            let interim = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + ' ';
                } else {
                    interim += transcript;
                }
            }

            if (finalTranscript) {
                // Append final results to the existing value
                const newValue = (value || '') + finalTranscript;
                onChange(newValue);
            }
            setInterimText(interim);
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);

            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                setSupported(false);
                return;
            }
            if (event.error === 'no-speech') {
                // Not a real failure - the browser just didn't hear anything. onend's own
                // auto-restart logic will pick recognition back up if we're still listening.
                return;
            }

            const messages = {
                'audio-capture': 'No microphone was detected. Please connect a microphone and try again.',
                'network': 'Network error - speech recognition requires an internet connection.',
                'aborted': ''
            };
            setErrorMessage(messages[event.error] ?? 'Speech recognition encountered an error. Please try again.');

            recognitionRef.current._shouldListen = false;
            setIsListening(false);
            clearInterval(timerRef.current);
            setElapsedTime(0);
        };

        recognition.onend = () => {
            // If we're still supposed to be listening, restart (browser sometimes stops)
            if (recognitionRef.current?._shouldListen) {
                try { recognition.start(); } catch(e) {}
            } else {
                setIsListening(false);
                clearInterval(timerRef.current);
            }
        };

        recognitionRef.current = recognition;

        return () => {
            try { recognition.abort(); } catch (e) {}
            clearInterval(timerRef.current);
        };
    }, []);

    // We need to keep the onChange reference fresh
    useEffect(() => {
        if (!recognitionRef.current) return;
        const recognition = recognitionRef.current;

        recognition.onresult = (event) => {
            let interim = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + ' ';
                } else {
                    interim += transcript;
                }
            }

            if (finalTranscript) {
                const newValue = (value || '') + finalTranscript;
                onChange(newValue);
            }
            setInterimText(interim);
        };
    }, [value, onChange]);

    const toggleListening = () => {
        if (!recognitionRef.current) return;

        if (isListening) {
            recognitionRef.current._shouldListen = false;
            recognitionRef.current.stop();
            setIsListening(false);
            setInterimText('');
            clearInterval(timerRef.current);
            setElapsedTime(0);
        } else {
            try {
                recognitionRef.current._shouldListen = true;
                recognitionRef.current.start();
                setIsListening(true);
                setErrorMessage('');
                setElapsedTime(0);
                timerRef.current = setInterval(() => {
                    setElapsedTime(prev => prev + 1);
                }, 1000);
            } catch (e) {
                console.error('Failed to start recognition:', e);
                setErrorMessage('Could not start speech recognition. Please try again.');
            }
        }
    };

    const clearTranscript = () => {
        onChange('');
        setInterimText('');
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    if (!supported) {
        return (
            <div>
                {prompt && <p className="text-[12px] italic text-[#777682] mb-3">"{prompt}"</p>}
                <div className="border border-[#e0e2eb] rounded-xl bg-[#f9f9ff] p-4">
                    <div className="flex items-center gap-2 mb-3 text-[#ba1a1a]">
                        <span className="material-symbols-outlined text-[18px]">error</span>
                        <span className="text-[12px] font-bold">Speech recognition not supported in this browser. Please use Chrome or Edge.</span>
                    </div>
                    <textarea 
                        placeholder="Type your response here instead..."
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-full h-24 bg-white border border-[#c7c5d3] rounded-lg p-3 text-[13px] outline-none resize-none focus:border-[#222777]"
                    />
                </div>
            </div>
        );
    }

    return (
        <div>
            {prompt && <p className="text-[12px] italic text-[#777682] mb-3">"{prompt}"</p>}
            {errorMessage && (
                <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-lg bg-[#ffdad6] border border-[#ba1a1a]/30 text-[#ba1a1a]">
                    <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
                    <span className="text-[12px] font-bold flex-1">{errorMessage}</span>
                    <button type="button" onClick={() => setErrorMessage('')} className="hover:opacity-70">
                        <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                </div>
            )}
            <div className="border border-[#e0e2eb] rounded-xl bg-[#f9f9ff] overflow-hidden shadow-sm">

                {/* Controls Bar */}
                <div className="flex items-center justify-between border-b border-[#e0e2eb] p-3 sm:p-4 bg-white/50">
                    <div className="flex items-center gap-3">
                        <button 
                            type="button"
                            onClick={toggleListening} 
                            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm ${
                                isListening 
                                    ? 'bg-[#ba1a1a] text-white animate-pulse shadow-[0_0_15px_rgba(186,26,26,0.4)]' 
                                    : 'bg-[#ffdad6] text-[#ba1a1a] hover:bg-[#ba1a1a] hover:text-white'
                            }`}
                        >
                            <span className="material-symbols-outlined text-[22px]">{isListening ? 'stop' : 'mic'}</span>
                        </button>
                        <div className="flex flex-col">
                            <span className={`text-[13px] font-bold ${isListening ? 'text-[#ba1a1a]' : 'text-[#464651]'}`}>
                                {isListening ? 'Listening...' : 'Click to start'}
                            </span>
                            {isListening && (
                                <span className="text-[11px] font-mono text-[#777682]">{formatTime(elapsedTime)}</span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Live indicator */}
                        {isListening && (
                            <div className="flex items-center gap-1.5 bg-[#ba1a1a]/10 px-3 py-1.5 rounded-full">
                                <span className="w-2 h-2 rounded-full bg-[#ba1a1a] animate-pulse"></span>
                                <span className="text-[11px] font-bold text-[#ba1a1a] uppercase tracking-wider">Live</span>
                            </div>
                        )}
                        {(value || '').length > 0 && !isListening && (
                            <button 
                                type="button"
                                onClick={clearTranscript}
                                className="text-[11px] font-bold text-[#777682] hover:text-[#ba1a1a] transition-colors px-2 py-1"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                {/* Waveform visualization */}
                {isListening && (
                    <div className="flex items-center justify-center gap-[3px] h-10 bg-[#ba1a1a]/5 border-b border-[#e0e2eb]">
                        {Array.from({ length: 24 }).map((_, i) => (
                            <div 
                                key={i} 
                                className="w-[3px] bg-[#ba1a1a] rounded-full animate-pulse" 
                                style={{ 
                                    height: `${Math.random() * 24 + 6}px`,
                                    animationDelay: `${i * 0.05}s`,
                                    animationDuration: `${0.4 + Math.random() * 0.4}s`
                                }}
                            />
                        ))}
                    </div>
                )}

                {/* Transcript Area */}
                <div className="relative">
                    <textarea 
                        placeholder={isListening ? "Speak now... your words will appear here in real-time" : "Click the mic button to start speaking, or type here..."}
                        value={(value || '') + (interimText ? interimText : '')}
                        onChange={(e) => {
                            if (!isListening) {
                                onChange(e.target.value);
                            }
                        }}
                        readOnly={isListening}
                        className={`w-full h-28 bg-transparent p-3 sm:p-4 text-[13px] sm:text-[14px] outline-none resize-none leading-relaxed ${
                            isListening ? 'text-[#464651] cursor-default' : 'text-[#181c22]'
                        }`}
                    />
                    {/* Interim text highlight */}
                    {isListening && interimText && (
                        <div className="absolute bottom-2 left-3 right-3">
                            <span className="text-[11px] text-[#777682] italic bg-[#e0e2eb]/50 px-2 py-1 rounded">
                                Processing: {interimText}
                            </span>
                        </div>
                    )}
                </div>

                {/* Footer with word count */}
                <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-t border-[#e0e2eb] bg-white/30">
                    <span className="text-[11px] text-[#c7c5d3] font-mono">
                        {(value || '').split(/\s+/).filter(Boolean).length} words
                    </span>
                    <span className="text-[11px] text-[#c7c5d3]">
                        Powered by Web Speech API
                    </span>
                </div>
            </div>
        </div>
    );
}
