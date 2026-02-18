// Test the improved search functionality
const { searchProducts } = require('./lib/api.ts');

async function testSearch() {
  console.log('🧪 Testing improved search functionality...\n');
  
  const testQueries = [
    'Marie Gold biscuits',
    'Coca Cola',
    'Nutella',
    'Protein bar',
    'Sidi Ali' // This should return Sidi Ali if searched specifically
  ];
  
  for (const query of testQueries) {
    console.log(`🔍 Searching for: "${query}"`);
    try {
      const result = await searchProducts(query, 1);
      console.log(`✅ Found ${result.count} products`);
      if (result.products.length > 0) {
        console.log(`🎯 Best match: ${result.products[0].name}`);
        console.log(`📊 Brand: ${result.products[0].brand}`);
      } else {
        console.log('❌ No products found');
      }
    } catch (error) {
      console.error('❌ Search failed:', error.message);
    }
    console.log('---');
  }
}

testSearch().catch(console.error);
