import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import pdf from 'pdf-parse';
import Groq from 'groq-sdk';
import { tavily } from '@tavily/core';
import { jsonrepair } from 'jsonrepair';
import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenAI } from '@google/genai';

let _groq: Groq | null = null;
function getGroq() {
  if (!_groq) {
    const key = process.env.GROQ_API_KEY;
    if (!key) throw new Error('GROQ_API_KEY is not set');
    _groq = new Groq({ apiKey: key });
  }
  return _groq;
}

let _tvly: ReturnType<typeof tavily> | null = null;
function getTavily() {
  if (!_tvly) {
    const key = process.env.TAVILY_API_KEY;
    if (!key) throw new Error('TAVILY_API_KEY is not set');
    _tvly = tavily({ apiKey: key });
  }
  return _tvly;
}

let _pinecone: Pinecone | null = null;
function getPinecone() {
  if (!_pinecone) {
    const key = process.env.PINECONE_API_KEY;
    if (!key) throw new Error('PINECONE_API_KEY is not set');
    _pinecone = new Pinecone({ apiKey: key });
  }
  return _pinecone;
}

let _genAI: GoogleGenAI | null = null;
function getGenAI() {
  if (!_genAI) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY is not set');
    _genAI = new GoogleGenAI({ apiKey: key });
  }
  return _genAI;
}

function chunkText(text: string, chunkSize = 1500, overlap = 300) {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + chunkSize));
    i += chunkSize - overlap;
  }
  return chunks;
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // SEO and Verification Routes
  app.get('/googlea6ad2833ec499026.html', (req, res) => {
    res.send('google-site-verification: googlea6ad2833ec499026.html');
  });

  app.get('/sitemap.xml', (req, res) => {
    res.type('application/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://scholarai-bkxx.onrender.com/</loc>
    <lastmod>2026-04-21</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`);
  });

  app.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.send(`User-agent: *\nAllow: /\n\nSitemap: https://scholarai-bkxx.onrender.com/sitemap.xml`);
  });

  app.post('/api/parse-pdf', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    try {
      const pdfData = await pdf(req.file.buffer);
      // Restricted to 30,000 characters to process the paper without hitting Groq 12K RPM Free Tier limits.
      // (1 token is roughly 4 characters. 30,000 / 4 = 7,500 tokens, leaving room for system prompt and output).
      const text = pdfData.text.substring(0, 30000);
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
      const groqClient = getGroq();
      const completion = await groqClient.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `You are an expert academic research assistant. You MUST respond with ONLY a valid JSON object. Do not add any text, markdown formatting, or explanations before or after the JSON. Your entire response must start with '{' and end with '}'.

Analyse the research text and write a highly detailed, long, and well-structured literature review. 

### MANDATORY FORMATTING RULES:
1. STRUCTURE: Must use exactly these Markdown headers: ## Introduction, ## Key Concepts, ## Methodology, ## Findings, ## Discussion, ## Conclusion. Ensure each header is on its own line and followed by a blank line. DO NOT bold the header titles.
2. FORMATTING: Use **bold** for key terms or important concepts. Use bullet points for lists.
3. ANTI-HALLUCINATION (AUTHORS): You MUST scan the text to extract the ACTUAL author(s) or writer(s). If no author is found, you MUST use exactly "No author mentioned". DO NOT invent or guess author names. DO NOT output placeholder names like "Author, A".
4. ANTI-HALLUCINATION (CITATIONS & BIBLIOGRAPHY): For internal citations, ONLY use the actual authors found in the text. If the uploaded text has its own 'References' or 'Bibliography' section, extract and cite ONLY those real external works. DO NOT hallucinate, invent, or randomly generate external references or dates. 
5. VALID JSON: You must escape all newlines as \\n and control characters inside JSON strings. DO NOT output raw newlines inside the string values.

Return a structured JSON response with these exact fields:
{
  "documentTitle": "The actual title of the research paper based on the content",
  "summary": "Full literature review text with the required ## headers, **bold** important points, bulleted lists for clarity, and (Author, Year) end-of-sentence citations. ONLY cite the main author or actual references found in the text.",
  "keyArguments": ["argument 1", "argument 2", "argument 3"],
  "methodology": "1 paragraph describing research methods",
  "limitations": ["limitation 1", "limitation 2"],
  "relevanceScore": 85,
  "citationApa": "full APA citation using the true author or 'No author mentioned'. DO NOT invent the author.",
  "citationMla": "full MLA citation using the true author or 'No author mentioned'. DO NOT invent the author.",
  "bibliography": "A comprehensive list of the main paper AND exact, real external references extracted directly from the uploaded document's own reference list. DO NOT hallucinate any references.",
  "suggestedRelatedTopics": ["topic 1", "topic 2", "topic 3"]
}`
          },
          { role: 'user', content: `Please analyze the following academic text and output the requested JSON object:\n\n<text>\n${text}\n</text>` }
        ],
        model: 'llama-3.3-70b-versatile'
      });

      // Extract JSON from the response, even if it has markdown or preamble
      const content = completion.choices[0].message.content || '{}';
      
      try {
        // Attempt to find the first '{' and last '}' to strip markdown backticks
        const startIdx = content.indexOf('{');
        const endIdx = content.lastIndexOf('}');
        
        if (startIdx === -1 || endIdx === -1) {
          throw new Error("No JSON object found in response");
        }
        
        const rawJsonString = content.substring(startIdx, endIdx + 1);
        
        // Pass the raw string through jsonrepair to auto-fix missing quotes, unescaped newlines, trailing commas, etc.
        const repairedJsonString = jsonrepair(rawJsonString);
        
        const analysis = JSON.parse(repairedJsonString);
        res.json({ success: true, analysis });
      } catch (e) {
        console.error("JSON Parsing failed. Raw content:", content);
        throw e; // Cascade to the outer catch block
      }
    } catch (error: any) {
      console.error('Analysis error:', error);
      if (error.status === 413 || error?.error?.code === 'rate_limit_exceeded' || error?.message?.includes('tokens per minute')) {
        return res.status(413).json({ error: 'AI Rate Limit Reached: The document is too large for the current model limits. Please try a smaller document or try again later.' });
      }
      res.status(500).json({ error: error?.message || 'Failed to analyze' });
    }
  });

  app.post('/api/index-document', async (req, res) => {
    const { text, documentId, userId, title } = req.body;
    if (!text || !documentId || !userId) return res.status(400).json({ error: 'Missing parameters' });

    try {
      const chunks = chunkText(text);
      const pinecone = getPinecone();
      const index = pinecone.index('scholarai-rag');
      const genAI = getGenAI();

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const response = await genAI.models.embedContent({
            model: 'text-embedding-004',
            contents: chunk,
        });
        
        await (index as any).upsert([
          {
            id: `${documentId}-chunk-${i}`,
            values: response.embeddings?.[0]?.values || [],
            metadata: {
              userId,
              documentId,
              title: title || 'Untitled Document',
              text: chunk
            }
          }
        ]);
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Vector index error:', error);
      res.status(500).json({ error: 'Failed to index document' });
    }
  });

  app.post('/api/chat-library', async (req, res) => {
    const { query, userId } = req.body;
    if (!query || !userId) return res.status(400).json({ error: 'Missing query or user' });

    try {
      const genAI = getGenAI();
      const queryEmbed = await genAI.models.embedContent({
        model: 'text-embedding-004',
        contents: query,
      });

      const pinecone = getPinecone();
      const index = pinecone.index('scholarai-rag');
      
      const searchRes = await index.query({
        vector: queryEmbed.embeddings?.[0]?.values || [],
        topK: 5,
        filter: { userId: { $eq: userId } },
        includeMetadata: true
      });

      const contexts = searchRes.matches.map(m => `[Source: ${m.metadata?.title}]\n${m.metadata?.text}`).join('\n\n---\n\n');

      const groqClient = getGroq();
      const completion = await groqClient.chat.completions.create({
        messages: [
          { role: 'system', content: `You are an expert academic assistant. Using ONLY the provided context blocks below, answer the user's question. If the answer is not in the context, politely state that you cannot answer it based on their uploaded library. Always cite your specific sources inline using the [Source: Title] provided in the context.\n\n<Context>\n${contexts}\n</Context>` },
          { role: 'user', content: query }
        ],
        model: 'llama-3.3-70b-versatile'
      });

      res.json({ success: true, answer: completion.choices[0].message.content });
    } catch (error) {
      console.error('RAG search error:', error);
      res.status(500).json({ error: 'Failed to search library' });
    }
  });

  app.post('/api/search', async (req, res) => {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'Missing query' });
    try {
      const tvlyClient = getTavily();
      const results = await tvlyClient.search(query, {
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
