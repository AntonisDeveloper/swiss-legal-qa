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

    // Debug logging
    console.log('Question embedding type:', typeof questionEmbedding.data);
    console.log('Answer embedding type:', typeof answerEmbedding.data);
    console.log('Question embedding data:', questionEmbedding.data);
    console.log('Answer embedding data:', answerEmbedding.data);

    // Ensure we have arrays for the embeddings and convert to numbers
    let questionEmbeddingArray: number[];
    let answerEmbeddingArray: number[];

    try {
      // Handle different possible data structures
      if (questionEmbedding.data instanceof Float32Array) {
        questionEmbeddingArray = Array.from(questionEmbedding.data);
      } else if (Array.isArray(questionEmbedding.data)) {
        questionEmbeddingArray = questionEmbedding.data.map((x: unknown) => Number(x));
      } else if (typeof questionEmbedding.data === 'object') {
        questionEmbeddingArray = Object.values(questionEmbedding.data).map((x: unknown) => Number(x));
      } else {
        throw new Error('Unexpected embedding data structure');
      }

      if (answerEmbedding.data instanceof Float32Array) {
        answerEmbeddingArray = Array.from(answerEmbedding.data);
      } else if (Array.isArray(answerEmbedding.data)) {
        answerEmbeddingArray = answerEmbedding.data.map((x: unknown) => Number(x));
      } else if (typeof answerEmbedding.data === 'object') {
        answerEmbeddingArray = Object.values(answerEmbedding.data).map((x: unknown) => Number(x));
      } else {
        throw new Error('Unexpected embedding data structure');
      }

      // Validate arrays
      if (!Array.isArray(questionEmbeddingArray) || !Array.isArray(answerEmbeddingArray)) {
        throw new Error('Failed to convert embeddings to arrays');
      }

      if (questionEmbeddingArray.length === 0 || answerEmbeddingArray.length === 0) {
        throw new Error('Empty embedding arrays');
      }

      console.log('Processed embedding arrays:', {
        questionLength: questionEmbeddingArray.length,
        answerLength: answerEmbeddingArray.length
      });

    } catch (error) {
      console.error('Error processing embeddings:', error);
      throw new Error('Failed to process embeddings: ' + (error as Error).message);
    }

    // Calculate similarities and filter out empty texts
    console.log('Finding similar articles...');
    const similarities = embeddingsData
      .filter(article => article.text && article.text.trim().length > 0)
      .map(article => {
        try {
          return {
            article_number: article.article_number,
            similarity: cosineSimilarity(answerEmbeddingArray, article.embedding),
            text: article.text
          };
        } catch (error) {
          console.error('Error calculating similarity for article:', article.article_number, error);
          return null;
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

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
