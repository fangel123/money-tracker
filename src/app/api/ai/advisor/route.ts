import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { text, imageBase64 } = await req.json();

    // 1. Fetch All Context (RAG)
    const [
      { data: categories },
      { data: accounts },
      { data: budgets },
      { data: transactions },
      { data: goals },
      { data: debts },
      { data: planners },
      { data: plannerItems }
    ] = await Promise.all([
      supabase.from("categories").select("*"),
      supabase.from("accounts").select("*"),
      supabase.from("budgets").select("*, category:categories(name)"),
      supabase.from("transactions").select("*, category:categories(name), account:accounts(name)").order("date", { ascending: false }).limit(50),
      supabase.from("goals").select("*"),
      supabase.from("debts").select("*"),
      supabase.from("planners").select("*"),
      supabase.from("planner_items").select("*")
    ]);

    // Format data for AI context
    const contextData = {
      accounts: accounts?.map(a => ({ id: a.id, name: a.name, balance: a.balance })),
      categories: categories?.map(c => ({ id: c.id, name: c.name, type: c.type })),
      budgets: budgets?.map(b => ({ id: b.id, category: (b.category as any)?.name, amount: b.amount })),
      recent_transactions: transactions?.map(t => ({ 
        id: t.id, date: t.date, amount: t.amount, type: t.type, 
        category: (t.category as any)?.name, account: (t.account as any)?.name, note: t.note 
      })),
      goals: goals?.map(g => ({ id: g.id, name: g.name, target: g.target_amount, current: g.current_amount })),
      debts: debts?.map(d => ({ id: d.id, name: d.name, type: d.type, remaining: d.remaining_amount, total: d.amount })),
      monthly_planners: planners?.map(p => {
        const items = plannerItems?.filter(i => i.planner_id === p.id).map(i => ({ name: i.name, amount: i.amount, tag: i.status_tag, category: i.category }));
        return { title: p.title, items };
      })
    };

    // 2. Prepare user content
    let userContent: any = text;
    if (imageBase64) {
      userContent = [
        { type: "text", text: text || "Tolong catat transaksi dari gambar struk/bukti transfer ini." },
        { type: "image_url", image_url: { url: imageBase64 } }
      ];
    }

    // 3. Prompt AI with Tools/JSON Schema
    const systemPrompt = `You are an omnipotent financial AI Advisor for a money tracking app.
You have full access to the user's database. Here is the user's current data:
${JSON.stringify(contextData, null, 2)}

You can answer questions about their finances OR perform actions (CRUD) on their behalf.
If the user asks a question (e.g. "berapa saldo saya?", "apa rencana agustus?", "berapa sisa utang saya?"), answer it friendly in Indonesian.
If the user wants to add/delete/update something, use the appropriate action.

You MUST respond in ONLY valid JSON format matching this schema (NO markdown blocks, NO backticks):
{
  "action": "answer" | "add_transaction" | "delete_transaction" | "add_account" | "add_budget" | "add_goal" | "add_debt",
  "message": "Your friendly response to the user in Indonesian.",
  "payload": {
    // If action is "answer", payload is {}
    // If action is "add_transaction": { "amount": number, "type": "income"|"expense", "category_id": string (must match from context), "account_id": string (must match from context), "note": string }
    // If action is "delete_transaction": { "transaction_id": string (must match from context) }
    // If action is "add_goal": { "name": string, "target_amount": number }
    // If action is "add_debt": { "name": string, "type": "payable"|"receivable", "amount": number }
  }
}

Rules:
- For add_transaction, if category or account is not specified, use the ID of the first available one.
- Always use the UUIDs provided in the context for category_id, account_id, and transaction_id.
- Never wrap the response in \`\`\`json. Return pure JSON.`;

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
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent }
        ]
      })
    });

    const data = await response.json();
    let content = data.choices[0].message.content;
    content = content.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    const aiResponse = JSON.parse(content);
    
    // 4. Server-Side Execution (The AI's Hands)
    const { action, payload } = aiResponse;
    let executionError = null;

    try {
      if (action === "add_transaction") {
        const { error } = await supabase.from("transactions").insert({
          user_id: user.id,
          amount: payload.amount,
          type: payload.type,
          category_id: payload.category_id,
          account_id: payload.account_id,
          note: payload.note || "",
          date: new Date().toISOString()
        });
        if (error) throw error;
      } 
      else if (action === "delete_transaction") {
        const { error } = await supabase.from("transactions").delete().eq("id", payload.transaction_id).eq("user_id", user.id);
        if (error) throw error;
      }
      else if (action === "add_account") {
        const { error } = await supabase.from("accounts").insert({
          user_id: user.id,
          name: payload.name,
          balance: payload.initial_balance || 0,
        });
        if (error) throw error;
      }
      else if (action === "add_budget") {
        // Upsert budget for category
        const { error } = await supabase.from("budgets").upsert({
          user_id: user.id,
          category_id: payload.category_id,
          amount: payload.amount,
          month: new Date().toISOString().substring(0, 7) // YYYY-MM
        }, { onConflict: "category_id, month" });
        if (error) throw error;
      }
      else if (action === "add_goal") {
        const { error } = await supabase.from("goals").insert({
          user_id: user.id,
          name: payload.name,
          target_amount: payload.target_amount,
          current_amount: 0
        });
        if (error) throw error;
      }
      else if (action === "add_debt") {
        const { error } = await supabase.from("debts").insert({
          user_id: user.id,
          name: payload.name,
          type: payload.type,
          amount: payload.amount,
          remaining_amount: payload.amount,
          status: "active"
        });
        if (error) throw error;
      }
    } catch (err: any) {
      console.error("Action Execution Error:", err);
      executionError = err.message;
    }

    if (executionError) {
      return NextResponse.json({
        action: "error",
        message: `Maaf, saya mengerti maksud Anda tapi gagal mengeksekusinya di database. Error: ${executionError}`
      });
    }

    return NextResponse.json(aiResponse);
  } catch (error) {
    console.error("AI Advisor Omnipotent Error:", error);
    return NextResponse.json({ error: "Failed to process with AI" }, { status: 500 });
  }
}
