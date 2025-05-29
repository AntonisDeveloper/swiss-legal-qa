import { pipeline } from '@xenova/transformers';

interface ArticleEmbedding {
  article_number: string;
  text: string;
}

// Simple text similarity function using word overlap
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\W+/));
  const words2 = new Set(text2.toLowerCase().split(/\W+/));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

export async function processLegalQuestion(question: string) {
  try {
    // Get initial answer from OpenAI
    console.log('Getting initial answer from OpenAI...');
    const initialAnswer = await getOpenAIAnswer(question);
    if (!initialAnswer) {
      throw new Error('No answer received from OpenAI');
    }

    // Load article data
    console.log('Loading articles...');
    const response = await fetch('/article_embeddings.json');
    if (!response.ok) {
      throw new Error('Failed to load articles');
    }
    const articlesData = await response.json() as ArticleEmbedding[];

    // Calculate similarities using word overlap
    console.log('Finding similar articles...');
    const similarities = articlesData
      .filter(article => article.text && article.text.trim().length > 0)
      .map(article => ({
        article_number: article.article_number,
        similarity: calculateSimilarity(question + ' ' + initialAnswer, article.text),
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