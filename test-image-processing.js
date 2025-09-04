import { mastra } from './src/mastra/index.js';

async function testImageProcessing() {
  console.log('🧪 Testing agent image processing capabilities...\n');
  
  try {
    const agent = mastra.getAgent('supportAgent');
    console.log('✅ Agent retrieved successfully');
    
    // Test 1: Text-only input
    console.log('\n📝 Test 1: Text-only ticket creation');
    const textResponse = await agent.generate([
      { 
        role: 'user', 
        content: 'My email system is down. It started this morning at 9am. It\'s affecting our entire sales team\'s ability to communicate with clients. We\'ve tried restarting Outlook and checking internet connection. This is happening on all workstations in our New York office.' 
      }
    ]);
    
    console.log('Text Response:', textResponse.text);
    if (textResponse.steps && textResponse.steps.length > 0) {
      console.log('Tool calls made:', textResponse.steps.length);
      textResponse.steps.forEach((step, i) => {
        if (step.toolCalls) {
          step.toolCalls.forEach(call => {
            console.log(`  Tool ${i+1}: ${call.toolName}`);
            if (call.result) {
              console.log(`  Result: ${JSON.stringify(call.result, null, 2)}`);
            }
          });
        }
      });
    }
    
    // Test 2: Multimodal input (image URL)
    console.log('\n🖼️  Test 2: Image-based support request');
    const imageResponse = await agent.generate([
      {
        role: 'user',
        content: [
          {
            type: 'image',
            image: 'https://via.placeholder.com/400x200/ff0000/ffffff?text=ERROR+MESSAGE',
            mimeType: 'image/png'
          },
          {
            type: 'text',
            text: 'I got this error on my screen. It happened when I was trying to log into our system this morning. Can you help me create a support ticket?'
          }
        ]
      }
    ]);
    
    console.log('Image Response:', imageResponse.text);
    if (imageResponse.steps && imageResponse.steps.length > 0) {
      console.log('Tool calls made:', imageResponse.steps.length);
      imageResponse.steps.forEach((step, i) => {
        if (step.toolCalls) {
          step.toolCalls.forEach(call => {
            console.log(`  Tool ${i+1}: ${call.toolName}`);
            if (call.result) {
              console.log(`  Result: ${JSON.stringify(call.result, null, 2)}`);
            }
          });
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testImageProcessing();