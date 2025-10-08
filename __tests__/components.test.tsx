/**
 * Unit tests for components
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import FileUpload from '../components/FileUpload'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import SuccessMessage from '../components/SuccessMessage'

// Mock the utils module
jest.mock('../lib/utils', () => ({
  validateFileType: jest.fn(() => true),
  validateFileSize: jest.fn(() => true),
  formatFileSize: jest.fn(() => '1.0 KB'),
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
})
