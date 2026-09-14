import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { imageBase64 } = await req.json();
    
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Money Tracker"
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              { 
                type: "text", 
                text: `Tolong baca struk belanja ini. Carilah "Total" belanja atau jumlah akhir yang harus dibayar.
Return ONLY a valid JSON object matching this structure, without markdown blocks or backticks:
{
  "amount": number,
  "note": string (tuliskan ringkasan toko/tempat atau barang dari struk, misal "Belanja di Indomaret")
}`
              },
              { 
                type: "image_url", 
                image_url: { 
                  url: imageBase64 
                } 
              }
            ]
          }
        ]
      })
    });

    const data = await response.json();
    let content = data.choices[0].message.content;
    
    // Clean markdown if exists
    content = content.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    return NextResponse.json(JSON.parse(content));
  } catch (error) {
    console.error("Scanner Error:", error);
    return NextResponse.json({ error: "Failed to scan receipt" }, { status: 500 });
  }
}
