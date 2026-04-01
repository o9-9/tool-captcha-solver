import MTCaptcha from '../src/index.js';

const mtc = new MTCaptcha({
    siteKey: 'MTPublic-305dpdlj4',
    host: 'https://edpuzzle.com',
    mistralKey: process.env.MISTRAL_TEST_KEY
});

const now = Date.now();
const token = await mtc.solve('sign_up_edpuzzle');
console.log('solved in', Date.now() - now, 'ms; token:', token);