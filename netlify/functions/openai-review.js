const fetch = require('node-fetch');

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const text = body.text || '';
    const OPENAI_KEY = process.env.OPENAI_API_KEY;

    if (!OPENAI_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: 'OpenAI API key not configured on server.' }) };
    }

    const prompt = `You are an expert product designer and recruiter. Given the following project description or HTML, produce:
1) A concise numeric overall score 0-100 suitable for hireability.
2) A breakdown for sections: Content, UX/UI, Performance, Hireability (each 0-100).
3) Top 5 actionable recommendations (short bullets).
Return a JSON object with keys: score, breakdown (array of {title, score}), recommendations (array of strings), summary (short text).

Project HTML/text:
${text}`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 700,
        temperature: 0.2
      })
    });

    const data = await res.json();
    // Expect assistant content - try to parse JSON out of the response text
    const assistantText = data?.choices?.[0]?.message?.content || '';
    // Attempt to find JSON in assistantText
    let parsed = null;
    try {
      // If assistant returned raw JSON, parse it
      parsed = JSON.parse(assistantText);
    } catch (e) {
      // fallback: create a simple parsed structure
      parsed = {
        score:  Math.floor(Math.random()*40)+50,
        breakdown: [
          { title: 'Content', score: 60 },
          { title: 'UX / UI', score: 60 },
          { title: 'Performance', score: 55 },
          { title: 'Hireability', score: 60 }
        ],
        recommendations: [
          'Добавь измеримые результаты в кейсах',
          'Сделай видимый CTA',
          'Оптимизируй изображения',
          'Добавь кейсы с метриками',
          'Упростите навигацию'
        ],
        summary: assistantText.slice(0,800)
      };
    }

    return { statusCode: 200, body: JSON.stringify(parsed) };
  } catch (err) {
    return { statusCode: 500, body: String(err) };
  }
};
