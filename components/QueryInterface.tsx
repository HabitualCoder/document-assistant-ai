'use client';

/**
 * Query Interface Component
 * Handles user input for asking questions about documents with chat interface
 */

import { useState, useCallback, useEffect } from 'react';
import { validateQuery } from '@/lib/utils';
import { QueryResponse } from '@/lib/types';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: QueryResponse['sources'];
}

interface QueryInterfaceProps {
  onQuery: (question: string) => Promise<void>;
  isLoading: boolean;
  selectedDocuments: string[];
  totalDocuments: number;
  queryResponse: QueryResponse | null;
}

export default function QueryInterface({ 
  onQuery, 
  isLoading, 
  selectedDocuments, 
  totalDocuments,
  queryResponse
}: QueryInterfaceProps): JSX.Element {
  const [question, setQuestion] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Add assistant response when queryResponse changes
  useEffect(() => {
    if (queryResponse && queryResponse.queryId) {
      try {
        console.log('QueryInterface: Processing queryResponse:', queryResponse);
        
        // Check if we already have this response to prevent duplicates
        setChatMessages(prev => {
          const hasResponse = prev.some(msg => 
            msg.type === 'assistant' && msg.content === queryResponse.answer
          );
          
          if (hasResponse) {
            console.log('QueryInterface: Response already exists, skipping');
            return prev;
          }
          
          const assistantMessage: ChatMessage = {
            id: `assistant_${queryResponse.queryId}_${Date.now()}`,
            type: 'assistant',
            content: queryResponse.answer || 'No answer provided',
            timestamp: new Date(),
            sources: Array.isArray(queryResponse.sources) ? queryResponse.sources : []
          };
          
          return [...prev, assistantMessage];
        });
      } catch (error) {
        console.error('QueryInterface: Error processing queryResponse:', error);
        console.error('QueryInterface: queryResponse data:', queryResponse);
      }
    }
  }, [queryResponse?.queryId, queryResponse?.answer]);

  const handleSubmit = useCallback(async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    
    // Validate question
    const validation = validateQuery(question);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid query');
      return;
    }

    setError('');
    
    // Add user message to chat
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      type: 'user',
      content: question,
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    
    // Clear input immediately
    const currentQuestion = question;
    setQuestion('');
    
    // Process query
    await onQuery(currentQuestion);
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
      {/* Chat Messages */}
      {(chatMessages.length > 0 || isLoading) && (
        <div className="space-y-4 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-4 bg-gray-50">
          {chatMessages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-3xl px-4 py-2 rounded-lg ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-900 border border-gray-200'
                }`}
              >
                <div className="text-sm">{message.content}</div>
                {message.sources && message.sources.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <div className="text-xs text-gray-500 mb-1">Sources:</div>
                    {message.sources.slice(0, 2).map((source, index) => (
                      <div key={index} className="text-xs text-gray-600">
                        • {source?.documentName || 'Unknown Document'} {source?.relevanceScore ? `(Score: ${source.relevanceScore.toFixed(2)})` : ''}
                      </div>
                    ))}
                  </div>
                )}
                <div className="text-xs opacity-70 mt-1">
                  {message.timestamp ? message.timestamp.toLocaleTimeString() : 'Unknown time'}
                </div>
              </div>
            </div>
          ))}
          
          {/* Typing indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white text-gray-900 border border-gray-200 px-4 py-2 rounded-lg">
                <div className="flex items-center space-x-1">
                  <span className="text-sm">AI is thinking</span>
                  <div className="flex space-x-1">
                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

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
          {isLoading ? 'Thinking...' : 'Ask Question'}
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
