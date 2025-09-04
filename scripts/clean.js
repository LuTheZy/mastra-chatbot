const fs = require('fs');
const path = require('path');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function forceDelete(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      console.log(`Directory ${dirPath} doesn't exist`);
      return;
    }

    // Try to delete normally first
    await fs.promises.rm(dirPath, { recursive: true, force: true });
    console.log(`✅ Successfully removed ${dirPath}`);
  } catch (error) {
    if (error.code === 'EBUSY' || error.code === 'ENOTEMPTY') {
      console.log(`⚠️ Directory locked, waiting and retrying...`);
      await sleep(2000);
      
      try {
        await fs.promises.rm(dirPath, { recursive: true, force: true });
        console.log(`✅ Successfully removed ${dirPath} on retry`);
      } catch (retryError) {
        console.log(`❌ Still locked: ${retryError.message}`);
        console.log(`💡 Try closing your IDE and running again`);
      }
    } else {
      console.log(`❌ Error: ${error.message}`);
    }
  }
}

async function cleanMastra() {
  console.log('🧹 Cleaning Mastra cache...');
  
  const mastraDir = path.join(process.cwd(), '.mastra');
  const outputDir = path.join(mastraDir, 'output');
  
  // Just target the problematic output directory
  await forceDelete(outputDir);
  
  console.log('✨ Clean complete! Now try: npm run dev');
}

cleanMastra().catch(console.error);