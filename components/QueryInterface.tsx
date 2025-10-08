'use client';

/**
 * Query Interface Component
 * Handles user input for asking questions about documents
 */

import { useState, useCallback } from 'react';
import { validateQuery } from '@/lib/utils';

interface QueryInterfaceProps {
  onQuery: (question: string) => Promise<void>;
  isLoading: boolean;
  selectedDocuments: string[];
  totalDocuments: number;
}

export default function QueryInterface({ 
  onQuery, 
  isLoading, 
  selectedDocuments, 
  totalDocuments 
}: QueryInterfaceProps): JSX.Element {
  const [question, setQuestion] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleSubmit = useCallback(async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    
    // Validate question
    const validation = validateQuery(question);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid query');
      return;
    }

    setError('');
    await onQuery(question);
    setQuestion(''); // Clear input after successful query
  }, [question, onQuery]);

  const handleQuestionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    setQuestion(e.target.value);
    if (error) setError(''); // Clear error when user starts typing
  }, [error]);

  const handleExampleClick = useCallback((example: string): void => {
    setQuestion(example);
    setError('');
  }, []);

  const examples = [
    "What is the main topic of this document?",
    "Summarize the key points",
    "What are the important dates mentioned?",
    "Explain the methodology used",
    "What are the conclusions?",
  ];

  return (
    <div className="space-y-6">
      {/* Query Input */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="question" className="block text-sm font-medium text-gray-700 mb-2">
            Ask a question about your documents
          </label>
          <textarea
            id="question"
            value={question}
            onChange={handleQuestionChange}
            placeholder="What would you like to know about your documents?"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={4}
            disabled={isLoading}
            maxLength={1000}
          />
          <div className="flex justify-between items-center mt-2">
            <div className="text-sm text-gray-500">
              {question.length}/1000 characters
            </div>
            {error && (
              <div className="text-sm text-red-600">{error}</div>
            )}
          </div>
        </div>

        {/* Document Selection Info */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Query Scope</h4>
              <p className="text-sm text-gray-600">
                {selectedDocuments.length > 0 
                  ? `Searching in ${selectedDocuments.length} selected document${selectedDocuments.length !== 1 ? 's' : ''}`
                  : `Searching in all ${totalDocuments} document${totalDocuments !== 1 ? 's' : ''}`
                }
              </p>
            </div>
            <div className="text-sm text-gray-500">
              {totalDocuments > 0 ? 'Ready to search' : 'Upload documents first'}
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || !question.trim() || totalDocuments === 0}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Processing...</span>
            </div>
          ) : (
            'Ask Question'
          )}
        </button>
      </form>

      {/* Example Questions */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-900">Example Questions</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {examples.map((example, index) => (
            <button
              key={index}
              onClick={() => handleExampleClick(example)}
              disabled={isLoading}
              className="text-left p-3 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-800 mb-2">Query Tips:</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Be specific and clear in your questions</li>
          <li>• Ask about concepts, facts, or relationships</li>
          <li>• Use keywords from your documents</li>
          <li>• Try different phrasings if you don't get good results</li>
        </ul>
      </div>
    </div>
  );
}
