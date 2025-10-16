const fetch = require('node-fetch');

exports.handler = async (event) => {
  try {
    const url = (event.queryStringParameters && event.queryStringParameters.url) || '';
    if (!url) return { statusCode: 400, body: 'missing url' };

    const res = await fetch(url, {
      headers: { 'User-Agent': 'PortifyBot/1.0' },
      timeout: 10000
    });
    const text = await res.text();

    return {
      statusCode: 200,
      headers: { "Content-Type": "text/plain" },
      body: text
    };
  } catch (err) {
    return { statusCode: 500, body: String(err) };
  }
};
