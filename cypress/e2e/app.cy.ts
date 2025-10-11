/**
 * Cypress E2E tests for the Intelligent Document Assistant
 */

describe('Intelligent Document Assistant', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  describe('Navigation', () => {
    it('should display all navigation tabs', () => {
      cy.contains('Upload Documents').should('be.visible')
      cy.contains('My Documents').should('be.visible')
      cy.contains('Ask Questions').should('be.visible')
    })

    it('should switch between tabs', () => {
      cy.contains('My Documents').click()
      cy.url().should('include', '#')
      
      cy.contains('Ask Questions').click()
      cy.url().should('include', '#')
      
      cy.contains('Upload Documents').click()
      cy.url().should('include', '#')
    })
  })

  describe('File Upload', () => {
    it('should display upload interface', () => {
      cy.contains('Upload your documents').should('be.visible')
      cy.contains('Drag and drop files here').should('be.visible')
      cy.contains('browse files').should('be.visible')
    })

    it('should show upload tips', () => {
      cy.contains('Upload Tips:').should('be.visible')
      cy.contains('PDF files work best').should('be.visible')
    })

    it('should handle file selection', () => {
      // Create a test file
      const fileName = 'test-document.txt'
      const fileContent = 'This is a test document content.'
      
      cy.get('input[type="file"]').selectFile({
        contents: Cypress.Buffer.from(fileContent),
        fileName: fileName,
        mimeType: 'text/plain'
      }, { force: true })
      
      // The file should be selected (this would trigger upload in real scenario)
      cy.get('input[type="file"]').should('have.value', `C:\\fakepath\\${fileName}`)
    })

    it('should show upload progress indicator', () => {
      // Mock a slow upload response
      cy.intercept('POST', '/api/upload', {
        delay: 2000,
        statusCode: 200,
        body: { success: true }
      }).as('slowUpload')

      const fileName = 'test-document.txt'
      const fileContent = 'This is a test document content.'
      
      cy.get('input[type="file"]').selectFile({
        contents: Cypress.Buffer.from(fileContent),
        fileName: fileName,
        mimeType: 'text/plain'
      }, { force: true })

      // Should show upload progress
      cy.contains('Uploading file...').should('be.visible')
    })
  })

  describe('Document Management', () => {
    it('should show empty state when no documents', () => {
      cy.contains('My Documents').click()
      cy.contains('No documents uploaded yet').should('be.visible')
      cy.contains('Upload your first document').should('be.visible')
    })

    it('should display document filters', () => {
      cy.contains('My Documents').click()
      cy.get('select').should('contain', 'All Documents')
      cy.get('select').should('contain', 'Uploading')
      cy.get('select').should('contain', 'Processing')
      cy.get('select').should('contain', 'Processed')
      cy.get('select').should('contain', 'Error')
    })
  })

  describe('Query Interface', () => {
    it('should display query interface', () => {
      cy.contains('Ask Questions').click()
      cy.get('textarea').should('be.visible')
      cy.contains('Ask a question about your documents').should('be.visible')
    })

    it('should show example questions', () => {
      cy.contains('Ask Questions').click()
      cy.contains('Example Questions').should('be.visible')
      cy.contains('What is the main topic of this document?').should('be.visible')
    })

    it('should show query tips', () => {
      cy.contains('Ask Questions').click()
      cy.contains('Query Tips:').should('be.visible')
      cy.contains('Be specific and clear').should('be.visible')
    })

    it('should handle query input', () => {
      cy.contains('Ask Questions').click()
      
      const testQuery = 'What is this document about?'
      cy.get('textarea').type(testQuery)
      cy.get('textarea').should('have.value', testQuery)
    })

    it('should show character count', () => {
      cy.contains('Ask Questions').click()
      
      cy.get('textarea').type('Test query')
      cy.contains('/1000 characters').should('be.visible')
    })

    it('should show typing indicator when processing query', () => {
      // Mock a slow query response
      cy.intercept('POST', '/api/query', {
        delay: 2000,
        statusCode: 200,
        body: {
          success: true,
          data: {
            answer: 'This is a test answer',
            sources: [],
            confidence: 0.95,
            processingTime: 2000,
            queryId: 'test-query-123'
          }
        }
      }).as('slowQuery')

      cy.contains('Ask Questions').click()
      
      cy.get('textarea').type('What is this about?')
      cy.get('button[type="submit"]').click()

      // Should show typing indicator
      cy.contains('AI is thinking').should('be.visible')
    })

    it('should display chat messages after query', () => {
      // Mock successful query response
      cy.intercept('POST', '/api/query', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            answer: 'This is a comprehensive answer about the document.',
            sources: [
              {
                documentId: 'doc1',
                documentName: 'Test Document.pdf',
                chunkId: 'chunk1',
                content: 'Source content',
                relevanceScore: 0.95,
                startIndex: 0,
                endIndex: 20
              }
            ],
            confidence: 0.92,
            processingTime: 1500,
            queryId: 'test-query-123'
          }
        }
      }).as('queryResponse')

      cy.contains('Ask Questions').click()
      
      cy.get('textarea').type('What is this about?')
      cy.get('button[type="submit"]').click()

      cy.wait('@queryResponse')

      // Should show the answer in chat
      cy.contains('This is a comprehensive answer about the document.').should('be.visible')
      cy.contains('Sources').should('be.visible')
      cy.contains('Test Document.pdf').should('be.visible')
    })
  })

  describe('Responsive Design', () => {
    it('should be responsive on mobile', () => {
      cy.viewport('iphone-x')
      cy.contains('Intelligent Document Assistant').should('be.visible')
      cy.contains('Upload Documents').should('be.visible')
    })

    it('should be responsive on tablet', () => {
      cy.viewport('ipad-2')
      cy.contains('Intelligent Document Assistant').should('be.visible')
      cy.contains('Upload Documents').should('be.visible')
    })

    it('should be responsive on desktop', () => {
      cy.viewport(1280, 720)
      cy.contains('Intelligent Document Assistant').should('be.visible')
      cy.contains('Upload Documents').should('be.visible')
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid file types gracefully', () => {
      // Mock API error response
      cy.intercept('POST', '/api/upload', {
        statusCode: 400,
        body: {
          success: false,
          error: {
            code: 'INVALID_FILE_TYPE',
            message: 'File type not supported'
          }
        }
      }).as('uploadError')

      cy.contains('Upload Documents').click()
      
      // Upload an invalid file type
      cy.get('input[type="file"]').selectFile({
        contents: Cypress.Buffer.from('test content'),
        fileName: 'test.jpg',
        mimeType: 'image/jpeg'
      }, { force: true })

      // Should show error message
      cy.contains('File type not supported').should('be.visible')
    })

    it('should handle query errors gracefully', () => {
      // Mock query error response
      cy.intercept('POST', '/api/query', {
        statusCode: 500,
        body: {
          success: false,
          error: {
            code: 'QUERY_ERROR',
            message: 'Failed to process query'
          }
        }
      }).as('queryError')

      cy.contains('Ask Questions').click()
      
      cy.get('textarea').type('What is this about?')
      cy.get('button[type="submit"]').click()

      cy.wait('@queryError')

      // Should show error message
      cy.contains('Failed to process query').should('be.visible')
    })

    it('should handle network errors gracefully', () => {
      // Mock network error
      cy.intercept('POST', '/api/upload', {
        forceNetworkError: true
      }).as('networkError')

      cy.contains('Upload Documents').click()
      
      cy.get('input[type="file"]').selectFile({
        contents: Cypress.Buffer.from('test content'),
        fileName: 'test.txt',
        mimeType: 'text/plain'
      }, { force: true })

      // Should show network error message
      cy.contains('Network error').should('be.visible')
    })

    it('should prevent page reload on JavaScript errors', () => {
      // Inject a JavaScript error
      cy.window().then((win) => {
        win.addEventListener('error', (e) => {
          e.preventDefault()
        })
        
        // Trigger an error
        win.eval('throw new Error("Test error")')
      })

      // Page should not reload
      cy.url().should('not.include', 'about:blank')
      cy.contains('Intelligent Document Assistant').should('be.visible')
    })
  })

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      cy.get('h1').should('contain', 'Intelligent Document Assistant')
      cy.get('h2').should('have.length.at.least', 1)
    })

    it('should have proper form labels', () => {
      cy.contains('Ask Questions').click()
      cy.get('textarea').should('have.attr', 'id', 'question')
      cy.get('label[for="question"]').should('exist')
    })

    it('should have proper button labels', () => {
      cy.contains('Ask Questions').click()
      cy.get('button[type="submit"]').should('contain', 'Ask Question')
    })

    it('should be keyboard navigable', () => {
      cy.get('body').tab()
      cy.focused().should('exist')
    })
  })

  describe('Performance', () => {
    it('should load within acceptable time', () => {
      const startTime = Date.now()
      cy.visit('/')
      cy.contains('Intelligent Document Assistant').should('be.visible')
      
      cy.then(() => {
        const loadTime = Date.now() - startTime
        expect(loadTime).to.be.lessThan(3000) // 3 seconds
      })
    })

    it('should have proper loading states for uploads', () => {
      // Mock a slow API response
      cy.intercept('POST', '/api/upload', {
        delay: 2000,
        statusCode: 200,
        body: { success: true }
      }).as('slowUpload')

      cy.contains('Upload Documents').click()
      
      // Upload a file
      cy.get('input[type="file"]').selectFile({
        contents: Cypress.Buffer.from('test content'),
        fileName: 'test.txt',
        mimeType: 'text/plain'
      }, { force: true })

      // Should show loading state
      cy.contains('Uploading file...').should('be.visible')
    })

    it('should have proper loading states for queries', () => {
      // Mock a slow query response
      cy.intercept('POST', '/api/query', {
        delay: 2000,
        statusCode: 200,
        body: {
          success: true,
          data: {
            answer: 'Test answer',
            sources: [],
            confidence: 0.95,
            processingTime: 2000,
            queryId: 'test-query'
          }
        }
      }).as('slowQuery')

      cy.contains('Ask Questions').click()
      
      cy.get('textarea').type('What is this about?')
      cy.get('button[type="submit"]').click()

      // Should show loading state
      cy.contains('AI is thinking').should('be.visible')
    })

    it('should handle large files efficiently', () => {
      // Create a larger file
      const largeContent = 'x'.repeat(100000) // 100KB
      
      cy.intercept('POST', '/api/upload', {
        delay: 1000,
        statusCode: 200,
        body: { success: true }
      }).as('largeFileUpload')

      cy.contains('Upload Documents').click()
      
      cy.get('input[type="file"]').selectFile({
        contents: Cypress.Buffer.from(largeContent),
        fileName: 'large-file.txt',
        mimeType: 'text/plain'
      }, { force: true })

      // Should handle large file upload
      cy.contains('Uploading file...').should('be.visible')
    })
  })
})
