# GrandVista Hotel Assistant — RAG Chatbot

A document-grounded chatbot for a fictional hotel (hospitality domain). It answers guest
questions using only the hotel's guest guide, remembers the conversation, and says
"I don't have that information." when the answer isn't in the document.

## How it works

1. **Load** — `server/data/grandvista-hotel-guide.md` is read on server startup.
2. **Split** — [chunker.js](server/src/chunker.js) splits the markdown by section headings, then by
   paragraph, into ~800-character overlapping chunks.
3. **Embed & store** — each chunk is embedded with OpenAI's `text-embedding-3-small` and kept
   in an in-memory vector store ([vectorStore.js](server/src/vectorStore.js)).
4. **Retrieve** — each question is embedded and compared via cosine similarity to fetch the
   top 4 most relevant chunks.
5. **Generate** — those chunks, the last 10 turns of chat history, and the question are sent to
   `gpt-4o-mini` with a system prompt restricting it to the provided context.
6. **Guard** — the prompt instructs the model to reply "I don't have that information." when the
   context doesn't answer the question.

## Setup

### 1. Backend

```
cd server
npm install
cp .env.example .env   # then add your OPENAI_API_KEY
npm run dev
```

Server runs on http://localhost:3001 and builds the embedding index on startup (logs when ready).

### 2. Frontend

```
cd client
npm install
npm run dev
```

Open http://localhost:5173 — requests to `/api/*` are proxied to the backend.

## Try asking

- "What time is check-in?"
- "Can I bring my dog?"
- "How much is a deluxe room in July?"
- "What about a follow-up: is breakfast included with that?" (tests conversation memory)
- "What's the weather like tomorrow?" (should say it doesn't have that information)

## Swap in your own document

Replace `server/data/grandvista-hotel-guide.md` with any `.md`/`.txt` file and update
`DOC_PATH` in [ragService.js](server/src/ragService.js) if you rename it. Restart the server to rebuild the index.
