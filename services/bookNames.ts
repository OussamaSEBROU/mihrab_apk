// منع تكرار الكتاب بالاسم والمؤلف نفسيهما داخل مكتبة المستخدم (مقارنة بعد التطبيع)
const norm = (t: string) =>
  (t || '')
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, '')            // التشكيل والتطويل
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}]+/gu, '');

/** يعيد الكتاب الموجود بالاسم والمؤلف نفسيهما (غير الكتاب المستثنى) أو undefined */
export const findNameDuplicate = <T extends { id: string; title: string; author?: string }>(
  books: T[], title: string, author: string, excludeId?: string
): T | undefined => {
  const t = norm(title), a = norm(author);
  if (!t) return undefined;
  return books.find(b => b.id !== excludeId && norm(b.title) === t && norm(b.author || '') === a);
};
