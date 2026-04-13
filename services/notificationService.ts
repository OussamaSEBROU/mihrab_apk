// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║             خدمة الإشعارات الذكية — Smart Notification Service              ║
// ║  المهام:                                                                      ║
// ║  ١. إشعارات تحفيزية دورية (كل ٣٠ دقيقة) مع ملخص خروج شامل               ║
// ║  ٢. إشعارات ملخص دوري (كل ٤٨ ساعة + أسبوعي) → القسم الخامس في الداشبورد  ║
// ║  ٣. إشعارات إنجاز فورية عند بلوغ نجمة جديدة                                ║
// ║  ٤. محرك اقتباسات ذكي: علماء عرب/مسلمون للعربية | مفكرون غربيون للإنجليزية ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { LocalNotifications } from '@capacitor/local-notifications';
import { getContextualQuote, getBatchQuotes } from './quotesEngine';

interface NotificationStats {
  lastSessionMins: number;
  todayMins: number;
  totalMins: number;
  totalStars: number;
  totalBooks: number;
  bookBreakdown: { title: string; mins: number; stars: number }[];
  streak: number;
}

// ─── دالة مساعدة: التحقق من الصلاحية وإلغاء الإشعارات القديمة ──────────────
const ensurePermissionAndClear = async (): Promise<boolean> => {
  const perm = await LocalNotifications.checkPermissions();
  if (perm.display !== 'granted') {
    const result = await LocalNotifications.requestPermissions();
    if (result.display !== 'granted') return false;
  }
  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length > 0) {
    await LocalNotifications.cancel({ notifications: pending.notifications });
  }
  return true;
};

// ─── دالة مساعدة: إنشاء كائن إشعار بخصائص موحدة ────────────────────────────
const buildNotif = (id: number, title: string, body: string, delayMs: number): any => ({
  id,
  title,
  body,
  smallIcon: 'ic_stat_icon',
  largeIcon: 'ic_launcher',
  iconColor: '#ff0000',
  schedule: { at: new Date(Date.now() + delayMs), allowWhileIdle: true },
});

// ════════════════════════════════════════════════════════════════════════════════
// ① الإشعارات التحفيزية الرئيسية (تُرسل عند الخروج من التطبيق)
// ════════════════════════════════════════════════════════════════════════════════
export const scheduleMotivationalNotifications = async (
  lang: 'ar' | 'en',
  stats: NotificationStats
): Promise<void> => {
  try {
    if (!(await ensurePermissionAndClear())) return;
    const isAR = lang === 'ar';
    const notifications: any[] = [];
    let notifId = 100;

    // ── تسلسل ١: ملخص الخروج (خلال الدقيقتين الأوليين) ──────────────────────
    const sessionText = isAR
      ? `لبثتَ في رحاب المحراب ${stats.lastSessionMins} دقيقة من التأمل والقراءة الراقية. كلُّ لحظةٍ تقضيها في العلم هي لبنةٌ في صرح وعيك المتين.`
      : `You spent ${stats.lastSessionMins} minutes in the Sanctuary in focused intellectual pursuit. Every moment invested in knowledge strengthens the architecture of your consciousness.`;
    notifications.push(buildNotif(++notifId, isAR ? '✨ ختام جلسة التأمل المعرفي' : '✨ Intellectual Session Concluded', sessionText, 60_000));

    const todayText = isAR
      ? `📊 حصاد اليوم الفكري: ${stats.todayMins} دقيقة قراءة مركزة | ${stats.totalBooks} كتاب في المحراب | ${stats.totalStars} نجمة تحصيلية مضيئة`
      : `📊 Today's intellectual harvest: ${stats.todayMins} min focused reading | ${stats.totalBooks} volumes in Sanctuary | ${stats.totalStars} achievement stars`;
    notifications.push(buildNotif(++notifId, isAR ? '📈 الحصيلة اليومية الشاملة' : '📈 Comprehensive Daily Report', todayText, 75_000));

    if (stats.bookBreakdown.length > 0) {
      const mainBook = stats.bookBreakdown[0];
      const bookText = isAR
        ? `📜 تركيزك الأعمق اليوم كان في "${mainBook.title}" لمدة ${mainBook.mins} دقيقة — واصل الغوص في أعماق المعرفة.`
        : `📜 Your deepest focus today was on "${mainBook.title}" for ${mainBook.mins} minutes — continue diving into the depths of knowledge.`;
      notifications.push(buildNotif(++notifId, isAR ? '📖 تقرير التركيز الأدبي' : '📖 Literary Focus Report', bookText, 90_000));
    }

    const totalHours = (stats.totalMins / 60).toFixed(1);
    const cumulativeText = isAR
      ? `🏛️ بلغ رصيدك المعرفي التراكمي ${totalHours} ساعة. سلسلة الالتزام: ${stats.streak} يوم متواصل. أنت تبني إرثاً فكرياً لا يُمحى.`
      : `🏛️ Your cumulative knowledge capital: ${totalHours} hours. Consistency streak: ${stats.streak} consecutive days. You are building an intellectual legacy that endures.`;
    notifications.push(buildNotif(++notifId, isAR ? '🏆 الأثر التراكمي المعرفي' : '🏆 Cumulative Cognitive Impact', cumulativeText, 120_000));

    // ── تسلسل ٢: إشعارات كل ٣٠ دقيقة (١٢ إشعارًا لمدة ٦ ساعات) ─────────────
    const halfHourlyTypes = [
      'summary', 'quote', 'books', 'cumulative',
      'quote', 'motivation', 'quote', 'summary',
      'quote', 'books', 'cumulative', 'quote',
    ];

    // جلب اقتباسات دفعة واحدة من محرك الاقتباسات الذكي
    const quotesNeeded = halfHourlyTypes.filter(t => t === 'quote').length;
    const batchQuotes = getBatchQuotes(lang, quotesNeeded);
    let quotePointer = 0;

    for (let i = 0; i < halfHourlyTypes.length; i++) {
      const type = halfHourlyTypes[i];
      const delayMs = (i + 1) * 30 * 60 * 1000;
      let title = '';
      let body = '';

      switch (type) {
        case 'summary':
          title = isAR ? '📊 ملخص أدائك المعرفي' : '📊 Knowledge Performance Summary';
          body = isAR
            ? `استثمرت ${stats.todayMins} دقيقة اليوم في القراءة المركزة. محرابك يضم ${stats.totalBooks} مجلد. كل صفحة تقرؤها تُعيد تشكيل عقلك.`
            : `You invested ${stats.todayMins} minutes today in focused reading. Your sanctuary holds ${stats.totalBooks} volumes. Every page restructures your mind.`;
          break;

        case 'quote':
          // ← محرك الاقتباسات الذكي: عربي = علماء إسلاميون | إنجليزي = مفكرون غربيون
          title = isAR ? '🕯️ تأمُّلٌ في المحراب' : '🕯️ Sanctuary Contemplation';
          body = batchQuotes[quotePointer++] ?? getContextualQuote(lang);
          break;

        case 'books':
          if (stats.bookBreakdown.length > 0) {
            const rndBook = stats.bookBreakdown[Math.floor(Math.random() * stats.bookBreakdown.length)];
            title = isAR ? '📚 نداء المخطوطات' : '📚 The Manuscripts Calling';
            body = isAR
              ? `كتاب "${rndBook.title}" ينتظرك. قضيت فيه ${rndBook.mins} دقيقة حتى الآن — الحكمة لا تنضب لمن يواصل.`
              : `"${rndBook.title}" awaits you. You've spent ${rndBook.mins} minutes so far — wisdom never runs dry for those who persist.`;
          } else {
            title = isAR ? '📚 ابدأ رحلتك الفكرية' : '📚 Begin Your Intellectual Journey';
            body = getContextualQuote(lang);
          }
          break;

        case 'cumulative': {
          const totalH = (stats.totalMins / 60).toFixed(1);
          title = isAR ? '🏛️ رصيدك التراكمي' : '🏛️ Cumulative Capital';
          body = isAR
            ? `مجموع ساعات التأمل الفكري: ${totalH} ساعة | النجوم: ${stats.totalStars} | سلسلة الالتزام: ${stats.streak} يوم. أنت من الـ 3% الذين يصنعون الفرق.`
            : `Total intellectual hours: ${totalH}h | Stars: ${stats.totalStars} | Streak: ${stats.streak} days. You are among the 3% who make the difference.`;
          break;
        }

        case 'motivation':
          title = isAR ? '🔥 إشعال الحماس' : '🔥 Igniting Passion';
          body = isAR
            ? 'تذكّر: القراءة ليست هواية، بل هي تمرين يومي لعضلة الحكمة. استمر في بناء صرح معرفتك، فالعالَمُ بحاجة إلى عقلك المستنير.'
            : 'Remember: Reading is not a hobby — it is daily exercise for the wisdom muscle. Keep building your knowledge monument. The world needs your enlightened mind.';
          break;
      }

      notifications.push(buildNotif(++notifId, title, body, delayMs));
    }

    await LocalNotifications.schedule({ notifications });
  } catch (e) {
    console.error('Advanced notifications scheduling failed:', e);
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// ② إشعار الملخص الدوري (كل ٤٨ ساعة / أسبوعي) ← جديد
// ════════════════════════════════════════════════════════════════════════════════
export const scheduleSummaryNotification = async (
  lang: 'ar' | 'en',
  summary: {
    period: '48h' | 'weekly';
    totalMins: number;
    topBooks: { title: string; mins: number; stars: number }[];
    activeShelves: string[];
    streak: number;
    totalStars: number;
  },
  period: '48h' | 'weekly'
): Promise<void> => {
  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') return;

    const isAR = lang === 'ar';
    const totalHours = (summary.totalMins / 60).toFixed(1);
    const topBookName = summary.topBooks[0]?.title ?? (isAR ? 'لا يوجد' : 'None');
    const activeShelvesList = summary.activeShelves.slice(0, 2).join('، ');

    let title = '';
    let body = '';

    if (period === '48h') {
      title = isAR ? '🧠 تقرير ٤٨ ساعة | التحليل الذكي' : '🧠 48-Hour Intelligence Report';
      body = isAR
        ? `خلال الـ ٤٨ ساعة الماضية: ${totalHours} ساعة قراءة | أبرز كتاب: ${topBookName} | الأرفف النشطة: ${activeShelvesList || 'غير محدد'} | النجوم: ${summary.totalStars}`
        : `Last 48 hours: ${totalHours}h reading | Top book: "${topBookName}" | Active shelves: ${activeShelvesList || 'N/A'} | Stars earned: ${summary.totalStars}`;
    } else {
      title = isAR ? '📅 تقريرك الأسبوعي | المحراب' : '📅 Weekly Sanctuary Report';
      body = isAR
        ? `أسبوعٌ معرفي شامل: ${totalHours} ساعة قراءة | أبرز مخطوطة: ${topBookName} | سلسلة الالتزام: ${summary.streak} يوم | مجموع النجوم: ${summary.totalStars}`
        : `A full week of knowledge: ${totalHours}h reading | Top manuscript: "${topBookName}" | Consistency streak: ${summary.streak} days | Total stars: ${summary.totalStars}`;
    }

    await LocalNotifications.schedule({
      notifications: [buildNotif(period === '48h' ? 999 : 998, title, body, 5_000)],
    });
  } catch (e) {
    console.error('Summary notification failed:', e);
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// ③ إشعار الإنجاز الفوري عند بلوغ نجمة جديدة ← جديد
// ════════════════════════════════════════════════════════════════════════════════
export const scheduleAchievementNotification = async (
  lang: 'ar' | 'en',
  starNumber: number,
  bookTitle: string
): Promise<void> => {
  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') return;

    const isAR = lang === 'ar';
    const starEmojis = ['⭐', '⭐⭐', '⭐⭐⭐', '🌟', '🌟🌟', '✨', '🏆'];
    const emoji = starEmojis[Math.min(starNumber - 1, starEmojis.length - 1)];

    const badge_ar = ['قارئ', 'مكتسب العادة', 'باحث', 'فجر المعرفة', 'هيكل معرفي', 'مثقف', 'نخبة المثقفين'];
    const badge_en = ['Reader', 'Habit Former', 'Scholar', 'Dawn of Knowledge', 'Cognitive Structure', 'Intellectual', 'Elite Intellectual'];

    const badgeName = isAR
      ? (badge_ar[starNumber - 1] ?? 'نخبة')
      : (badge_en[starNumber - 1] ?? 'Elite');

    const title = isAR
      ? `${emoji} نجمة جديدة في "${bookTitle}"!`
      : `${emoji} New Star Achieved in "${bookTitle}"!`;

    const body = isAR
      ? `أحرزت شارة "${badgeName}" — النجمة رقم ${starNumber}. كل نجمة هي برهانٌ على إرادتك المعرفية الصارمة. واصل المسيرة!`
      : `You've earned the "${badgeName}" badge — Star #${starNumber}. Each star is proof of your relentless intellectual will. Keep going!`;

    await LocalNotifications.schedule({
      notifications: [buildNotif(900 + starNumber, title, body, 2_000)],
    });
  } catch (e) {
    console.error('Achievement notification failed:', e);
  }
};
