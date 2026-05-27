function extractTokenFromResponse(res) {
  if (res.body.token) return res.body.token;

  const cookies = res.headers['set-cookie'] || [];
  const tokenCookie = cookies.find((cookie) => cookie.startsWith('token='));

  if (tokenCookie) {
    return tokenCookie.split(';')[0].replace('token=', '');
  }

  return null;
}

function getTokenCookie(res) {
  const cookies = res.headers['set-cookie'] || [];
  return cookies.find((cookie) => cookie.startsWith('token='));
}

function extractCookieToken(res) {
  const cookie = getTokenCookie(res);
  return cookie ? cookie.split(';')[0].replace('token=', '') : null;
}

module.exports = {
  extractTokenFromResponse,
  getTokenCookie,
  extractCookieToken,
};
