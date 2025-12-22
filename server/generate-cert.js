const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { promisify } = require('util');

const certDir = path.join(__dirname, 'ssl');
const keyPath = path.join(certDir, 'key.pem');
const certPath = path.join(certDir, 'cert.pem');

// Create ssl directory if it doesn't exist
if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir, { recursive: true });
    console.log('Created ssl directory');
}

// Check if certificates already exist
if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    console.log('SSL certificates already exist.');
    console.log(`Key: ${keyPath}`);
    console.log(`Cert: ${certPath}`);
    console.log('\nTo regenerate certificates, delete the existing files first.');
    process.exit(0);
}

console.log('Generating self-signed SSL certificate...');
console.log('This may take a few moments...\n');

// Use selfsigned npm package (works without OpenSSL)
let selfsigned;
try {
    selfsigned = require('selfsigned');
} catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
        console.log('Installing "selfsigned" package (required for certificate generation)...\n');
        try {
            execSync('npm install selfsigned --save-dev', { stdio: 'inherit' });
            selfsigned = require('selfsigned');
            console.log('\n✅ Package installed successfully!\n');
        } catch (installError) {
            console.error('\n❌ Failed to install selfsigned package.');
            console.error('Please run manually: npm install selfsigned --save-dev');
            console.error('Then run: npm run generate-cert');
            process.exit(1);
        }
    } else {
        throw error;
    }
}

// Generate certificate using async/await
(async function() {
    try {
        const attrs = [{ name: 'commonName', value: 'localhost' }];
        const options = {
            keySize: 4096,
            days: 365,
            algorithm: 'sha256'
        };
        
        // Generate certificate (it's an async function)
        const pems = await selfsigned.generate(attrs, options);
        
        if (!pems || !pems.private || !pems.cert) {
            throw new Error('Invalid certificate data received. Available keys: ' + Object.keys(pems || {}).join(', '));
        }
        
        fs.writeFileSync(keyPath, pems.private, { mode: 0o600 });
        fs.writeFileSync(certPath, pems.cert, { mode: 0o644 });
        
        console.log('\n✅ SSL certificates generated successfully!');
        console.log(`Key: ${keyPath}`);
        console.log(`Cert: ${certPath}`);
        console.log('\n⚠️  Note: This is a self-signed certificate for development.');
        console.log('   Your browser will show a security warning. This is normal for self-signed certs.');
        console.log('   Click "Advanced" → "Proceed to localhost" to continue.');
        console.log('   For production, use certificates from Let\'s Encrypt or a trusted CA.');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error generating certificates:', error.message);
        if (error.stack) {
            console.error(error.stack);
        }
        process.exit(1);
    }
})();



