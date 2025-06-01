# Swiss Legal QA App

**Demo:** [Swiss Legal Q&A](https://swiss-legal-qa.vercel.app/)

This project demonstrates how combining classical information retrieval with large language models (LLMs) can enhance legal question answering. Built as a minimum viable product (MVP) in about 20 hours, it showcases the power of hybrid AI approaches in the legal domain.

---

## Overview

The app leverages both LLMs and traditional retrieval methods to answer legal questions using Swiss law, specifically the ZGB (Swiss Civil Code) and OR (Code of Obligations).

**How it works:**
1. **Initial Answer:** The system first uses GPT-3.5-turbo to generate a legal-style answer to the user's question, instructing the model to cite relevant articles it already knows.
2. **Article Retrieval:** The answer is embedded, and the system retrieves the 20 most relevant legal articles using cosine similarity in the embedding space.
3. **Contextual Answer:** The original question, along with these top articles, is sent to GPT-3.5-turbo again to generate a more informed, context-aware answer.

**Evaluation:**  
We tested the system on a subset (131 questions) of the [LEXam Benchmark](https://huggingface.co/datasets/LEXam-Benchmark/LEXam) [1] for Swiss law courses. We used two metrics:
- **LLM-based scoring:** GPT-3.5-turbo is asked to grade the initial and final answers (from 1 to 10) compared to the correct answer.
- **Cosine similarity:** We compute the similarity between the initial/final answer and the correct answer in the text embedding space.

[**Results:**](/results.csv)
- **Average initial answer score:** 6.55
- **Average final answer score:** 6.86
- **Average initial answer similarity:** 0.7598
- **Average final answer similarity:** 0.7664



Even with state-of-the-art LLMs, classical retrieval adds value, showing the potential for legal AI agents.

---

## Pipeline

### Pre-processing

1. **Source:**  
   Legal texts are sourced from the official [Swiss Federal Law Database](https://www.fedlex.admin.ch/eli/cc/24/233_245_233/de).  
   - ZGB: Translated to English using [Helsinki-NLP/opus-mt-de-en](https://huggingface.co/Helsinki-NLP/opus-mt-de-en).
   - OR: Used the official English translation.
   - Additional data: [HuggingFace Code of Obligations dataset](https://huggingface.co/datasets/brunnolou/swiss-code-of-obligations).

2. **Data Extraction:**  
   Articles are parsed and structured into CSV format using a mix of manual and LLM-based methods.

3. **Embedding Generation:**  
   Each article is embedded using `Xenova/paraphrase-MiniLM-L6-v2` (384 dimensions).

**Visualization:**  
Below is a 2D PCA plot of the article embeddings (OR in blue, ZGB in orange):

<p align="center">
  <img src="PCA_2dim_visualization.png" height="500">
</p>

---

### Runtime Flow

1. **User Input:**  
   The user submits a legal question.

2. **Initial LLM Response:**  
   The question is sent to OpenAI's API for a first answer.

3. **Embedding:**  
   The answer is embedded using `Xenova/paraphrase-MiniLM-L6-v2`.

4. **Similarity Search:**  
   Cosine similarity is computed between the answer embedding and all article embeddings.

5. **Top-20 Retrieval:**  
   The 20 most relevant articles are selected.

6. **Final LLM Query:**  
   The question and the retrieved articles are sent to OpenAI again for a final, context-rich answer.

7. **Output:**  
   - The legal answer, with citations.
   - The top-20 articles and their similarity scores.

---

## Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key

---

## Example

**Question:**  
*An elderly woman with dementia gifts CHF 100,000 to her new caregiver. Can her children challenge the gift after her death?*

**Initial GPT Answer:**  
> Under Swiss law, gifts made by individuals suffering from dementia may be challenged by their heirs if it can be proven that the donor lacked the necessary mental capacity to comprehend the consequences of the gift at the time it was made. The burden of proof lies with the heirs to demonstrate that the donor was not capable of understanding the nature and consequences of the gift. If the court determines that the donor lacked capacity at the time of the gift, it may be declared null and void, and the amount may be reclaimed for the estate to be distributed among the heirs according to the law of succession.

**Final Answer (with article retrieval):**  
> In the scenario provided, where an elderly woman with dementia gifts CHF 100,000 to her new caregiver, her children may challenge the gift after her death under certain circumstances. According to Swiss law, a gift can be revoked under specific conditions as outlined in Articles OR Art. 249 and OR Art. 251. These include instances where the recipient has committed a serious criminal offense against the donor, grossly neglected duties under family law towards the donor, or failed to fulfill the provisos attached to the gift.
>
> Additionally, the heirs of the donor may have the right to challenge the gift if the recipient has wilfully and unlawfully caused the donor's death or prevented the donor from exercising their right of revocation (Article OR Art. 251). The heirs would need to act within the time frame specified in the law to exercise their right of challenge or revocation of the gift.
>
> Furthermore, if the gift was given within the last five years before the donor's death, and it is found that the gift was made to circumvent the payment of credit or to reduce the inheritance benefits, the heirs may have grounds to challenge the gift under Article ZGB Art. 494.
>
> In conclusion, in the case of an elderly woman with dementia gifting a substantial amount to her caregiver, her children may challenge the gift after her death based on the specific legal grounds outlined above.

---

## Future Improvements

1. **Granular Article Retrieval:**  
   First, determine whether the question pertains to ZGB, OR, or both, and restrict similarity search to relevant articles.

2. **Expand Legal Corpora:**  
   Incorporate the Federal Constitution, Federal Laws, Ordinances, Cantonal laws, and more.

3. **Court Decisions:**  
   Integrate Swiss court rulings for more grounded, practical answers.

4. **Multilingual Support:**  
   Work with the original German, French, and Italian legal texts. Translate user questions as needed and combine results across languages.

---

## Preprocessing vs. Runtime Tradeoff

- For **fast, interactive apps** (like legal Q&A), it's best to preprocess and translate the legal corpus to English, then do retrieval and reasoning in English.
- For **deep legal analysis**, work with the original language texts to preserve legal nuance.

---

# Main code

## Preprocessing
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

## Runtime Backend
### OpenAI API Call to get initial answer
```typescript
async function getOpenAIAnswer(question, context) {
    const messages = [
        {
         role: "system",
         content: context 
        ? "You are a swiss legal expert. Answer the question with the help of the provided articles and others you know. Cite the specific articles you reference using their article numbers."
        : "You are a swiss legal expert. Answer the question with the help of articles you know. Cite the specific articles you reference using their article numbers."
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
### Cosine Similarity
```typescript
function cosineSimilarity(vecA, vecB) {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (magnitudeA * magnitudeB);
}
```

### Main Processing part
```typescript
async function processLegalQuestion(question) {
    // Load text embedder 
    const embedder = await (0, transformers_1.pipeline)('feature-extraction', 'Xenova/paraphrase-MiniLM-L6-v2');
    // Get initial answer from OpenAI
    const initialAnswer = await getOpenAIAnswer(question);

    // Load article embeddings
    console.log('Loading article embeddings...');
    const embeddingsData = JSON.parse(fs.readFileSync('article_embeddings.json', 'utf-8'));

    // Create embeddings for initial answer
    const answerEmbedding = await embedder(initialAnswer, {
        pooling: 'mean',
        normalize: true
    });

    // Calculate cosine similarities
    const similarities = embeddingsData
        .map(article => ({
        article_number: article.article_number,
        similarity: cosineSimilarity(answerEmbedding, article.embedding),
        text: article.text
    }));
    // Sort by similarity and get top 20
    const topArticles = similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 20);

    // Concatenate articles with their numbers
    const articlesContext = topArticles
        .map(article => `Article ${article.article_number}:\n${article.text}`)
        .join('\n\n');

    // Get final answer using the articles as context
    const finalAnswer = await getOpenAIAnswer(question, articlesContext);
    console.log('\nFinal Answer:', finalAnswer);
    return {
        question,
        initialAnswer,
        finalAnswer,
        topArticles
    };
}
```

## References

[1] Yu Fan, Jingwei Ni, Jakob Merane, Etienne Salimbeni, Yang Tian, Yoan Hermstrüwer, Yinya Huang, Mubashara Akhtar, Florian Geering, Oliver Dreyer, et al.  
"LEXam: Benchmarking Legal Reasoning on 340 Law Exams."  
arXiv preprint arXiv:2505.12864, 2025.  
[https://arxiv.org/abs/2505.12864](https://arxiv.org/abs/2505.12864)


## License

MIT
