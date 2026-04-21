import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import pdf from 'pdf-parse';
import Groq from 'groq-sdk';
import { tavily } from '@tavily/core';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Google Site Verification Route
  app.get('/googlea6ad2833ec499026.html', (req, res) => {
    res.send('google-site-verification: googlea6ad2833ec499026.html');
  });

  app.post('/api/parse-pdf', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    try {
      const pdfData = await pdf(req.file.buffer);
      const text = pdfData.text.substring(0, 15000);
      res.json({ success: true, text });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Failed to upload/parse' });
    }
  });

  app.post('/api/analyze-text', async (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'No text provided' });

    try {
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `You are an expert academic research assistant. Analyse the research text and write a highly detailed, long, and well-structured literature review. 

### MANDATORY FORMATTING RULES:
1. STRUCTURE: Must use exactly these Markdown headers: ## Introduction, ## Key Concepts, ## Methodology, ## Findings, ## Discussion, ## Conclusion. Ensure each header is on its own line and followed by a blank line. DO NOT bold the header titles (e.g., do not use ## **Title**).
2. FORMATTING: Use **bold** for key terms or important concepts. Use bullet points for lists, key features, or detailed points to enhance readability and structure.
3. CITATIONS: Cite sources strictly using (Author, Year) at the VERY END of the sentence, before the period. NEVER put citations in the middle of sentences or as part of the sentence structure.
4. BIBLIOGRAPHY: The final "Bibliography" field must ONLY list references that appear as (Author, Year) in the summary text. Any reference not cited in the text must be excluded.
5. LENGTH: Ensure all sections are comprehensive.

Return a structured JSON response with these exact fields:
{
  "summary": "Full literature review text with the required ## headers, **bold** important points, bulleted lists for clarity, and (Author, Year) end-of-sentence citations.",
  "keyArguments": ["argument 1", "argument 2", "argument 3"],
  "methodology": "1 paragraph describing research methods",
  "limitations": ["limitation 1", "limitation 2"],
  "relevanceScore": 0-100,
  "citationApa": "full APA citation",
  "citationMla": "full MLA citation",
  "bibliography": "A comprehensive list of ONLY those references cited in the literature review above.",
  "suggestedRelatedTopics": ["topic 1", "topic 2", "topic 3"]
}
Respond ONLY with valid JSON. No preamble.`
          },
          { role: 'user', content: text }
        ],
        model: 'llama-3.3-70b-versatile',
        response_format: { type: 'json_object' }
      });

      const analysis = JSON.parse(completion.choices[0].message.content || '{}');
      res.json({ success: true, analysis });
    } catch (error) {
      console.error('Analysis error:', error);
      res.status(500).json({ error: 'Failed to analyze' });
    }
  });

  app.post('/api/search', async (req, res) => {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'Missing query' });
    try {
      const results = await tvly.search(query, {
        searchDepth: 'advanced',
        includeAnswer: true,
        maxResults: 5
      });
      res.json({ success: true, answer: results.answer, results: results.results });
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({ error: 'Failed to search' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
