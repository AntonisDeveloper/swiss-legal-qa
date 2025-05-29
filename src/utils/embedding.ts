// Force the web backend for transformers
if (typeof window !== 'undefined') {
  // @ts-ignore
  globalThis.process = { ...globalThis.process, env: {} }; // Prevents some Node.js checks
  // @ts-ignore
  globalThis.require = undefined;
}

import { pipeline } from '@xenova/transformers';

interface ArticleEmbedding {
  article_number: string;
  embedding: number[];
  text: string;
}

// Function to compute cosine similarity
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

// Initialize the embedder once and reuse it
let embedderPromise: Promise<any> | null = null;

async function getEmbedder() {
  if (!embedderPromise) {
    console.log('Initializing Sentence-BERT model...');
    embedderPromise = pipeline('feature-extraction', 'Xenova/paraphrase-MiniLM-L6-v2')
      .catch(error => {
        console.error('Error initializing embedder:', error);
        embedderPromise = null; // Reset on error
        throw error;
      });
  }
  return embedderPromise;
}

async function getOpenAIAnswer(question: string, context?: string): Promise<string> {
  const messages = [
    {
      role: "system",
      content: context 
        ? "You are a swiss legal expert. Answer the question based on the provided articles. Always cite the specific articles you reference using their article numbers. Be concise and factual."
        : "You are a swiss legal expert. Provide a concise, factual answer to the legal question. Focus on the key legal concepts and principles."
    },
    {
      role: "user",
      content: context 
        ? `Question: ${question}\n\nRelevant articles:\n${context}`
        : question
    }
  ];

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export async function processLegalQuestion(question: string) {
  try {
    // Get initial answer from OpenAI
    console.log('Getting initial answer from OpenAI...');
    const initialAnswer = await getOpenAIAnswer(question);
    if (!initialAnswer) {
      throw new Error('No answer received from OpenAI');
    }

    // Load article embeddings
    console.log('Loading article embeddings...');
    const response = await fetch('/article_embeddings.json');
    if (!response.ok) {
      throw new Error('Failed to load articles');
    }
    const embeddingsData = await response.json() as ArticleEmbedding[];

    // Get the embedder
    const embedder = await getEmbedder();

    // Create embeddings for question and answer
    console.log('Creating embeddings for question and answer...');
    const questionEmbedding = await embedder(question, {
      pooling: 'mean',
      normalize: true
    });
    const answerEmbedding = await embedder(initialAnswer, {
      pooling: 'mean',
      normalize: true
    });


    // Calculate similarities and filter out empty texts
    console.log('Finding similar articles...');
    const similarities = embeddingsData
      .filter(article => article.text && article.text.trim().length > 0)
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
    console.log('\nGetting final answer with article context...');
    const finalAnswer = await getOpenAIAnswer(question, articlesContext);

    return {
      question,
      initialAnswer,
      finalAnswer,
      topArticles
    };
  } catch (error) {
    console.error('Error in processLegalQuestion:', error);
    throw error;
  }
} 