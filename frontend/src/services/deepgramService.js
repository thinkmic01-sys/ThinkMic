import api from './api';

class DeepgramService {
    constructor() {
        this.socket = null;
        this.onTranscript = null;
        this.onError = null;
        this.keepAliveInterval = null;
    }

    async connect(language = 'en-US') {
        try {
            // Fetch temporary token from backend
            const response = await api.get('/deepgram/token');
            const token = response.data.token;

            if (token === 'dummy_token_configure_deepgram') {
                if (this.onError) this.onError(new Error("Deepgram is not configured. Please add DEEPGRAM_API_KEY to backend .env"));
                return false;
            }

            return new Promise((resolve, reject) => {
                const deepgramLang = language === 'ur-PK' ? 'ur' : 'en-US';
                const modelParam = language === 'ur-PK' ? '' : '&model=nova-2';
                // Connect to Deepgram WebSocket using the token as a subprotocol
                this.socket = new WebSocket(`wss://api.deepgram.com/v1/listen?punctuate=true&interim_results=true&language=${deepgramLang}${modelParam}`, ['token', token]);
                
                this.socket.onopen = () => {
                    console.log('Deepgram WebSocket connected');
                    // Keep the connection alive if no audio is sent for 10 seconds
                    this.keepAliveInterval = setInterval(() => {
                        if (this.socket.readyState === WebSocket.OPEN) {
                            this.socket.send(JSON.stringify({ type: 'KeepAlive' }));
                        }
                    }, 10000);
                    resolve(true);
                };

                this.socket.onmessage = (message) => {
                    const data = JSON.parse(message.data);
                    if (data.type === 'Results' && data.channel.alternatives[0]) {
                        const transcript = data.channel.alternatives[0].transcript;
                        const isFinal = data.is_final;
                        if (this.onTranscript) this.onTranscript(transcript, isFinal);
                    }
                };

                this.socket.onerror = (error) => {
                    console.error('Deepgram WebSocket error:', error);
                    if (this.onError) this.onError(error);
                    reject(error);
                };

                this.socket.onclose = () => {
                    console.log('Deepgram WebSocket closed');
                    clearInterval(this.keepAliveInterval);
                };
            });
        } catch (error) {
            console.error('Failed to connect to Deepgram:', error);
            if (this.onError) this.onError(error);
            return false;
        }
    }

    sendAudio(audioData) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(audioData);
        }
    }

    disconnect() {
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
