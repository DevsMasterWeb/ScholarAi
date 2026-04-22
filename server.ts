import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import pdf from 'pdf-parse';
import { tavily } from '@tavily/core';
import { jsonrepair } from 'jsonrepair';
import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenAI } from '@google/genai';

let _tvly: ReturnType<typeof tavily> | null = null;
function getTavily() {
  if (!_tvly) {
    let key = process.env.TAVILY_API_KEY;
    if (!key) throw new Error('TAVILY_API_KEY is not set');
    const sanitizedKey = key.trim().replace(/^["'](.+)["']$/, '$1');
    _tvly = tavily({ apiKey: sanitizedKey });
  }
  return _tvly;
}

let _pinecone: Pinecone | null = null;
function getPinecone() {
  if (!_pinecone) {
    let key = process.env.PINECONE_API_KEY;
    if (!key) throw new Error('PINECONE_API_KEY is not set');
    const sanitizedKey = key.trim().replace(/^["'](.+)["']$/, '$1');
    _pinecone = new Pinecone({ apiKey: sanitizedKey });
  }
  return _pinecone;
}

let _genAI: GoogleGenAI | null = null;
function getGenAI() {
  if (!_genAI) {
    // Check for a custom key first, fallback to standard GEMINI_API_KEY
    let key = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GOOGLE_AI_API_KEY or GEMINI_API_KEY is not set');
    
    // Sanitize: remove whitespace and accidental wrapping quotes
    const sanitizedKey = key.trim().replace(/^["'](.+)["']$/, '$1');
    _genAI = new GoogleGenAI({ apiKey: sanitizedKey });
  }
  return _genAI;
}

function chunkText(text: string, chunkSize = 4000, overlap = 500) {
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
      // Ensure we have a buffer
      if (!req.file.buffer) throw new Error("File buffer is missing");

      const pdfData = await pdf(req.file.buffer);
      
      if (!pdfData || !pdfData.text) {
        return res.status(422).json({ error: 'Could not extract text from this PDF. It might be an image-only scan.' });
      }

      // Truncate to avoid downstream LLM limits
      const text = pdfData.text.substring(0, 40000);
      res.json({ success: true, text });
    } catch (error: any) {
      console.error('PDF Parse error:', error);
      res.status(500).json({ error: error.message || 'Failed to parse PDF' });
    }
  });

  app.post('/api/analyze-text', async (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'No text provided' });

    try {
      const genAI = getGenAI();
      const response = await genAI.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Please analyze the following academic text and output the requested JSON object:\n\n<text>\n${text}\n</text>`,
        config: {
          systemInstruction: `You are an expert academic research assistant. You MUST respond with ONLY a valid JSON object. Do not add any text, markdown formatting, or explanations before or after the JSON. Your entire response must start with '{' and end with '}'.

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
}`,
          responseMimeType: 'application/json'
        }
      });

      // Extract JSON from the response
      const content = response.text || '{}';
      
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

      const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));
      
      async function embedWithRetry(chunk: string, index: number, maxRetries = 2): Promise<any> {
        let lastError: any;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            // Wait 5 seconds between regular chunks (12 RPM) to be safe on Free Tier
            if (attempt === 0 && index > 0) await sleep(5000); 
            // If it's a retry due to 429, wait even longer (10 seconds)
            if (attempt > 0) await sleep(10000);

            const response: any = await genAI.models.embedContent({
              model: 'gemini-embedding-2-preview',
              contents: [{ parts: [{ text: chunk }] }],
              config: { outputDimensionality: 768 }
            });
            return response;
          } catch (err: any) {
            lastError = err;
            if (err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED')) {
              console.warn(`Hit 429 on chunk ${index}, attempt ${attempt + 1}. Retrying...`);
              continue;
            }
            throw err; // Non-429 errors shouldn't be retried in the same way
          }
        }
        throw lastError;
      }

      let chunksProcessed = 0;
      for (let i = 0; i < chunks.length; i++) {
        try {
          const response = await embedWithRetry(chunks[i], i);
          // SDK can return embedding.values or embeddings[0].values
          const vector = response.embedding?.values || response.embeddings?.[0]?.values;
          
          if (vector && vector.length > 0) {
            const record = {
              id: `${documentId}-chunk-${i}`,
              values: vector,
              metadata: { userId, documentId, title: title || 'Untitled Document', text: chunks[i] }
            };
            
            console.log(`[Indexing] Upserting chunk ${i+1}/${chunks.length} for doc: ${documentId} (User: ${userId})`);
            await index.upsert({ records: [record] as any }); 
            chunksProcessed++;
          }
        } catch (embErr: any) {
          console.error(`Gave up on chunk ${i} after retries:`, embErr.message);
        }
      }
      
      console.log(`[Indexing] Completed indexing for doc ${documentId}. Processed ${chunksProcessed} chunks.`);
      res.json({ success: true, chunksProcessed });
    } catch (error: any) {
      console.error('Vector index error:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to index document' });
    }
  });

  app.post('/api/chat-library', async (req, res) => {
    const { query, userId } = req.body;
    if (!query || !userId) return res.status(400).json({ error: 'Missing query or user' });

    try {
      const genAI = getGenAI();
      const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

      async function embedQueryWithRetry(q: string, maxRetries = 3): Promise<any> {
        let lastError: any;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            if (attempt > 0) await sleep(2000 * attempt); // Increasing delay on retries
            const response: any = await genAI.models.embedContent({
              model: 'gemini-embedding-2-preview',
              contents: [{ parts: [{ text: q }] }],
              config: { outputDimensionality: 768 }
            });
            return response;
          } catch (err: any) {
            lastError = err;
            if (err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED')) continue;
            throw err;
          }
        }
        throw lastError;
      }

      const response = await embedQueryWithRetry(query);
      const vector = response.embedding?.values || response.embeddings?.[0]?.values;
      if (!vector || vector.length === 0) {
        console.error("Embedding response from Gemini:", JSON.stringify(response));
        throw new Error("No embedding returned for query");
      }

      console.log(`[RAG Search] User ${userId} is querying: "${query.substring(0, 50)}..."`);
      const pinecone = getPinecone();
      const index = pinecone.index('scholarai-rag');
      
      const searchRes = await index.query({
        vector: vector,
        topK: 5,
        filter: { userId: { $eq: userId } },
        includeMetadata: true
      });

      console.log(`[RAG Search] Found ${searchRes.matches?.length || 0} matches in Pinecone for user ${userId}`);
      
      if (!searchRes.matches || searchRes.matches.length === 0) {
        // Diagnostic search: check if user has ANY documents at all in Pinecone
        const stats = await index.describeIndexStats();
        console.log(`[RAG Search] Index Stats:`, JSON.stringify(stats));
        
        return res.json({ 
          success: true, 
          answer: "I searched your library but couldn't find any documents matching your question. \n\n**Possible reasons:**\n1. **New Paper:** If you just uploaded a paper, it takes about 10 seconds per page to index. Try again in a minute.\n2. **Old Data:** Papers uploaded before the latest system update (approx 1 hour ago) need to be re-uploaded to work with this chat.\n3. **No Context:** The papers in your library might not contain the answer to this specific question." 
        });
      }

      const contexts = searchRes.matches.map(m => `[Source: ${m.metadata?.title}]\n${m.metadata?.text}`).join('\n\n---\n\n');

      const responseGen = await genAI.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: query,
        config: {
          systemInstruction: `You are an expert academic assistant. Using ONLY the provided context blocks below, answer the user's question. If the answer is not in the context, politely state that you cannot answer it based on their uploaded library. Always cite your specific sources inline using the [Source: Title] provided in the context.\n\n<Context>\n${contexts}\n</Context>`
        }
      });

      res.json({ success: true, answer: responseGen.text });
    } catch (error: any) {
      console.error('RAG search error:', error);
      res.status(500).json({ error: error.message || 'Failed to search library' });
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
