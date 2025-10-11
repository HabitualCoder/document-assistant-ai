/**
 * Unit tests for components
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import FileUpload from '../components/FileUpload'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import SuccessMessage from '../components/SuccessMessage'
import QueryInterface from '../components/QueryInterface'
import DocumentList from '../components/DocumentList'
import QueryResults from '../components/QueryResults'
import ErrorBoundary from '../components/ErrorBoundary'

// Mock the utils module
jest.mock('../lib/utils', () => ({
  validateFileType: jest.fn(() => true),
  validateFileSize: jest.fn(() => true),
  formatFileSize: jest.fn(() => '1.0 KB'),
  validateQuery: jest.fn(() => ({ isValid: true })),
}))

// Mock the types
jest.mock('../lib/types', () => ({
  DocumentType: ['pdf', 'txt', 'docx', 'md'],
  DocumentStatus: ['uploading', 'processing', 'processed', 'error'],
}))

describe('Components', () => {
  describe('FileUpload', () => {
    const mockOnFileUpload = jest.fn()

    beforeEach(() => {
      mockOnFileUpload.mockClear()
    })

    test('renders file upload interface', () => {
      render(<FileUpload onFileUpload={mockOnFileUpload} />)
      
      expect(screen.getByText('Upload your documents')).toBeInTheDocument()
      expect(screen.getByText('Drag and drop files here, or')).toBeInTheDocument()
      expect(screen.getByText('browse files')).toBeInTheDocument()
    })

    test('handles file selection', async () => {
      render(<FileUpload onFileUpload={mockOnFileUpload} />)
      
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
      const input = screen.getByRole('textbox', { hidden: true })
      
      fireEvent.change(input, { target: { files: [file] } })
      
      await waitFor(() => {
        expect(mockOnFileUpload).toHaveBeenCalledWith(file)
      })
    })

    test('shows upload tips', () => {
      render(<FileUpload onFileUpload={mockOnFileUpload} />)
      
      expect(screen.getByText('Upload Tips:')).toBeInTheDocument()
      expect(screen.getByText(/PDF files work best/)).toBeInTheDocument()
    })

    test('shows upload progress when uploading', () => {
      render(<FileUpload onFileUpload={mockOnFileUpload} isUploading={true} />)
      
      expect(screen.getByText('Uploading file...')).toBeInTheDocument()
    })

    test('does not show upload progress when not uploading', () => {
      render(<FileUpload onFileUpload={mockOnFileUpload} isUploading={false} />)
      
      expect(screen.queryByText('Uploading file...')).not.toBeInTheDocument()
    })
  })

  describe('LoadingSpinner', () => {
    test('renders with default size', () => {
      render(<LoadingSpinner />)
      
      const spinner = screen.getByRole('status', { hidden: true })
      expect(spinner).toBeInTheDocument()
    })

    test('renders with different sizes', () => {
      const { rerender } = render(<LoadingSpinner size="sm" />)
      expect(screen.getByRole('status', { hidden: true })).toHaveClass('w-4', 'h-4')
      
      rerender(<LoadingSpinner size="md" />)
      expect(screen.getByRole('status', { hidden: true })).toHaveClass('w-6', 'h-6')
      
      rerender(<LoadingSpinner size="lg" />)
      expect(screen.getByRole('status', { hidden: true })).toHaveClass('w-8', 'h-8')
    })
  })

  describe('ErrorMessage', () => {
    const mockOnClose = jest.fn()

    beforeEach(() => {
      mockOnClose.mockClear()
    })

    test('renders error message', () => {
      render(<ErrorMessage message="Test error message" onClose={mockOnClose} />)
      
      expect(screen.getByText('Error')).toBeInTheDocument()
      expect(screen.getByText('Test error message')).toBeInTheDocument()
    })

    test('calls onClose when dismiss button is clicked', () => {
      render(<ErrorMessage message="Test error message" onClose={mockOnClose} />)
      
      const dismissButton = screen.getByRole('button', { name: /dismiss/i })
      fireEvent.click(dismissButton)
      
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('SuccessMessage', () => {
    const mockOnClose = jest.fn()

    beforeEach(() => {
      mockOnClose.mockClear()
    })

    test('renders success message', () => {
      render(<SuccessMessage message="Test success message" onClose={mockOnClose} />)
      
      expect(screen.getByText('Success')).toBeInTheDocument()
      expect(screen.getByText('Test success message')).toBeInTheDocument()
    })

    test('calls onClose when dismiss button is clicked', () => {
      render(<SuccessMessage message="Test success message" onClose={mockOnClose} />)
      
      const dismissButton = screen.getByRole('button', { name: /dismiss/i })
      fireEvent.click(dismissButton)
      
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('QueryInterface', () => {
    const mockOnQuery = jest.fn()
    const mockQueryResponse = {
      answer: 'This is a test answer',
      sources: [
        {
          documentId: 'doc1',
          documentName: 'Test Document',
          chunkId: 'chunk1',
          content: 'Test content',
          relevanceScore: 0.9,
          startIndex: 0,
          endIndex: 10,
        }
      ],
      confidence: 0.95,
      processingTime: 1000,
      queryId: 'query123',
    }

    beforeEach(() => {
      mockOnQuery.mockClear()
    })

    test('renders query interface', () => {
      render(
        <QueryInterface
          onQuery={mockOnQuery}
          isLoading={false}
          selectedDocuments={[]}
          totalDocuments={0}
          queryResponse={null}
        />
      )
      
      expect(screen.getByText('Ask a question about your documents')).toBeInTheDocument()
      expect(screen.getByRole('textbox')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /ask question/i })).toBeInTheDocument()
    })

    test('shows example questions', () => {
      render(
        <QueryInterface
          onQuery={mockOnQuery}
          isLoading={false}
          selectedDocuments={[]}
          totalDocuments={0}
          queryResponse={null}
        />
      )
      
      expect(screen.getByText('Example Questions')).toBeInTheDocument()
      expect(screen.getByText('What is the main topic of this document?')).toBeInTheDocument()
    })

    test('handles query submission', async () => {
      render(
        <QueryInterface
          onQuery={mockOnQuery}
          isLoading={false}
          selectedDocuments={[]}
          totalDocuments={1}
          queryResponse={null}
        />
      )
      
      const textarea = screen.getByRole('textbox')
      const submitButton = screen.getByRole('button', { name: /ask question/i })
      
      fireEvent.change(textarea, { target: { value: 'What is this about?' } })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(mockOnQuery).toHaveBeenCalledWith('What is this about?')
      })
    })

    test('shows chat messages when query response is provided', () => {
      render(
        <QueryInterface
          onQuery={mockOnQuery}
          isLoading={false}
          selectedDocuments={[]}
          totalDocuments={1}
          queryResponse={mockQueryResponse}
        />
      )
      
      expect(screen.getByText('This is a test answer')).toBeInTheDocument()
    })

    test('shows typing indicator when loading', () => {
      render(
        <QueryInterface
          onQuery={mockOnQuery}
          isLoading={true}
          selectedDocuments={[]}
          totalDocuments={1}
          queryResponse={null}
        />
      )
      
      expect(screen.getByText('AI is thinking')).toBeInTheDocument()
    })
  })

  describe('ErrorBoundary', () => {
    const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
      if (shouldThrow) {
        throw new Error('Test error')
      }
      return <div>No error</div>
    }

    test('renders children when no error', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      )
      
      expect(screen.getByText('No error')).toBeInTheDocument()
    })

    test('renders error UI when error occurs', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )
      
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      expect(screen.getByText('Refresh Page')).toBeInTheDocument()
      
      consoleSpy.mockRestore()
    })
  })
})
