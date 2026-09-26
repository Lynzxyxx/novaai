export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// Firestore doc ID tidak boleh pakai "/", email dipakai apa adanya (lowercase)
// karena email tidak mengandung karakter itu.
export function emailToId(email: string) {
  return email.trim().toLowerCase();
}
