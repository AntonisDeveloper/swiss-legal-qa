'use client';

import { useState, useEffect } from 'react';
import { processLegalQuestion } from '@/utils/embedding';

export default function LegalQAClient() {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    question: string;
    initialAnswer: string;
    finalAnswer: string;
    topArticles: Array<{
      article_number: string;
      similarity: number;
      text: string;
    }>;
  } | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const response = await processLegalQuestion(question);
      setResult(response);
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while processing your question. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isClient) {
    return (
      <div className="min-h-screen p-8 max-w-4xl mx-auto">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading application...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-center">Swiss Legal Q&A</h1>
      <p className="text-center mb-8">
        <a
          href="https://github.com/AntonisDeveloper/swiss-legal-qa/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Code Database
        </a>
      </p>
      
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex flex-col gap-4">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask your legal question here..."
            className="w-full p-4 border rounded-lg min-h-[100px]"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:bg-blue-300"
          >
            {loading ? 'Processing...' : 'Ask Question'}
          </button>
        </div>
      </form>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-8" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading model and processing your question...</p>
        </div>
      )}

      {result && !loading && (
        <div className="space-y-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Initial Answer</h2>
            <p className="whitespace-pre-wrap">{result.initialAnswer}</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Final Answer</h2>
            <p className="whitespace-pre-wrap">{result.finalAnswer}</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Relevant Articles</h2>
            <div className="space-y-4">
              {result.topArticles.map((article, index) => (
                <div key={index} className="border-b pb-4 last:border-b-0">
                  <h3 className="font-medium">Article {article.article_number}</h3>
                  <p className="text-sm text-gray-600">Similarity: {article.similarity.toFixed(4)}</p>
                  <p className="mt-2">{article.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
} 
