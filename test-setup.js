/**
 * Test script to verify database and AI services are working
 */

import { db } from './lib/database';
import { aiService } from './lib/ai-services';

async function testDatabase() {
  console.log('🧪 Testing Database...');
  
  try {
    // Test database health
    const health = await db.healthCheck();
    console.log('✅ Database health:', health);
    
    // Test getting documents
    const documents = await db.getAllDocuments();
    console.log('✅ Documents count:', documents.length);
    
    // Test creating a test document
    const testDoc = await db.createDocument({
      id: 'test-doc-123',
      name: 'test.txt',
      type: 'txt',
      size: 100,
      content: 'This is a test document for RAG processing.',
      metadata: { test: true }
    });
    
    console.log('✅ Test document created:', testDoc.id);
    
    // Test updating status
    await db.updateDocumentStatus(testDoc.id, 'processed');
    console.log('✅ Document status updated');
    
    // Clean up test document
    await db.deleteDocument(testDoc.id);
    console.log('✅ Test document deleted');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
  }
}

async function testAIService() {
  console.log('🧪 Testing AI Service...');
  
  try {
    // Test AI service health
    const health = await aiService.healthCheck();
    console.log('✅ AI service health:', health);
    
  } catch (error) {
    console.error('❌ AI service test failed:', error);
  }
}

async function runTests() {
  console.log('🚀 Starting tests...\n');
  
  await testDatabase();
  console.log('');
  await testAIService();
  
  console.log('\n✅ All tests completed!');
  
  // Close database connection
  await db.disconnect();
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

export { testDatabase, testAIService };
