require('dotenv').config();
const WebSocket = require('ws');

const token = process.env.DEEPGRAM_API_KEY;

const url = `wss://api.deepgram.com/v1/listen?punctuate=true&interim_results=true&language=ur&model=nova-3`;
console.log("Connecting to:", url);
const ws = new WebSocket(url, ['token', token]);
ws.on('open', () => { console.log("Connected successfully!"); ws.close(); });
ws.on('error', (err) => { console.error("Connection error:", err); });
ws.on('unexpected-response', (req, res) => {
    console.log("HTTP Status:", res.statusCode);
    res.on('data', chunk => { console.log(chunk.toString()); });
});
