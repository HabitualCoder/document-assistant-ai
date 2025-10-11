'use client';

/**
 * Client-side Document Assistant component
 * Main interface for the application
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Document, QueryResponse, UIState } from '@/lib/types';
import FileUpload from '@/components/FileUpload';
import DocumentList from '@/components/DocumentList';
import QueryInterface from '@/components/QueryInterface';
import QueryResults from '@/components/QueryResults';
import ErrorMessage from '@/components/ErrorMessage';
import SuccessMessage from '@/components/SuccessMessage';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function DocumentAssistantClient(): JSX.Element {
  // State management
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [queryResponse, setQueryResponse] = useState<QueryResponse | null>(null);
  const [uiState, setUIState] = useState<UIState>({ isLoading: false });
  const [activeTab, setActiveTab] = useState<'upload' | 'query' | 'documents'>('upload');
  
  // Refs
  const resultsRef = useRef<HTMLDivElement>(null);

  // Load documents on component mount
  useEffect(() => {
    loadDocuments();
  }, []);

  // Global error handler to prevent page reloads
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Global error caught:', event.error);
      event.preventDefault(); // Prevent default error handling
      setUIState(prev => ({
        ...prev,
        error: `Application error: ${event.error?.message || 'Unknown error'}`,
        isLoading: false
      }));
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      event.preventDefault(); // Prevent default error handling
      setUIState(prev => ({
        ...prev,
        error: `Promise rejection: ${event.reason?.message || 'Unknown error'}`,
        isLoading: false
      }));
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Load documents from API
  const loadDocuments = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch('/api/documents');
      const result = await response.json();
      
      if (result.success) {
        setDocuments(result.data);
      } else {
        console.error('Failed to load documents:', result.error);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  }, []);

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
        setUIState({
          isLoading: false,
          success: 'File uploaded successfully!'
        });

        // Reload documents to show the new one
        await loadDocuments();

        // Switch to documents tab to show progress
        setActiveTab('documents');

        // Start polling for status updates
        pollDocumentStatus(result.data.documentId);
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

  // Poll document status until processing is complete
  const pollDocumentStatus = useCallback(async (documentId: string): Promise<void> => {
    const maxAttempts = 30; // 30 attempts
    const interval = 2000; // 2 seconds between attempts
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, interval));
      
      try {
        await loadDocuments();
        
        // Check if document is processed
        const document = documents.find(doc => doc.id === documentId);
        if (document && document.status === 'processed') {
          setUIState(prev => ({
            ...prev,
            success: 'Document processed successfully! Ready for queries.'
          }));
          return;
        } else if (document && document.status === 'error') {
          setUIState(prev => ({
            ...prev,
            error: 'Document processing failed. Please try again.'
          }));
          return;
        }
      } catch (error) {
        console.error('Error polling document status:', error);
      }
    }
    
    // Timeout
    setUIState(prev => ({
      ...prev,
      error: 'Document processing is taking longer than expected. Please refresh the page.'
    }));
  }, [documents, loadDocuments]);

  // Query handler
  const handleQuery = useCallback(async (question: string): Promise<void> => {
    if (!question.trim()) return;

    try {
      setUIState({ isLoading: true, error: undefined });
      setQueryResponse(null);

      console.log('Client: Starting query with question:', question);
      console.log('Client: Selected documents:', selectedDocuments);

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

      console.log('Client: Response status:', response.status);

      const result = await response.json();
      console.log('Client: Response data:', result);

      if (result.success) {
        console.log('Client: Setting query response:', result.data);
        setQueryResponse(result.data);
        setUIState({ isLoading: false });
        
        // Scroll to results
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        console.error('Client: Query failed:', result.error);
        throw new Error(result.error?.message || 'Query failed');
      }
    } catch (error) {
      console.error('Client: Query error:', error);
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
    <ErrorBoundary>
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

        {/* Tab Content */}
        <div className="space-y-8 relative">
          {activeTab === 'upload' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Upload Documents
              </h2>
              <FileUpload onFileUpload={handleFileUpload} isUploading={uiState.isLoading} />
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
                  queryResponse={queryResponse}
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
    </ErrorBoundary>
  );
}
