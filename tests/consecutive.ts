import MTCaptcha from '../src/index.js';

const mtc = new MTCaptcha({
    siteKey: 'MTPublic-305dpdlj4',
    host: 'https://edpuzzle.com',
    mistralKey: process.env.MISTRAL_TEST_KEY
});

for (let i = 0; i < Number.MAX_SAFE_INTEGER; i++) {
    const now = Date.now();
    const result = await mtc.solve('sign_up_edpuzzle');
    console.log('solved in', Date.now() - now, 'ms; result:', result);
}