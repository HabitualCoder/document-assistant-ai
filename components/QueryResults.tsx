'use client';

/**
 * Query Results Component
 * Displays AI-generated answers with source citations
 */

import { QueryResponse } from '@/lib/types';
import { formatDate } from '@/lib/utils';

interface QueryResultsProps {
  response: QueryResponse;
}

export default function QueryResults({ response }: QueryResultsProps): JSX.Element {
  const { answer, sources, confidence, processingTime, queryId } = response;

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getConfidenceText = (confidence: number): string => {
    if (confidence >= 0.8) return 'High Confidence';
    if (confidence >= 0.6) return 'Medium Confidence';
    return 'Low Confidence';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Query Results</h2>
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(confidence)}`}>
            {getConfidenceText(confidence)}
          </div>
          <span>{processingTime}ms</span>
        </div>
      </div>

      {/* Answer */}
      <div className="space-y-3">
        <h3 className="text-lg font-medium text-gray-900">Answer</h3>
        <div className="prose prose-sm max-w-none">
          <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-500">
            <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
              {answer}
            </p>
          </div>
        </div>
      </div>

      {/* Sources */}
      {sources && sources.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-gray-900">
            Sources ({sources.length})
          </h3>
          <div className="space-y-3">
            {sources.map((source, index) => (
              <div
                key={`${source.documentId}-${source.chunkId}`}
                className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900">
                      {source.documentName}
                    </span>
                    <span className="text-xs text-gray-500">
                      (Source {index + 1})
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-xs text-gray-500">
                      {Math.round(source.relevanceScore * 100)}% relevant
                    </div>
                    {source.pageNumber && (
                      <div className="text-xs text-gray-500">
                        Page {source.pageNumber}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="text-sm text-gray-700 bg-gray-50 rounded p-3 border-l-2 border-blue-200">
                  <p className="leading-relaxed">
                    {source.content}
                  </p>
                </div>
                
                <div className="mt-2 text-xs text-gray-500">
                  Document ID: {source.documentId} • Chunk ID: {source.chunkId}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center space-x-4">
            <span>Query ID: {queryId}</span>
            <span>Confidence: {Math.round(confidence * 100)}%</span>
          </div>
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Processed in {processingTime}ms</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="flex items-center space-x-4">
          <button className="text-sm text-blue-600 hover:text-blue-500 font-medium">
            Copy Answer
          </button>
          <button className="text-sm text-blue-600 hover:text-blue-500 font-medium">
            Export Results
          </button>
        </div>
        <div className="text-sm text-gray-500">
          Generated by Google Gemini AI
        </div>
      </div>
    </div>
  );
}
