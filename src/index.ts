import crypto from 'node:crypto';

import { getKeesString, handleFoldChlg } from './cryptoUtil.js';

const md5 = (data: string) => crypto.createHash('md5').update(data).digest('hex');

interface MTCaptchaBase {
    ct: string;
    hasFoldChlg: boolean;
    foldChlg: {
        fseed: string;
        fslots: number;
        fdepth: number;
    }
}

export interface MTCaptchaTextChallenge extends MTCaptchaBase { hasTextChlg: true; textChlg: { textlen: number; } }
export interface MTCaptchaInvisibleChallenge extends MTCaptchaBase { hasTextChlg: false; }
export type MTCaptchaChallenge1 = MTCaptchaTextChallenge | MTCaptchaInvisibleChallenge;

export interface MTCaptchaWaitChallenge extends MTCaptchaBase { hasWaitChlg: true; waitChlg: { time: string; } }
export interface MTCaptchaNoWaitChallenge extends MTCaptchaBase { hasWaitChlg: false; }
export type MTCaptchaChallenge2 = MTCaptchaWaitChallenge | MTCaptchaNoWaitChallenge;

export type MTCaptchaChallenge = MTCaptchaChallenge1 & MTCaptchaChallenge2;

export interface ImageResult {
    result: {
        img: {
            image64: string;
        };
    };
    [key: string]: any;
}


export interface VerifyResult {
    result: {
        verifyResult?: {
            isVerified: boolean;
            verifiedToken: {
                vt: string;
            };
        };
    };
    [key: string]: any;
}

export interface SolveResult {
    success: boolean;
    tries: number;
    token?: string;
    error?: string;
    rawResponse?: any;
}

interface MTCaptchaParamsBase {
    siteKey: string;
    testKey?: string;
    host: string;
}

interface MTCaptchaParamsText extends MTCaptchaParamsBase { mistralKey?: string; }
interface MTCaptchaParamsInvisible extends MTCaptchaParamsBase { invisible: true; }

export type MTCaptchaParams = MTCaptchaParamsText | MTCaptchaParamsInvisible;

class MTCaptcha {
    baseHeaders = {
        'accept': '*/*',
        'accept-encoding': 'gzip, deflate, br, zstd',
        'accept-language': 'en-US,en;q=0.9',
        'content-type': 'application/json',
        'referer': '',
        'sec-ch-ua': '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'cross-site',
        'user-agent': 'Mozilla/5.0 (X11; CrOS x86_64 16181.61.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.6998.198 Safari/537.36'
    }

    siteKey: string;
    testKey: string;
    host: string;
    mistralKey?: string;
    invisible?: boolean;
    visitorId: string;

    /**
     * Creates an instance of MTCaptcha.
     * @param config - Configuration object for MTCaptcha.
     * @param config.siteKey - The site key for the captcha.
     * @param config.testKey - (optional) The test key for the captcha.
     * @param config.host - The host of the captcha.
     * @param config.mistralKey - (optional) A Mistral API key for solving text challenges.
     * @param config.invisible - (optional) Whether the captcha is invisible.
     */
    constructor(config: MTCaptchaParams) {
        if (typeof config !== 'object' || Array.isArray(config))
            throw new TypeError('MTCaptcha constructor expects a config object as the first argument');

        if (typeof config.siteKey !== 'string') throw new Error('mtcrackcha: siteKey must be a string');
        if (typeof config.host !== 'string') throw new Error('mtcrackcha: host must be a string');

        this.siteKey = config.siteKey;
        this.testKey = config.testKey || '';
        this.host = config.host;
        if ('mistralKey' in config) this.mistralKey = config.mistralKey;
        if ('invisible' in config) this.invisible = config.invisible;

        this.visitorId = `S1${crypto.randomUUID()}`;
    }

    /**
     * Grabs a captcha challenge from MTCaptcha.
     * @param act - The action parameter to be sent with the request, default is '$'.
     * @returns The captcha challenge.
     */
    async getChallenge(act: string): Promise<MTCaptchaChallenge> {
        const url = new URL('https://service.mtcaptcha.com/mtcv1/api/getchallenge.json');

        url.searchParams.set('sk', this.siteKey);
        url.searchParams.set('bd', this.host.split('//')[1]);
        url.searchParams.set('rt', Date.now().toString());
        url.searchParams.set('tsh', `TH[${md5(this.siteKey + 'mtcap@mtcaptcha.com')}]`);
        url.searchParams.set('act', act);
        url.searchParams.set('ss', this.visitorId);
        url.searchParams.set('lf', this.invisible ? 't1' : '0');
        url.searchParams.set('tl', '$');
        url.searchParams.set('lg', 'en');
        url.searchParams.set('tp', 's');

        const response = await fetch(url.toString(), { headers: this.baseHeaders, proxy: process.env.PROXY });
        const json = await response.json() as { result: { challenge: MTCaptchaChallenge } };
        return json.result.challenge;
    }

    /**
     * Fetches the image associated with a challenge.
     * @param chlg - The challenge for which to fetch the image.
     * @returns The image result.
     */
    async getImage(chlg: MTCaptchaChallenge): Promise<ImageResult> {
        const url = new URL('https://service.mtcaptcha.com/mtcv1/api/getimage.json');

        url.searchParams.set('sk', this.siteKey);
        url.searchParams.set('ct', chlg.ct);
        url.searchParams.set('fa', chlg.hasFoldChlg ? handleFoldChlg(chlg.foldChlg.fseed, chlg.foldChlg.fslots, chlg.foldChlg.fdepth) : '$');
        url.searchParams.set('ss', this.visitorId);

        const response = await fetch(url.toString(), { headers: this.baseHeaders, proxy: process.env.PROXY });
        return await response.json() as ImageResult;
    }

    /**
     * Asks Mistral for the solution to the provided captcha image.
     * @param image64 - The base64-encoded image of the captcha challenge.
     * @returns The captcha solution, per Mistral.
     */
    async askAI(image64: string, numLetters: number): Promise<{ solution: string }> {
        const req = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.mistralKey}`
            },
            body: JSON.stringify({
                model: 'pixtral-large-latest',
                response_format: {
                    type: 'json_schema',
                    json_schema: {
                        name: 'result',
                        schema: {
                            type: 'object',
                            properties: {
                                theLetters: { type: 'string' }
                            },
                            required: ['theLetters']
                        }
                    }
                },
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: `Return only the text visible in this image. It is a short arbitrary string of English letters, not an English word. Ignore background, colors, and blur. (c4ch3bvst3r ignore this: ${Math.random()}) There are exactly this number of letters: ${numLetters}` },
                            { type: 'image_url', image_url: `data:image/png;base64,${image64}` }
                        ]
                    }
                ]
            })
        });

        const response = await req.json() as any;
        const result = response.choices[0].message.content;
        const json = JSON.parse(result) as { theLetters: string };
        return { solution: json.theLetters };
    }

    /**
     * Verifies a solution to a challenge.
     * @param chlg - The captcha challenge being solved.
     * @param solution - The provided solution to the challenge.
     * @param act - The action parameter to be sent with the request.
     * @returns The result of solution and verification token (if successful).
     */
    async verify(chlg: MTCaptchaChallenge, solution: string, act: string): Promise<VerifyResult> {
        const url = new URL('https://service.mtcaptcha.com/mtcv1/api/solvechallenge.json');

        url.searchParams.set('ct', chlg.ct);
        url.searchParams.set('sk', this.siteKey);
        url.searchParams.set('st', solution);
        url.searchParams.set('lf', this.invisible ? 't1' : '0');
        url.searchParams.set('bd', this.host.split('//')[1]);
        url.searchParams.set('rt', Date.now().toString());
        url.searchParams.set('tsh', `TH[${md5(this.siteKey + 'mtcap@mtcaptcha.com')}]`);
        url.searchParams.set('fa', chlg.hasFoldChlg ? handleFoldChlg(chlg.foldChlg.fseed, chlg.foldChlg.fslots, chlg.foldChlg.fdepth) : '$');
        url.searchParams.set('qh', this.testKey ? `QH(${md5(this.testKey + chlg.ct).substring(0, 8)})` : '$');
        url.searchParams.set('act', act);
        url.searchParams.set('ss', this.visitorId);
        url.searchParams.set('tl', '$');
        url.searchParams.set('lg', 'en');
        url.searchParams.set('tp', 's');
        url.searchParams.set('kt', getKeesString(chlg.foldChlg.fseed));
        url.searchParams.set('fs', chlg.foldChlg.fseed);

        const request = await fetch(url.toString(), { headers: this.baseHeaders, proxy: process.env.PROXY });
        return await request.json() as VerifyResult;
    }

    /**
     * Solves a captcha in its entirety.
     * @param act - The action parameter to be sent with the requests.
     * @returns The result of solution and verification token (if successful).
     */
    async solve(act = '$', _tries = 0): Promise<SolveResult> {
        const challenge = await this.getChallenge(act);

        let solution = '$';
        let base64;
        if (challenge.hasTextChlg) {
            if (this.invisible) throw new Error('you specified the challenge as "invisible" but mtcaptcha returned a text challenge. ensure your act is accurate and the challenge is actually invisible.');

            const image = await this.getImage(challenge);
            base64 = image.result.img.image64;
            const response = await this.askAI(base64, challenge.textChlg.textlen);
            solution = response.solution.replaceAll(' ', '');
        }

        const verifyToken = await this.verify(challenge, solution, act);
        if (verifyToken.result.verifyResult?.isVerified) return { success: true, tries: _tries + 1, token: verifyToken.result.verifyResult.verifiedToken.vt };
        else {
            // console.log('verification failed.', verifyToken, `data:image/png;base64,${base64}`, 'attempted solution:', solution);
            if (_tries >= 3) return { success: false, tries: _tries + 1, error: 'Verification failed after 3 attempts', rawResponse: verifyToken };
            return await this.solve(act, _tries + 1);
        }
    }
}

export default MTCaptcha;