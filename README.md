# Swiss Legal QA App

A Next.js application that provides answers to legal questions based on the Swiss Civil Code, using OpenAI's GPT model.

## Pipeline
### Pre-processing
1. **Source**  
   Legal texts are sourced from the English translation of the Swiss Civil Code via the [Official Swiss Federal Law Database](https://www.fedlex.admin.ch/eli/cc/24/233_245_233/en).

2. **Data Extraction**  
   Articles are extracted and converted into a structured CSV format using a combination of manual and LLM parsing.

3. **Embedding Generation**  
   Each article is embedded using `Xenova/paraphrase-MiniLM-L6-v2`, producing 384-dimensional vectors.

---

### Runtime Flow

1. **User Input**  
   A legal question is entered through the app interface.

2. **Initial GPT Response**  
   The question is passed to OpenAI’s API to generate a *raw* legal-style answer.

3. **Question Embedding**  
   The generated response is embedded using `Xenova/paraphrase-MiniLM-L6-v2`.

4. **Similarity Search**  
   Cosine similarity is computed between the embedded answer and all article embeddings.

5. **Top-20 Retrieval**  
   The top 20 most relevant legal articles are selected based on similarity scores.

6. **Final GPT Query**  
   The original question and retrieved relevant articles are fed into a second OpenAI API call to generate the final answer.

7. **Response Output**  
   - Legal answer is returned, including proper citations.  
   - Top-20 articles displayed with their similarity score.


## Future Improvements

1. **Add Legal Structure to Embeddings**  
   Include each article’s part, section, and subsection when generating embeddings to give the model more context and improve relevance.

2. **Bring in Court Decisions**  
   Use Swiss court rulings as an additional knowledge source. These decisions often provide practical interpretations of the law and could make the answers more grounded and useful.

3. **Support Multiple Languages**  
   Work with the original legal texts in German, French, and Italian—the official and binding versions of the law.  
   Translate user questions into each language, run the same retrieval process, and combine the results.  
   This would also help with court decisions, which are often published in only one of the three languages.

## Tech Stack

- Next.js 14
- TypeScript
- OpenAI API
- Tailwind CSS

## Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key

# Main code

## Embedding text
### Load Model:
```typescript
import { pipeline } from '@xenova/transformers';
const embedder = await pipeline('feature-extraction', 'Xenova/paraphrase-MiniLM-L6-v2') as EmbedderFunction;
```

### Embed Articles:
```typescript
const batchSize = 10;
  for (let i = 0; i < articles.length; i += batchSize) {
    const batch = articles.slice(i, i + batchSize);
    console.log(`Processing batch ${i/batchSize + 1} of ${Math.ceil(articles.length/batchSize)}`);
    
    for (const article of batch) {
      try {
        // Create the input string
        const embedInput = `${article.article_text}`;

        // Split long text into chunks
        const words = embedInput.split(/\s+/);
        const chunks: string[] = [];
        let currentChunk: string[] = [];
        let currentLength = 0;

        for (const word of words) {
          if (currentLength + word.length + 1 > MAX_TOKENS) {
            chunks.push(currentChunk.join(' '));
            currentChunk = [word];
            currentLength = word.length;
          } else {
            currentChunk.push(word);
            currentLength += word.length + 1;
          }
        }
        if (currentChunk.length > 0) {
          chunks.push(currentChunk.join(' '));
        }

        console.log(`Article ${article.article_number}: ${chunks.length} chunks`);

        // Get embeddings for each chunk
        const chunkEmbeddings = await Promise.all(
          chunks.map(chunk => embedder(chunk, {
            pooling: 'mean',
            normalize: true
          }))
        );

        // Average the embeddings
        const embeddingSize = chunkEmbeddings[0].data.length;
        const averagedEmbedding = new Array(embeddingSize).fill(0);
        
        for (const chunkEmbedding of chunkEmbeddings) {
          const embedding = Array.from(chunkEmbedding.data);
          for (let i = 0; i < embeddingSize; i++) {
            averagedEmbedding[i] += embedding[i] / chunkEmbeddings.length;
          }
        }
```

## Processing Queston
### OpenAI API Call to get initial answer
```typescript
async function getOpenAIAnswer(question, context) {
    const messages = [
        {
         role: "system",
         content: context 
           ? "You are a swiss legal expert. Answer the question with the help of the provided articles. Cite the specific articles you reference using their article numbers."
           : "You are a swiss legal expert. Provide a concise, factual answer to the legal question, using formal legal language."
        },
        {
            role: "user",
            content: context
                ? `Question: ${question}\n\nRelevant articles:\n${context}`
                : question
        }
    ];
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer sk-...`
        },
        body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages,
            max_tokens: 300
        })
    });
    if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
    }
    const data = await response.json();
    return data.choices[0].message.content;
}
```
## License

MIT
