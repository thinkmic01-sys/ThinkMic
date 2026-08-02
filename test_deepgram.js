require('dotenv').config({ path: 'backend/.env' });
const WebSocket = require('ws');

const token = process.env.DEEPGRAM_API_KEY;
if (!token) {
  console.error("No DEEPGRAM_API_KEY found");
  process.exit(1);
}

const url = `wss://api.deepgram.com/v1/listen?punctuate=true&interim_results=true&language=ur`;
console.log("Connecting to:", url);

const ws = new WebSocket(url, ['token', token]);

ws.on('open', () => {
  console.log("Connected successfully!");
  ws.close();
});

ws.on('error', (err) => {
  console.error("Connection error:", err);
});

ws.on('close', (code, reason) => {
  console.log("Closed:", code, reason.toString());
});
