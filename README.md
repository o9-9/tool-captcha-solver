<div align='center'>
    <h1>mtcrackcha</h1>
    <h3>beating up a stupid captcha service (mtcaptcha) that pisses me off</h3>
</div>

<br><br>
<h2 align='center'>using up mtcrackcha</h2>

1. install `mtcrackcha` using npm or bun or whatever the latest pacakge manager is
2. create a new class

```js
import MTCaptcha from 'mtcrackcha';
```

3. grab the sitekey of the page you're solving:
    1. open the page where you want to solve the captcha
    2. open the console
    3. type `mtcaptchaConfig.sitekey` and copy the output
4. identify the host
    1. the host is the URL beginning (can have subdomain) where you solved

if the website you are solving on has text input captchas, you'll need to pick up a Mistral API key over at [mistral.ai](https://mistral.ai) - the key is free and gives you access to their pixtral model (`pixtral-large-latest`), which is currently the best vision model for solving mtcaptcha's challenges

5. create a new instance of the class

```js
// if there's text input:
const mtc = new MTCaptcha({
    siteKey: 'MTPublic-THISISAKEY',
    host: 'https://google.com',
    mistralKey: 'XXXXXXX'
});

// if there's no input (invisible):
const mtc = new MTCaptcha({
    siteKey: 'MTPublic-THISISAKEY',
    host: 'https://google.com',
    invisible: true
});
```

> mtcatpcha punishes IPs that request lots of captchas with harder captchas that Mistral's vision models have more trouble solving. On runtimes that support the `proxy` option to `fetch`, you can set the `PROXY` environment variable to have all requests go through a proxy. Rotating proxies are not flagged by mtcaptcha.

6. identify the page's "act"
    1. open the browser console
    2. reload the page
    3. go to network and filter by `getchallenge.json`
    4. click on it and look at the payload tab
    5. copy the `act` value

7. call the `mtc.solve` method:

```js
const solution = await mtc.solve('the_act_goes_here');
if (solution.success) console.log('got mtcaptcha token', solution.token);
else console.log('whelp, time to try it again');
```

<br><br>
<h5 align='center'>made with ❤️</h5>