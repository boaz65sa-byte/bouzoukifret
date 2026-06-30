/** הגדרות אתר — STEM_PROXY_URL מ-Vercel Environment Variables */
module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=300');
  const stemProxyUrl = String(process.env.STEM_PROXY_URL || '').trim().replace(/\/$/, '');
  res.json({
    stemProxyUrl,
    downloadViaRelay: !!stemProxyUrl,
    downloadViaPiped: true,
  });
};
