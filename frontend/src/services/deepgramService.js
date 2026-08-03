import api from './api';

class DeepgramService {
    constructor() {
        this.socket = null;
        this.onTranscript = null;
        this.onError = null;
        // Fired when the socket closes unexpectedly (network blip, Deepgram-side timeout) while
        // the caller did not request a disconnect - lets the UI surface a reconnect prompt
        this.onClose = null;
        this.keepAliveInterval = null;
        this.isIntentionalDisconnect = false;
    }

    isConnected() {
        return !!(this.socket && this.socket.readyState === WebSocket.OPEN);
    }

    async connect(language = 'en-US') {
        // Guard against duplicate sockets (e.g. a rapid double-click on pause/resume)
        if (this.isConnected()) {
            return true;
        }

        try {
            // Fetch temporary token from backend
            const response = await api.get('/deepgram/token');
            const token = response.data.token;

            if (token === 'dummy_token_configure_deepgram') {
                if (this.onError) this.onError(new Error("Deepgram is not configured. Please add DEEPGRAM_API_KEY to backend .env"));
                return false;
            }

            this.isIntentionalDisconnect = false;

            return new Promise((resolve, reject) => {
                const deepgramLang = language === 'ur-PK' ? 'ur' : 'en-US';
                const modelParam = language === 'ur-PK' ? '&model=nova-3' : '&model=nova-2';
                // Connect to Deepgram WebSocket using the token as a subprotocol
                this.socket = new WebSocket(`wss://api.deepgram.com/v1/listen?punctuate=true&interim_results=true&language=${deepgramLang}${modelParam}`, ['token', token]);

                this.socket.onopen = () => {
                    console.log('Deepgram WebSocket connected');
                    clearInterval(this.keepAliveInterval);
                    // Keep the connection alive during pauses/silence so Deepgram doesn't time it out
                    this.keepAliveInterval = setInterval(() => {
                        if (this.isConnected()) {
                            this.socket.send(JSON.stringify({ type: 'KeepAlive' }));
                        }
                    }, 10000);
                    resolve(true);
                };

                this.socket.onmessage = (message) => {
                    try {
                        const data = JSON.parse(message.data);
                        if (data.type === 'Results' && data.channel?.alternatives?.[0]) {
                            const transcript = data.channel.alternatives[0].transcript;
                            const isFinal = data.is_final;
                            if (this.onTranscript) this.onTranscript(transcript, isFinal);
                        }
                    } catch (parseError) {
                        console.error('Failed to parse Deepgram message:', parseError);
                    }
                };

                this.socket.onerror = (error) => {
                    console.error('Deepgram WebSocket error:', error);
                    if (this.onError) this.onError(error);
                    reject(error);
                };

                this.socket.onclose = (event) => {
                    console.log('Deepgram WebSocket closed', event.code, event.reason);
                    clearInterval(this.keepAliveInterval);
                    const wasIntentional = this.isIntentionalDisconnect;
                    this.socket = null;
                    if (!wasIntentional && this.onClose) {
                        this.onClose(event);
                    }
                };
            });
        } catch (error) {
            console.error('Failed to connect to Deepgram:', error);
            if (this.onError) this.onError(error);
            return false;
        }
    }

    sendAudio(audioData) {
        // Silently no-op when not connected (e.g. paused, mid-reconnect) - the caller's own
        // MediaRecorder chunk buffer is unaffected, so no audio data is corrupted, just not streamed
        if (this.isConnected()) {
            this.socket.send(audioData);
        }
    }

    disconnect() {
        this.isIntentionalDisconnect = true;
        if (this.socket) {
            // Send CloseStream message to let Deepgram finish processing the final chunk
            if (this.socket.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify({ type: 'CloseStream' }));
            }
            this.socket.close();
            this.socket = null;
        }
        clearInterval(this.keepAliveInterval);
    }
}

export default new DeepgramService();
