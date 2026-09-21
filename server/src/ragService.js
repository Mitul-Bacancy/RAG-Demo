import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI } from "@google/genai";
import { chunkDocument } from "./chunker.js";
import { VectorStore } from "./vectorStore.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOC_PATH = path.join(__dirname, "..", "data", "grandvista-hotel-guide.md");
const EMBEDDING_MODEL = "gemini-embedding-001";
const CHAT_MODEL = "gemini-2.5-flash";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const store = new VectorStore();

let ready = false;

async function embedTexts(texts) {
  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: texts,
  });
  return response.embeddings.map((e) => e.values);
}

export async function initRag() {
  const text = fs.readFileSync(DOC_PATH, "utf-8");
  const chunks = chunkDocument(text);

  const embeddings = await embedTexts(chunks);

  const items = chunks.map((chunkText, i) => ({
    id: i,
    text: chunkText,
    embedding: embeddings[i],
  }));

  store.add(items);
  ready = true;
  console.log(`RAG index ready: ${items.length} chunks embedded from ${path.basename(DOC_PATH)}`);
}

export function isReady() {
  return ready;
}

const SYSTEM_PROMPT = `You are a helpful assistant for The GrandVista Hotel. You must answer guest questions using ONLY the information provided in the "Context" section below, plus the ongoing conversation history for continuity.

Rules:
- If the answer is not contained in the provided context, respond exactly: "I don't have that information." Do not guess, infer beyond the text, or use outside knowledge.
- You may use the conversation history to resolve references (e.g. "what about pets" following a question about fees), but the factual content of your answer must still come from the context.
- Be concise and direct. Quote specific numbers, prices, and policies exactly as given in the context.
- Do not mention "the context" or "the document" in your answer; just answer naturally as hotel staff would.`;

export async function answerQuestion(question, history = [], topK = 4) {
  if (!ready) throw new Error("RAG index not ready yet");

  const [queryEmbedding] = await embedTexts([question]);
  const matches = store.search(queryEmbedding, topK);

  const contextBlock = matches
    .map((m, i) => `[Excerpt ${i + 1}]\n${m.text}`)
    .join("\n\n");

  const contents = [
    ...history.map((h) => ({
      role: h.role === "assistant" ? "model" : "user",
      parts: [{ text: h.content }],
    })),
    {
      role: "user",
      parts: [{ text: `Context:\n${contextBlock}\n\nQuestion: ${question}` }],
    },
  ];

  const response = await ai.models.generateContent({
    model: CHAT_MODEL,
    contents,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0.2,
    },
  });

  return {
    answer: response.text.trim(),
    sources: matches.map((m) => ({ id: m.id, score: m.score, preview: m.text.slice(0, 140) })),
  };
}
