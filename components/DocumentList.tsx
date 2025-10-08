'use client';

/**
 * Document List Component
 * Displays uploaded documents with selection and management options
 */

import { useState } from 'react';
import { Document, DocumentStatus } from '@/lib/types';
import { formatFileSize, formatDate, getDocumentTypeIcon, getDocumentTypeColor, getStatusColor, getStatusIcon } from '@/lib/utils';

interface DocumentListProps {
  documents: Document[];
  selectedDocuments: string[];
  onDocumentSelect: (documentId: string, selected: boolean) => void;
}

export default function DocumentList({ 
  documents, 
  selectedDocuments, 
  onDocumentSelect 
}: DocumentListProps): JSX.Element {
  const [filter, setFilter] = useState<'all' | DocumentStatus>('all');

  const filteredDocuments = documents.filter(doc => 
    filter === 'all' || doc.status === filter
  );

  const handleSelectAll = (): void => {
    const allSelected = filteredDocuments.every(doc => 
      selectedDocuments.includes(doc.id)
    );
    
    filteredDocuments.forEach(doc => {
      onDocumentSelect(doc.id, !allSelected);
    });
  };

  const handleDocumentClick = (documentId: string): void => {
    const isSelected = selectedDocuments.includes(documentId);
    onDocumentSelect(documentId, !isSelected);
  };

  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No documents uploaded yet
        </h3>
        <p className="text-gray-600">
          Upload your first document to get started with AI-powered question answering.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters and Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Filter:</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Documents</option>
              <option value="uploading">Uploading</option>
              <option value="processing">Processing</option>
              <option value="processed">Processed</option>
              <option value="error">Error</option>
            </select>
          </div>
          
          {filteredDocuments.length > 0 && (
            <button
              onClick={handleSelectAll}
              className="text-sm text-blue-600 hover:text-blue-500 font-medium"
            >
              {filteredDocuments.every(doc => selectedDocuments.includes(doc.id))
                ? 'Deselect All'
                : 'Select All'
              }
            </button>
          )}
        </div>

        <div className="text-sm text-gray-500">
          {selectedDocuments.length} of {filteredDocuments.length} selected
        </div>
      </div>

      {/* Document Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocuments.map((document) => {
          const isSelected = selectedDocuments.includes(document.id);
          
          return (
            <div
              key={document.id}
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
              }`}
              onClick={() => handleDocumentClick(document.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getDocumentTypeColor(document.type)}`}>
                    <span className="text-sm">{getDocumentTypeIcon(document.type)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {document.name}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(document.size)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(document.status)}`}>
                    <span className="mr-1">{getStatusIcon(document.status)}</span>
                    {document.status}
                  </div>
                  
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                    isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                  }`}>
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Uploaded: {formatDate(document.uploadDate)}</span>
                  {document.processedDate && (
                    <span>Processed: {formatDate(document.processedDate)}</span>
                  )}
                </div>
                
                {document.metadata?.wordCount && (
                  <div className="text-xs text-gray-500">
                    {document.metadata.wordCount.toLocaleString()} words
                  </div>
                )}
                
                {document.chunks && document.chunks.length > 0 && (
                  <div className="text-xs text-gray-500">
                    {document.chunks.length} chunks created
                  </div>
                )}
              </div>

              {/* Progress Bar for Processing */}
              {document.status === 'processing' && (
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Processing document...</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State for Filtered Results */}
      {filteredDocuments.length === 0 && documents.length > 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">
            No documents found with status "{filter}"
          </p>
        </div>
      )}
    </div>
  );
}
