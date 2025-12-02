// Test script for key generation functionality
async function testKeyGeneration() {
  try {
    console.log('Testing key generation...');
    
    // Test Web Crypto API availability
    if (!window.crypto || !window.crypto.subtle) {
      console.error('Web Crypto API not available');
      return;
    }
    
    console.log('Web Crypto API available');
    
    // Test key generation
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: 'ECDSA',
        namedCurve: 'P-256',
      },
      true,
      ['sign', 'verify']
    );
    
    console.log('Key pair generated successfully');
    
    // Test key export
    const privateKeyBuffer = await window.crypto.subtle.exportKey('raw', keyPair.privateKey);
    const publicKeyBuffer = await window.crypto.subtle.exportKey('raw', keyPair.publicKey);
    
    const privateKey = Array.from(new Uint8Array(privateKeyBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    const publicKey = Array.from(new Uint8Array(publicKeyBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    console.log('Private key length:', privateKey.length);
    console.log('Public key length:', publicKey.length);
    console.log('Private key (first 20 chars):', privateKey.substring(0, 20) + '...');
    console.log('Public key (first 20 chars):', publicKey.substring(0, 20) + '...');
    
    console.log('✅ Key generation test passed!');
  } catch (error) {
    console.error('❌ Key generation test failed:', error);
  }
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.testKeyGeneration = testKeyGeneration;
}

console.log('Test script loaded. Run testKeyGeneration() in browser console to test.');