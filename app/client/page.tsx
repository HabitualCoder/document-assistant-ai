'use client';

/**
 * Client-side Document Assistant component
 * Main interface for the application
 */

import { useState, useCallback, useRef } from 'react';
import { Document, QueryResponse, UIState } from '@/lib/types';
import FileUpload from '@/components/FileUpload';
import DocumentList from '@/components/DocumentList';
import QueryInterface from '@/components/QueryInterface';
import QueryResults from '@/components/QueryResults';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';
import SuccessMessage from '@/components/SuccessMessage';

export default function DocumentAssistantClient(): JSX.Element {
  // State management
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [queryResponse, setQueryResponse] = useState<QueryResponse | null>(null);
  const [uiState, setUIState] = useState<UIState>({ isLoading: false });
  const [activeTab, setActiveTab] = useState<'upload' | 'query' | 'documents'>('upload');

  // Refs for scroll behavior
  const resultsRef = useRef<HTMLDivElement>(null);

  // File upload handler
  const handleFileUpload = useCallback(async (file: File): Promise<void> => {
    setUIState({ isLoading: true, error: undefined });

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        // Add document to list
        const newDocument: Document = {
          id: result.data.documentId,
          name: file.name,
          type: file.name.split('.').pop()?.toLowerCase() as any,
          size: file.size,
          uploadDate: new Date(),
          status: 'processing',
          metadata: {
            title: file.name.replace(/\.[^/.]+$/, ''),
            createdAt: new Date(file.lastModified),
          },
        };

        setDocuments(prev => [...prev, newDocument]);
        setUIState({ 
          isLoading: false, 
          success: 'File uploaded successfully! Processing...' 
        });
        
        // Switch to documents tab to show progress
        setActiveTab('documents');
      } else {
        throw new Error(result.error?.message || 'Upload failed');
      }
    } catch (error) {
      setUIState({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Upload failed' 
      });
    }
  }, []);

  // Query handler
  const handleQuery = useCallback(async (question: string): Promise<void> => {
    if (!question.trim()) return;

    setUIState({ isLoading: true, error: undefined });
    setQueryResponse(null);

    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: question.trim(),
          documentIds: selectedDocuments.length > 0 ? selectedDocuments : undefined,
          includeSources: true,
          maxResults: 5,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setQueryResponse(result.data);
        setUIState({ isLoading: false });
        
        // Scroll to results
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        throw new Error(result.error?.message || 'Query failed');
      }
    } catch (error) {
      setUIState({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Query failed' 
      });
    }
  }, [selectedDocuments]);

  // Document selection handler
  const handleDocumentSelect = useCallback((documentId: string, selected: boolean): void => {
    if (selected) {
      setSelectedDocuments(prev => [...prev, documentId]);
    } else {
      setSelectedDocuments(prev => prev.filter(id => id !== documentId));
    }
  }, []);

  // Clear messages handler
  const clearMessages = useCallback((): void => {
    setUIState(prev => ({ ...prev, error: undefined, success: undefined }));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">AI</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Intelligent Document Assistant
                </h1>
                <p className="text-sm text-gray-600">
                  Upload documents, ask questions, get AI answers
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                {documents.length} document{documents.length !== 1 ? 's' : ''}
              </div>
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { id: 'upload', label: 'Upload Documents', icon: '📁' },
              { id: 'documents', label: 'My Documents', icon: '📄' },
              { id: 'query', label: 'Ask Questions', icon: '❓' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Messages */}
        {uiState.error && (
          <ErrorMessage 
            message={uiState.error} 
            onClose={clearMessages}
          />
        )}
        {uiState.success && (
          <SuccessMessage 
            message={uiState.success} 
            onClose={clearMessages}
          />
        )}

        {/* Loading Overlay */}
        {uiState.isLoading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 flex items-center space-x-4">
              <LoadingSpinner size="md" />
              <span className="text-gray-700">
                {activeTab === 'upload' ? 'Uploading...' : 'Processing...'}
              </span>
            </div>
          </div>
        )}

        {/* Tab Content */}
        <div className="space-y-8">
          {activeTab === 'upload' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Upload Documents
              </h2>
              <FileUpload onFileUpload={handleFileUpload} />
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                My Documents
              </h2>
              <DocumentList
                documents={documents}
                selectedDocuments={selectedDocuments}
                onDocumentSelect={handleDocumentSelect}
              />
            </div>
          )}

          {activeTab === 'query' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                  Ask Questions
                </h2>
                <QueryInterface
                  onQuery={handleQuery}
                  isLoading={uiState.isLoading}
                  selectedDocuments={selectedDocuments}
                  totalDocuments={documents.length}
                />
              </div>

              {queryResponse && (
                <div ref={resultsRef}>
                  <QueryResults response={queryResponse} />
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-500 text-sm">
            <p>Built with Next.js, TypeScript, Tailwind CSS, and Google Gemini</p>
            <p className="mt-2">AI Engineer Portfolio Project</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
