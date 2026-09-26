export type Role = 'admin' | 'user';

export interface UserDoc {
  name: string;
  email: string;
  passwordHash?: string; // kosong jika login via Google
  provider: 'credentials' | 'google';
  role: Role;
  dailyLimit: number; // -1 = tak terbatas
  usageToday: number;
  usageDate: string; // YYYY-MM-DD, untuk reset harian
  createdAt: string;
}

export interface AppSettings {
  assistantName: string;
  creatorAnswer: string; // dipakai kalau user tanya "siapa yang membuatmu?"
  nameAnswer: string; // dipakai kalau user tanya "siapa namamu?"
  systemPrompt: string; // instruksi tambahan lain untuk AI
  defaultDailyLimit: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
