import MTCaptcha from '../lib/MTCaptcha.js';

const mtc = new MTCaptcha({
    siteKey: 'MTPublic-305dpdlj4',
    host: 'https://edpuzzle.com',
    geminiKey: process.env.GEMINI_TEST_KEY
});

const token = await mtc.solve('sign_up_edpuzzle');
if (token.success) console.log('Solver works!');
else {
    console.error(token);
    throw new Error('solver does NOT work :((');
}