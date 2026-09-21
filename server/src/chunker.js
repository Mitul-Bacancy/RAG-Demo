// Splits markdown text into overlapping chunks, breaking on section headings and
// paragraph boundaries so related sentences stay together.
export function chunkDocument(text, { chunkSize = 800, overlap = 150 } = {}) {
  const sections = text
    .split(/\n(?=#{1,3}\s)/g)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks = [];

  for (const section of sections) {
    if (section.length <= chunkSize) {
      chunks.push(section);
      continue;
    }

    const paragraphs = section.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
    let current = "";

    for (const para of paragraphs) {
      if ((current + "\n\n" + para).length > chunkSize && current) {
        chunks.push(current.trim());
        const tail = current.slice(-overlap);
        current = tail + "\n\n" + para;
      } else {
        current = current ? current + "\n\n" + para : para;
      }
    }
    if (current.trim()) chunks.push(current.trim());
  }

  return chunks;
}
