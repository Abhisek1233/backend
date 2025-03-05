const WebSocket = require('ws');
const axios = require('axios');
require('dotenv').config();

const wss = new WebSocket.Server({ port: 5001 });
console.log('WebSocket server running on port 5001');

const LANGUAGE_IDS = {
  c: 50,
  cpp: 54,
  java: 62,
  python: 71,
  javascript: 63,
};

const JUDGE0_HEADERS = {
  'X-RapidAPI-Key': process.env.JUDGE0_API_KEY,
  'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
};

wss.on('connection', (ws) => {
  console.log('New client connected');

  ws.on('message', async (message) => {
    try {
      const { code, language, input } = JSON.parse(message);
      const languageId = LANGUAGE_IDS[language];
      
      const { data: submission } = await axios.post(
        'https://judge0-ce.p.rapidapi.com/submissions',
        {
          source_code: code,
          language_id: languageId,
          stdin: input,
          redirect_stderr_to_stdout: true
        },
        { headers: JUDGE0_HEADERS }
      );

      const pollResult = async () => {
        try {
          const { data: result } = await axios.get(
            `https://judge0-ce.p.rapidapi.com/submissions/${submission.token}`,
            { headers: JUDGE0_HEADERS }
          );

          if (result.status.id <= 2) { // In queue or processing
            setTimeout(pollResult, 2000);
          } else {
            const output = result.stdout || result.stderr || result.message;
            ws.send(JSON.stringify({ output }));
          }
        } catch (error) {
          ws.send(JSON.stringify({ error: 'Error fetching result' }));
        }
      };

      pollResult();
    } catch (error) {
      console.error('Error:', error);
      ws.send(JSON.stringify({ 
        error: error.response?.data?.error || 'Server error' 
      }));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});