import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    // Hanya user yang login boleh memakai kuota API AI
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { imageBase64, categories } = await req.json();
    const categoryList = Array.isArray(categories)
      ? categories.filter((c: unknown): c is string => typeof c === 'string').slice(0, 50)
      : [];
    
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Koin"
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
  "note": string (tuliskan ringkasan toko/tempat atau barang dari struk, misal "Belanja di Indomaret"),
  "date": string (tanggal transaksi di struk, format YYYY-MM-DD; kosongkan jika tidak terbaca),
  "category": string (pilih SATU yang paling cocok dari daftar ini: ${categoryList.length ? categoryList.join(", ") : "Lainnya"})
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
    
    if (data.error) {
      console.error("OpenRouter Error:", data.error);
      return NextResponse.json({ error: data.error.message || "OpenRouter API error" }, { status: 500 });
    }

    if (!data.choices || !data.choices[0]) {
      console.error("Invalid OpenRouter Response:", data);
      return NextResponse.json({ error: "Invalid response from AI provider" }, { status: 500 });
    }

    let content = data.choices[0].message.content;
    
    // Clean markdown if exists
    content = content.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    return NextResponse.json(JSON.parse(content));
  } catch (error: any) {
    console.error("Scanner Error:", error);
    return NextResponse.json({ error: error.message || "Failed to scan receipt" }, { status: 500 });
  }
}
