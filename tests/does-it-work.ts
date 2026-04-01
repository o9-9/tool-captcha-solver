import MTCaptcha from '../src/index.js';

const mtc = new MTCaptcha({
    siteKey: 'MTPublic-305dpdlj4',
    host: 'https://edpuzzle.com',
    mistralKey: process.env.MISTRAL_TEST_KEY
});

const token = await mtc.solve('sign_up_edpuzzle');
if (token.success) console.log('Solver works!');
else {
    console.error(token, token.rawResponse);
    throw new Error('solver does NOT work :((');
}