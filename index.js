const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

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

// Submit code to Judge0
app.post('/submit', async (req, res) => {
  const { code, language, input } = req.body;
  const languageId = LANGUAGE_IDS[language];

  try {
    const { data: submission } = await axios.post(
      'https://judge0-ce.p.rapidapi.com/submissions',
      {
        source_code: code,
        language_id: languageId,
        stdin: input,
        redirect_stderr_to_stdout: true,
      },
      { headers: JUDGE0_HEADERS }
    );

    res.json({ token: submission.token });
  } catch (error) {
    console.error('Submission error:', error);
    res.status(500).json({ error: 'Failed to submit code' });
  }
});

// Poll Judge0 for result
app.get('/result/:token', async (req, res) => {
  const { token } = req.params;

  try {
    const { data: result } = await axios.get(
      `https://judge0-ce.p.rapidapi.com/submissions/${token}`,
      { headers: JUDGE0_HEADERS }
    );

    if (result.status.id <= 2) { // In queue or processing
      res.json({ status: 'processing' });
    } else {
      res.json({ output: result.stdout || result.stderr, status: 'completed' });
    }
  } catch (error) {
    console.error('Polling error:', error);
    res.status(500).json({ error: 'Failed to fetch result' });
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});