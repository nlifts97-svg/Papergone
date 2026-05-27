import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { message, docsContext } = await request.json()

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://papergone.vercel.app',
        'X-Title': 'PaperGone',
      },
      body: JSON.stringify({
        model: 'google/gemini-flash-1.5',
        messages: [
          {
            role: 'system',
            content: `You are PaperGone's AI assistant. You help users understand their documents. 
You have access to the user's documents below. Answer questions concisely and helpfully.
Always give specific answers based on the actual document data when possible.
If asked about bills, totals, or deadlines, look through the document data carefully.

USER'S DOCUMENTS:
${docsContext}

Keep answers short (2-4 sentences max). Be friendly and specific.`
          },
          { role: 'user', content: message }
        ],
        max_tokens: 300,
      })
    })

    const data = await response.json()
    const reply = data.choices?.[0]?.message?.content || 'Sorry, I could not answer that.'
    return NextResponse.json({ reply })
  } catch (err) {
    return NextResponse.json({ reply: 'Something went wrong. Try again.' }, { status: 500 })
  }
}
