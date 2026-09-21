function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export class VectorStore {
  constructor() {
    this.items = []; // { id, text, embedding }
  }

  add(items) {
    this.items.push(...items);
  }

  get size() {
    return this.items.length;
  }

  search(queryEmbedding, topK = 4) {
    return this.items
      .map((item) => ({
        ...item,
        score: cosineSimilarity(queryEmbedding, item.embedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }
}
