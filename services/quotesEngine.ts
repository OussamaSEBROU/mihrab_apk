// ╔══════════════════════════════════════════════════════════════════════════╗
// ║          مُحرِّك الاقتباسات الذكي — Intelligent Quotes Engine            ║
// ║  المصدر: رياض الحكمة | Source: Wisdom Gardens (Bilingual Edition)       ║
// ║  منطق اللغة: عربي → علماء عرب/مسلمون + مختارات غربية                   ║
// ║              إنجليزي → مفكرون غربيون فقط                                 ║
// ╚══════════════════════════════════════════════════════════════════════════╝

import type { Language } from '../types';

// ─── مكتبة الاقتباسات العربية: علماء مسلمون وعرب ───────────────────────────
// Arabic Library: Islamic & Arab scholars (primary) + selected Western translations
const ARABIC_SCHOLARS: string[] = [
  // الحديث النبوي الشريف
  '«طَلَبُ العِلمِ فَريضَةٌ على كُلِّ مُسلِم» — النبي محمد ﷺ',
  '«مَن سَلَكَ طَريقاً يَلتَمِسُ فيه عِلمًا سَهَّلَ اللهُ لَهُ طَريقاً إلى الجَنَّة» — النبي محمد ﷺ',
  '«فَضلُ العِلمِ خَيرٌ مِن فَضلِ العِبادَة» — النبي محمد ﷺ',

  // الإمام علي بن أبي طالب رضي الله عنه
  '«الجَهلُ يَهدِمُ بُيوتَ العِزِّ والكَرَم، والعِلمُ يَرفَعُ بَيتًا لا عِمادَ له» — الإمام علي بن أبي طالب',
  '«قيمَةُ كُلِّ امرِئٍ ما يُحسِنُه» — الإمام علي بن أبي طالب',
  '«ازدَد عِلمًا تَزدَد شَرَفًا، فالعُلَماءُ نُجومُ الأَرض» — الإمام علي بن أبي طالب',

  // الإمام الشافعي رحمه الله
  '«مَن لَم يَتَعَلَّم في صِغَرِه، لَم يَتَقَدَّم في كِبَرِه» — الإمام الشافعي',
  '«العِلمُ ما نَفَع، لَيسَ العِلمُ ما حُفِظ» — الإمام الشافعي',
  '«تَعَلَّمِ العِلمَ وعَلِّمهُ الناسَ، فإنَّ فيه عِمارَةَ الدُّنيا والآخِرَة» — الإمام الشافعي',

  // الإمام الغزالي رحمه الله
  '«قَدرُ العَقلِ على قَدرِ مَعرِفَةِ الحَق» — الإمام الغزالي',
  '«أَيُّها العاقِل! اِعمَل ولا تُماطِل، واِسمَع ولا تَجهَل، وتَعَلَّم ولا تَكسَل» — الإمام الغزالي',

  // ابن خلدون
  '«الكِتابُ مُعَلِّمٌ بلا عَصا ولا سَوط، ولا كَلِمَةِ غَضَب» — ابن خلدون',
  '«المَعرِفَةُ إنَّما تَنشَأُ مِنَ الفِكرِ الثَّاقِب، لا مِنَ الحِفظِ وحدَه» — ابن خلدون',

  // ابن القيم الجوزية
  '«القِراءَةُ تَمُدُّ الرُّوحَ بالحَياة، وتُنيرُ العَقلَ بالحَكمَة» — ابن القيم الجوزية',
  '«لا شَيءَ أَنفَعُ للقَلبِ مِن قِراءَةٍ مَع تَدَبُّر وتَفكُّر» — ابن القيم الجوزية',

  // المتنبي
  '«خَيرُ جَليسٍ في الأَنامِ كِتاب» — المتنبي',

  // عباس محمود العقاد
  '«الكُتُبُ لَيسَت أَكوامَ وَرَقٍ مَيِّتَة، إنَّها عُقولٌ تَعيشُ على الأَرفُف وتَنتَظِرُ مَن يُحاوِرُها» — عباس محمود العقاد',
  '«اِقرَأ كِتابًا جَيِّدًا ثَلاثَ مَرَّات، فهو أَنفَعُ مِن أَن تَقرَأَ ثَلاثَةَ كُتُب» — عباس محمود العقاد',

  // طه حسين
  '«القِراءَةُ للعَقلِ كالغِذاءِ للجَسَد، لا حَياةَ بِغَيرِها» — طه حسين',

  // ابن رشد
  '«العَقلُ الَّذي لا يُغذَّى بِالمَعرِفَةِ يَضمُر كالجِسمِ الَّذي يُحرَمُ مِنَ الطَّعام» — ابن رشد',

  // مختارات غربية مترجمة (تُقدَّم في السياق العربي)
  '«القِراءَةُ تُزَوِّدُ العَقلَ بِمَوادِّ المَعرِفَة، والتَّفكيرُ هو ما يَجعَلُ ما نَقرَأُه مِلكًا لَنا» — جون لوك',
  '«المَرءُ الَّذي لا يَقرَأُ لَيسَ أَفضَلَ حالًا مِنَ الَّذي لا يَستَطيعُ القِراءَة» — مارك توين',
  '«لَيسَ ثَمَّةَ سَفينَةٌ كالكِتابِ تَأخُذُنا إلى أَبعَدِ الأَماكِن» — إيميلي ديكنسون',
  '«التَّعَلُّمُ هو الشَّيءُ الوَحيدُ الَّذي لا يَستَطيعُ العَقلُ أَن يَتعَبَ مِنهُ أَبَدًا» — ليوناردو دا فينشي',
];

// ─── مكتبة الاقتباسات الإنجليزية: مفكرون غربيون فقط ────────────────────────
// English Library: Western thinkers exclusively
const ENGLISH_THINKERS: string[] = [
  // Philosophy & Literature
  '"Reading furnishes the mind only with materials of knowledge; it is thinking that makes what we read ours." — John Locke',
  '"The man who does not read has no advantage over the man who cannot read." — Mark Twain',
  '"There is no frigate like a book to take us leagues away." — Emily Dickinson',
  '"Learning never exhausts the mind." — Leonardo da Vinci',
  '"A reader lives a thousand lives before he dies. The man who never reads lives only one." — George R.R. Martin',
  '"Not all readers are leaders, but all leaders are readers." — Harry S. Truman',
  '"The reading of all good books is like a conversation with the finest minds of past centuries." — René Descartes',
  '"To read without reflecting is like eating without digesting." — Edmund Burke',
  '"Books are mirrors: we only see in them what we already have inside us." — Carlos Ruiz Zafón',
  '"A book is a dream that you hold in your hand." — Neil Gaiman',
  '"I cannot live without books." — Thomas Jefferson',
  '"Books are the quietest and most constant of friends; they are the most accessible and wisest of counselors." — Charles W. Eliot',

  // Science & Reason
  '"An investment in knowledge pays the best interest." — Benjamin Franklin',
  '"The more that you read, the more things you will know. The more that you learn, the more places you\'ll go." — Dr. Seuss',
  '"Education is not the filling of a pail, but the lighting of a fire." — W.B. Yeats',
  '"The only true wisdom is in knowing you know nothing." — Socrates',
  '"Wonder is the beginning of wisdom." — Aristotle',
  '"Employ your time in improving yourself by other men\'s writings, so that you shall gain easily what others have labored hard for." — Socrates',

  // Modern Thinkers
  '"Until I feared I would lose it, I never loved to read. One does not love breathing." — Harper Lee',
  '"Think before you speak. Read before you think." — Fran Lebowitz',
  '"The wisest mind has something yet to learn." — George Santayana',
  '"We read to know we are not alone." — C.S. Lewis',
  '"A capacity for wonder is essential to wisdom." — Alfred North Whitehead',
  '"Knowledge is power. Information is liberating. Education is the premise of progress." — Kofi Annan',
];

// ─── حالة الاقتباسات المستخدمة (لتجنب التكرار) ──────────────────────────────
let _usedArabicIndices: number[] = [];
let _usedEnglishIndices: number[] = [];

// ─── الدالة الرئيسية: جلب اقتباس فريد حسب اللغة ──────────────────────────
/**
 * يعيد اقتباسًا فريدًا مناسبًا للغة المختارة.
 * وضع العربية  → علماء عرب/مسلمون + مختارات غربية مترجمة.
 * وضع الإنجليزية → مفكرون غربيون فقط.
 */
export const getContextualQuote = (lang: Language): string => {
  if (lang === 'ar') {
    if (_usedArabicIndices.length >= ARABIC_SCHOLARS.length) _usedArabicIndices = [];
    let idx: number;
    do { idx = Math.floor(Math.random() * ARABIC_SCHOLARS.length); }
    while (_usedArabicIndices.includes(idx));
    _usedArabicIndices.push(idx);
    return ARABIC_SCHOLARS[idx];
  } else {
    if (_usedEnglishIndices.length >= ENGLISH_THINKERS.length) _usedEnglishIndices = [];
    let idx: number;
    do { idx = Math.floor(Math.random() * ENGLISH_THINKERS.length); }
    while (_usedEnglishIndices.includes(idx));
    _usedEnglishIndices.push(idx);
    return ENGLISH_THINKERS[idx];
  }
};

// ─── جلب عدة اقتباسات دفعة واحدة (للإشعارات المتعددة) ────────────────────
export const getBatchQuotes = (lang: Language, count: number): string[] => {
  const quotes: string[] = [];
  for (let i = 0; i < count; i++) quotes.push(getContextualQuote(lang));
  return quotes;
};

// ─── إعادة تعيين مؤشرات الاستخدام (عند بدء جلسة جديدة) ──────────────────
export const resetQuoteIndices = (): void => {
  _usedArabicIndices = [];
  _usedEnglishIndices = [];
};
