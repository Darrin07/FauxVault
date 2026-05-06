/** 
* Tests: Weak Session Tokens / Cookie Flags(weak_session_tokens) 
* 
* Vulnerability Module: weak_session_tokens(A07) 
* What is tested: 
*    1. Vulnerable mode(module ON): 
*       a.Login response includes token in body 
*       b.Login sets a cookie with httpOnly = false 
*       c.Register response includes token in body 
*       d.Register sets a cookie with httpOnly = false * 
*    2. Hardened mode(module OFF): 
*       a.Login response does NOT include token in body 
*       b.Login sets a cookie with HttpOnly flag 
*       c.Register response does NOT include token in body 
*       d.Register sets a cookie with HttpOnly flag 
* 
*    3. Cookie - based auth: 
*       a.Protected route works with cookie(no Authorization header) 
* 
*    4. Logout: 
*       a.Clears the token cookie regardless of module state 
*/

const request = require('supertest'); 
const app = require('../../src/app'); 
const { resetUsers } = require('../../src/models/users'); 
const { resetAccounts } = require('../../src/models/accounts'); 
const { resetSettings, updateSetting } = require('../../src/models/toggleState');

/** 
* Extracts the token cookie string from the Set-Cookie header. */
function getTokenCookie(res) { 
    const cookies = res.headers['set-cookie'] || []; 
    return cookies.find(c => c.startsWith('token=')); 
}

/** 
* Extracts the JWT value from the token cookie. */
function extractCookieToken(res) { 
    const cookie = getTokenCookie(res); 
    return cookie ? cookie.split(';')[0].replace('token=', '') : null; 
}

beforeEach(async () => { 
    await resetUsers(); 
    await resetAccounts(); 
    await resetSettings(); 
});

// Vulnerable mode (weak_session_tokens on)
describe('weak_session_tokens — vulnerable mode', () => {
    beforeEach(async () => { 
        await updateSetting('weak_session_tokens', true); 
    });

    test('login includes token in response body', async () => {
        await request(app).post('/api/auth/register').send({ username: 'vulnuser', email: 'vuln@example.com', password: 'Password123' });
        const res = await request(app)
            .post('/api/auth/login')
            .send({ identifier: 'vuln@example.com', password: 'Password123' });

        expect(res.status).toBe(200); 
        expect(res.body.token).toBeDefined(); 
        expect(typeof res.body.token).toBe('string');
    });

    test('login sets cookie WITHOUT HttpOnly flag', async () => {
        await request(app)
            .post('/api/auth/register')
            .send({ username: 'vulnuser', email: 'vuln@example.com', password: 'Password123' });

        const res = await request(app)
            .post('/api/auth/login')
            .send({ identifier: 'vuln@example.com', password: 'Password123' });

        const cookie = getTokenCookie(res); 
        expect(cookie).toBeDefined(); // In vulnerable mode, HttpOnly should NOT be set
        expect(cookie.toLowerCase()).not.toMatch(/httponly/); 
    });

        test('register includes token in response body', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({ username: 'vulnreg', email: 'vulnreg@example.com', password: 'Password123' });

            expect(res.status).toBe(201); 
            expect(res.body.token).toBeDefined();
        });

        test('register sets cookie WITHOUT HttpOnly flag', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({ username: 'vulnreg', email: 'vulnreg@example.com', password: 'Password123' });
            
                const cookie = getTokenCookie(res); 
                expect(cookie).toBeDefined(); 
                expect(cookie.toLowerCase()).not.toMatch(/httponly/);
        });

        test('cookie has SameSite=None in vulnerable mode', async () => {
            await request(app)
                .post('/api/auth/register')
                .send({ username: 'vulnsite', email: 'vulnsite@example.com', password: 'Password123' });
            
            const res = await request(app)
                .post('/api/auth/login')
                .send({ identifier: 'vulnsite@example.com', password: 'Password123' });

            const cookie = getTokenCookie(res); 
            expect(cookie.toLowerCase()).toMatch(/samesite=none/);
        });
    });

// Hardened mode (weak_session_tokens off)

    describe('weak_session_tokens — hardened mode', () => {
        beforeEach(async () => { 
            await updateSetting('weak_session_tokens', false); 
        });

        test('login does NOT include token in response body', async () => {
            await request(app)
                .post('/api/auth/register')
                .send({ username: 'safeuser', email: 'safe@example.com', password: 'Password123' });
            
                // Must re-login after register since register also uses toggle 
            const res = await request(app) 
                .post('/api/auth/login') 
                .send({ identifier: 'safe@example.com', password: 'Password123' });

            expect(res.status).toBe(200); 
            expect(res.body.token).toBeUndefined();
        });

        test('login sets cookie WITH HttpOnly flag', async () => {
            await request(app)
                .post('/api/auth/register')
                .send({ username: 'safeuser', email: 'safe@example.com', password: 'Password123' });

            const res = await request(app)
                .post('/api/auth/login')
                .send({ identifier: 'safe@example.com', password: 'Password123' });

            const cookie = getTokenCookie(res); 
            expect(cookie).toBeDefined(); 
            expect(cookie.toLowerCase()).toMatch(/httponly/);
        });

        test('login cookie has SameSite=Strict in hardened mode', async () => {
            await request(app)
                .post('/api/auth/register')
                .send({ username: 'safesite', email: 'safesite@example.com', password: 'Password123' });
            
            const res = await request(app)
                .post('/api/auth/login')
                .send({ identifier: 'safesite@example.com', password: 'Password123' });

            const cookie = getTokenCookie(res); 
            expect(cookie.toLowerCase()).toMatch(/samesite=strict/);
        });

        test('register does NOT include token in response body', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({ username: 'safereg', email: 'safereg@example.com', password: 'Password123' });

            expect(res.status).toBe(201); 
            expect(res.body.token).toBeUndefined();
        });

        test('register sets cookie WITH HttpOnly flag', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({ username: 'safereg2', email: 'safereg2@example.com', password: 'Password123' });
           
            const cookie = getTokenCookie(res); 
            expect(cookie).toBeDefined(); 
            expect(cookie.toLowerCase()).toMatch(/httponly/);
        });

        test('cookie-based auth works on protected routes (no Authorization header)', async () => {
            const registerRes = await request(app)
                .post('/api/auth/register')
                .send({ username: 'cookieauth', email: 'cookieauth@example.com', password: 'Password123' });

            const token = extractCookieToken(registerRes);
            const res = await request(app).get('/api/health/protected').set('Cookie', `token=${token}`);

            expect(res.status).toBe(200); 
            expect(res.body.user.email).toBe('cookieauth@example.com');
        });
    });

// Logout -- 
    describe('weak_session_tokens — logout', () => {
        test('logout clears the token cookie', async () => {
            const res = await request(app)
                .post('/api/auth/logout');
                
            const cookie = getTokenCookie(res); 
            expect(cookie).toBeDefined(); // express clearCookie sets the value to empty and adds an expiry in the past 
            expect(cookie).toMatch(/expires=/i); 
        });
    });