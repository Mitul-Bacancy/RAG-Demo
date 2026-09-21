import "dotenv/config";
import cors from "cors";
import express from "express";
import { initRag, isReady, answerQuestion } from "./ragService.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ ready: isReady() });
});

app.post("/api/chat", async (req, res) => {
  try {
    if (!isReady()) {
      return res.status(503).json({ error: "Index is still building, try again shortly." });
    }

    const { question, history } = req.body;
    if (!question || typeof question !== "string") {
      return res.status(400).json({ error: "`question` is required." });
    }
    if (history && (!Array.isArray(history) || history.length > 20)) {
      return res.status(400).json({ error: "`history` must be an array of at most 20 messages." });
    }

    const result = await answerQuestion(question, history || []);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong answering the question." });
  }
});

const PORT = process.env.PORT || 3001;

initRag()
  .then(() => {
    app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("Failed to build RAG index:", err.message);
    process.exit(1);
  });
