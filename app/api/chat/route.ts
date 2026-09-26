import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { todayStr } from '@/lib/utils';
import { ChatMessage, AppSettings, UserDoc } from '@/lib/types';

// Pola pertanyaan yang jawabannya diambil langsung dari pengaturan admin,
// supaya jawabannya konsisten dan tidak tergantung mood model AI.
const CREATOR_PATTERNS = [
  /siapa.*(pembuat|pencipta|developer|yang buat|yang membuat)/i,
  /who\s*(made|created|built)\s*you/i,
];
const NAME_PATTERNS = [
  /siapa\s*(nama\s*)?(kamu|anda|mu)/i,
  /what.?s?\s*your\s*name/i,
  /who\s*are\s*you/i,
];

function matchAny(text: string, patterns: RegExp[]) {
  return patterns.some((p) => p.test(text));
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Silakan login terlebih dahulu.' }, { status: 401 });
  }

  const { messages } = (await req.json()) as { messages: ChatMessage[] };
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'Pesan tidak valid.' }, { status: 400 });
  }

  const db = getAdminDb();
  const userId = (session.user as any).id as string;
  const userRef = db.collection('users').doc(userId);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    return NextResponse.json({ error: 'User tidak ditemukan.' }, { status: 404 });
  }
  const user = userSnap.data() as UserDoc;

  // Reset kuota harian jika sudah ganti hari
  const today = todayStr();
  let usageToday = user.usageToday;
  if (user.usageDate !== today) {
    usageToday = 0;
    await userRef.update({ usageDate: today, usageToday: 0 });
  }

  if (user.dailyLimit !== -1 && usageToday >= user.dailyLimit) {
    return NextResponse.json(
      { error: `Batas pemakaian harian kamu (${user.dailyLimit} pesan) sudah tercapai. Coba lagi besok.` },
      { status: 429 }
    );
  }

  const settingsSnap = await db.collection('settings').doc('app').get();
  const settings = (settingsSnap.exists ? settingsSnap.data() : null) as AppSettings | null;
  const assistantName = settings?.assistantName || 'Nova AI';
  const creatorAnswer =
    settings?.creatorAnswer ||
    'Saya dibuat dan dikembangkan secara mandiri oleh tim di balik aplikasi ini.';
  const nameAnswer = settings?.nameAnswer || `Nama saya ${assistantName}, siap membantu kamu.`;
  const extraSystemPrompt =
    settings?.systemPrompt || 'Kamu adalah asisten AI yang ramah dan membantu.';

  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content || '';

  // Jawaban custom untuk pertanyaan identitas, diatur dari panel admin
  if (matchAny(lastUserMessage, CREATOR_PATTERNS)) {
    await userRef.update({ usageToday: usageToday + 1, usageDate: today });
    return NextResponse.json({ reply: creatorAnswer });
  }
  if (matchAny(lastUserMessage, NAME_PATTERNS)) {
    await userRef.update({ usageToday: usageToday + 1, usageDate: today });
    return NextResponse.json({ reply: nameAnswer });
  }

  const apiKey = process.env.CHAT_API_KEY;
  const baseUrl = process.env.CHAT_API_BASE_URL;
  const model = process.env.CHAT_MODEL || 'qwen-plus';

  if (!apiKey || !baseUrl) {
    return NextResponse.json(
      { error: 'Server belum dikonfigurasi: CHAT_API_KEY / CHAT_API_BASE_URL belum diisi di Environment Variables.' },
      { status: 500 }
    );
  }

  const systemPrompt = `${extraSystemPrompt}\nNama kamu adalah ${assistantName}. Jika ditanya siapa pembuatmu, jawab: "${creatorAnswer}". Jika ditanya siapa namamu, jawab: "${nameAnswer}".`;

  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `AI API error (${res.status}): ${errText.slice(0, 300)}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const reply =
      data?.choices?.[0]?.message?.content ??
      data?.choices?.[0]?.text ??
      'Maaf, tidak ada respon dari AI.';

    await userRef.update({ usageToday: usageToday + 1, usageDate: today });

    return NextResponse.json({ reply });
  } catch (e: any) {
    return NextResponse.json(
      { error: `Gagal menghubungi AI API: ${e?.message || 'unknown error'}` },
      { status: 502 }
    );
  }
}
