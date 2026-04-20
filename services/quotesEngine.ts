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

  // ═══════════════════════════════════════════════════════════════════════
  // الصنف الأول: مقولات الشرق الجديدة (100 مقولة إضافية)
  // New Eastern Quotes Expansion — 100 additional quotes
  // ═══════════════════════════════════════════════════════════════════════
  '«إذا لم يزدك العلم خُلُقاً، فقد تزيدك المعرفة شقاءً» — مصطفى السباعي',
  '«القراءة المنهجية هي التي تبني العقل، أما القراءة العشوائية فتمتع العقل ولا تبنيه» — عبد الكريم بكار',
  '«العلم بلا تقوى كالسراج في يد اللص، يزيد صاحبه قدرة على الأذى» — أبو حامد الغزالي',
  '«من يقرأ التاريخ لا يرى الحوادث صدفة، بل يراها قانوناً يسير وفق أسباب ومسببات» — ابن خلدون',
  '«لا تجعل يقينك شكاً، ولا علمك جهلاً، ولا ظنك حقاً» — علي بن أبي طالب',
  '«الفكر لا يحده حدود، والروح لا تحبسها جدران، والكتاب هو السبيل لكليهما» — عباس محمود العقاد',
  '«إن المعرفة ليست تكديساً للمعلومات، بل هي القدرة على استثمار الفكرة في الواقع» — مالك بن نبي',
  '«كلما أدبني الدهر أراني نقص عقلي، وإذا ما ازددت علماً زادني علماً بجهلي» — الشافعي',
  '«الأمة التي تقرأ لا تُهزم، والأمة التي تفكر لا تُستعبد» — محمد الغزالي',
  '«العلم يبني، والجهل يهدم، والحكمة هي التي تختار ما نبني وما نهدم» — أحمد شوقي',
  '«ليس الحكيم الذي يعرف الخير من الشر، بل الحكيم الذي يعرف خير الشرين» — ابن القيم',
  '«العلم هو السلم الذي نصعد به نحو ذواتنا قبل أن نصعد به نحو العالم» — إبراهيم الفقي',
  '«لا قيمة لعلم لا يلامس الروح، ولا معنى لحكمة لا تنعكس في السلوك» — جبران خليل جبران',
  '«إن ما تقرأه يحدد من أنت، وما تكتبه يحدد من ستكون» — ميخائيل نعيمة',
  '«العلم نور يضيء الدروب المظلمة، لكنه يحتاج لعين قادرة على الإبصار» — طه حسين',
  '«الحقيقة المطلقة لا يدركها إلا من تجرد من أهواء نفسه» — مصطفى محمود',
  '«الكلمة ليست مجرد حروف، بل هي طاقة تشعل في القلوب جذوة التغيير» — سيد قطب',
  '«القراءة هي السفر في عقول الرجال دون أن تغادر غرفتك» — علي الطنطاوي',
  '«الفكر العربي يحتاج لمزاوجة بين أصالة الحكمة ومعاصرة العلم» — زكي نجيب محمود',
  '«العقل وعاء يضيق بما يوضع فيه إلا وعاء العلم فإنه يتسع» — نجيب محفوظ',
  '«الحكيم هو من ملك زمام لسانه، والجاهل هو من أطلقه» — إبراهيم اليازجي',
  '«العلم بالشيء هو إدراك ماهيته في عالم الوجود وعالم العقل» — الفارابي',
  '«العلم لا يُنال بالراحة، والحكمة لا تُدرك بالتمني» — ابن رشد',
  '«الناس أربعة: رجل يدري ويدري أنه يدري فذلك عالم فاتبعوه» — الخليل بن أحمد',
  '«الكتاب هو الصديق الذي لا يخونك أبداً إذا أخلصت له» — الجاحظ',
  '«العلم علم القلب، فذاك العلم النافع» — الحسن البصري',
  '«القراءة هي حياة العقل، والكتابة هي تخليد لتلك الحياة» — أبو هلال العسكري',
  '«من طلب العلم لغير الله لم يزدد من الله إلا بعداً» — ابن حزم',
  '«العقل غريزة تقوى بالتجارب وتنمو بالتعلم» — الماوردي',
  '«في كل كتاب تقرأه، أنت تقابل روحاً جديدة تشاركك تجاربها» — مصطفى صادق الرافعي',
  '«الحكمة هي البصيرة التي تفرق بين الثابت والمتحول» — محمد عمارة',
  '«المستعد للشيء يدرك حقيقته بأدنى تنبيه» — ابن سينا',
  '«العلم لا يكتمل إلا بالشك، فبالشك تُعرف الحقائق» — الرازي',
  '«تعلّم حسن الاستماع كما تتعلم حسن الكلام» — ابن المقفع',
  '«الحكمة هي أعلى الفضائل الإنسانية وأقربها للكمال» — الكندي',
  '«الكتابة هي مرآة العصور التي لا تصدأ» — لسان الدين بن الخطيب',
  '«من لم يرتضِ بالعلم دليلاً، تاه في دروب الضلال» — ابن باجة',
  '«تعلموا العلم لتعرفوا الحق، واعرفوا الحق لتعملوا به» — عبد الحميد بن باديس',
  '«الموقف هو الحكمة الحقيقية، والكلمة هي سلاحها» — أمل دنقل',
  '«الحكمة هي صوت الصمت الذي يسبق العاصفة» — بدر شاكر السياب',
  '«في القراءة نجد ما فقدناه في الواقع، وفي الكتابة نصنع ما نتمناه» — محمود درويش',
  '«الذاكرة هي مخزن العلم، والنسيان هو عدوه الأول» — رضوى عاشور',
  '«القراءة هي فعل وجودي يعيد صياغة وعينا بالعالم» — واسيني الأعرج',
  '«الكتب هي أصدقاء الرحلة الذين لا يطلبون شيئاً ويعطون كل شيء» — أحلام مستغانمي',
  '«المعرفة مسؤولية ثقيلة، والحكمة هي القدرة على حملها» — مريد البرغوثي',
  '«الفكر النقدي هو المفتاح الحقيقي لفهم التاريخ» — هشام جعيط',
  '«لا يمكن تجديد العقل إلا من خلال إعادة قراءة التراث بعيون معاصرة» — محمد عابد الجابري',
  '«العلم هو الحرية، والجهل هو العبودية» — قاسم أمين',
  '«الحكيم هو من يبحث عن السؤال لا من يدعي امتلاك الجواب» — توفيق الحكيم',
  '«الأدب هو العلم بصورة فنية، والحكمة هي جوهرهما» — محمد حسين هيكل',
  '«الاستبداد يخشى العلم لأنه يكشف زيفه» — عبد الرحمن الكواكبي',
  '«القوة في العلم، والضعف في الجهل» — جمال الدين الأفغاني',
  '«إصلاح الفكر يبدأ من إصلاح مناهج التعلم» — محمد رشيد رضا',
  '«الفرق بين العالم والجاهل هو الفرق بين البصير والأعمى» — منصور الكيالي',
  '«الحكمة هي البوصلة التي توجه سفينة حياتك في بحر المتناقضات» — نبيل أحمد',
  '«العقل قادر على إدراك الخالق من خلال تأمل مخلوقاته» — ابن طفيل',
  '«العلم شرف لا يملكه إلا من صبر على مرارة طلبه» — أبو الأسود الدؤلي',
  '«أول العلم النية، ثم الاستماع، ثم الفهم، ثم العمل، ثم النشر» — عبد الله بن المبارك',
  '«الوقت هو مادة العلم، فمن أضاع وقته أضاع علمه» — ابن الجوزي',
  '«الحكمة هي معرفة الحق لصوابه، والباطل لفساده» — فخر الدين الرازي',
  '«الوسطية هي قمة الحكمة في الفهم والتطبيق» — يوسف القرضاوي',
  '«الفكر الإنساني نهر متدفق، والكتب هي ضفافه» — أحمد الوائلي',
  '«العلم وسيلة لإعمار الأرض وفق منهج الله» — محمد متولي الشعراوي',
  '«من قرأ كتاباً فكأنما عاش عمراً مع مؤلفه» — أبو حيان التوحيدي',
  '«الحكمة هي الكلمة المختصرة التي تغني عن الكتب الطويلة» — الثعالبي',
  '«العلم زينة للأغنياء ومال للفقراء» — الزمخشري',
  '«الحقيقة مرة، ولكنها الدواء الوحيد للجهل» — البيروني',
  '«من لم يسافر لم يقرأ إلا صفحة واحدة من كتاب الدنيا» — ابن بطوطة',
  '«غاية العلوم نفع الناس وتخفيف آلامهم» — الزهراوي',
  '«المنهج العلمي يبدأ بالشك وينتهي باليقين المبني على التجربة» — الحسن بن الهيثم',
  '«العلم والعدل هما جناحا النهضة» — صلاح الدين الأيوبي',
  '«العلم لا يُعطى إلا لمن أخلص له النية والطلب» — المنصور',
  '«المعرفة ذوق، والحكمة هي حال القلوب المستنيرة» — ابن العربي',
  '«الكتابة لغة العقل الصامتة» — القلقشندي',
  '«العلم شجرة ثمارها الحكمة والعمل الصالح» — ابن عساكر',
  '«الكلمات مفاتيح المعاني، والكتب خزائنها» — الفيروز آبادي',
  '«المجتمع الجاهل يقدس الشخصيات، والمجتمع الواعي يقدس الأفكار» — علي الوردي',
  '«الحكمة تكمن في العودة إلى الفطرة الصافية» — إبراهيم الكوني',
  '«القراءة هي الهروب الجميل من سجن الذات» — غادة السمان',
  '«الكتاب هو الرفيق الذي لا يمل حديثه ولا يتغير وده» — أمين الريحاني',
  '«الفكر المستنير هو الذي يرى النور في آخر النفق» — منصور خالد',
  '«العلم أمانة في عنق صاحبه، والحكمة هي حسن أداء الأمانة» — محمد سليم العوا',
  '«العلم لا يعرف حدوداً، والحكمة هي توظيفه لخدمة البشرية» — أحمد زويل',
  '«المعرفة هي الطريق الوحيد للوصول إلى النجوم» — فاروق الباز',
  '«العلم هو لغة عالمية توحد القلوب قبل العقول» — مجدي يعقوب',
  '«المثقف يجب أن يكون قلقاً دائماً، باحثاً عن الحقيقة لا عن الراحة» — إدوارد سعيد',
  '«الكلمة التي لا تزلزل الأرض تحت أقدام الطغاة هي كلمة ميتة» — نزار قباني',
  '«العلم الحقيقي هو الذي يحرر الإنسان من الخوف» — محمود محمد طه',
  '«القراءة هي السلاح الأقوى لكسر قيود التهميش» — فاطمة المرنيسي',
  '«العلم ليس بكثرة الرواية، وإنما العلم نور يضعه الله في القلب» — مالك بن أنس',
  '«من يطلب الحقيقة بصدق لا يخشى مراجعة أفكاره» — الحسن بن الهيثم',
  '«السعادة القصوى في التأمل العلمي والعمل الحكيم» — ابن باجة',
  '«الحكمة هي الانسجام مع قوانين الطبيعة الكلية» — ابن طفيل',
  '«القارئ الجيد هو من يقرأ ما بين السطور لا الحروف فقط» — عبد الكريم بكار',
  '«الجهل بالدين أخطر من الجهل بالعلم المادي» — محمد الغزالي',
  '«الحياة في سبيل فكرة هي الحياة الحقيقية» — سيد قطب',
  '«الحكيم هو من يرى الفتنة وهي مقبلة، والجاهل يراها وهي مدبرة» — مصطفى السباعي',
  '«العلم والدين وجهان لعملة واحدة هي الحقيقة» — مصطفى محمود',
  '«في حدائق الحكمة، نزرع الأفكار لنجني الأفعال العظيمة» — نبيل أحمد',
  '«المعرفة بلا عمل كالشجر بلا ثمر، والحكمة هي الثمرة المطلوبة» — ابن القيم',
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

  // ═══════════════════════════════════════════════════════════════════════
  // الصنف الثاني: مقولات الغرب الجديدة (100 مقولة إضافية)
  // New Western Quotes Expansion — 100 additional quotes
  // ═══════════════════════════════════════════════════════════════════════
  '"Be courageous enough to use your own mind." — Immanuel Kant',
  '"He who has a why to live can bear almost any how." — Friedrich Nietzsche',
  '"Reading is thinking with someone else\'s mind instead of your own." — Arthur Schopenhauer',
  '"The unexamined life is not worth living." — Socrates',
  '"The person who reads a lot thinks a lot, and the person who thinks a lot knows the truth." — Plato',
  '"The roots of education are bitter, but the fruit is sweet." — Aristotle',
  '"I think, therefore I am." — René Descartes',
  '"The goal of wisdom is not laughter or tears, but understanding." — Baruch Spinoza',
  '"It is better to be a Socrates dissatisfied than a pig satisfied." — John Stuart Mill',
  '"Custom is the great guide of human life, and wisdom is transcending custom." — David Hume',
  '"The real world of knowledge is the heart, not the mind alone." — Jean-Jacques Rousseau',
  '"I have never had a sorrow that an hour of reading did not relieve." — Montesquieu',
  '"The more you read, the more you know how little you know." — Voltaire',
  '"Books are the ships that pass through the vast seas of time." — Francis Bacon',
  '"Science is the knowledge of consequences and dependence of one fact upon another." — Thomas Hobbes',
  '"Education creates the person, and reading nourishes their soul." — John Locke',
  '"The person who knows everything does not need reading, but he has not been born yet." — Benjamin Franklin',
  '"Information is the currency of democracy, and wisdom is its value." — Thomas Jefferson',
  '"The best thing about books is that they allow us to talk with the dead." — Abraham Lincoln',
  '"Knowledge is gained by reading, but wisdom is gained by observation." — Ralph Waldo Emerson',
  '"Read the best books first, or you may not have a chance to read them at all." — Henry David Thoreau',
  '"Good reading is a protection against active ignorance." — Mark Twain',
  '"There is no mountain that cannot be climbed with knowledge, nor ocean that cannot be crossed with a book." — Ernest Hemingway',
  '"Reading is the key that opens the doors to everything." — Victor Hugo',
  '"Knowledge is the only thing that increases by sharing it with others." — Charles Dickens',
  '"Books show us what we are and what we can become." — Oscar Wilde',
  '"Never fear being odd in your thoughts, for every accepted idea was once considered strange." — Bertrand Russell',
  '"The important thing is not to be successful but to be of value." — Albert Einstein',
  '"If I have seen further, it is by standing on the shoulders of giants." — Isaac Newton',
  '"Simplicity is the ultimate sophistication." — Leonardo da Vinci',
  '"A book is the greatest human invention because it allows us to exchange ideas across the centuries." — Galileo Galilei',
  '"Science is human progress, and wisdom is directing that progress toward good." — Nikola Tesla',
  '"Intelligence is the ability to adapt to change." — Stephen Hawking',
  '"Science is a candle in the dark, and books are its wick." — Carl Sagan',
  '"If you cannot explain your idea to a six-year-old, you do not truly understand it." — Richard Feynman',
  '"There is nothing in life to fear, only things we do not understand." — Marie Curie',
  '"Science is careful observation and deep analysis of everything around us." — Charles Darwin',
  '"Writing is the release of psychic contents and the purification of the soul." — Sigmund Freud',
  '"You cannot change anything until you accept it, and knowledge is the first step toward acceptance." — Carl Jung',
  '"Knowledge is not centralized, it is distributed among all people." — Friedrich Hayek',
  '"Science is a means to understand reality, not to change it by force." — Milton Friedman',
  '"The function of education is to help students learn how to learn by themselves." — Noam Chomsky',
  '"We are drowning in information, but starving for wisdom." — Edward O. Wilson',
  '"The real power in the current century is the ability to distinguish truth from fiction." — Yuval Noah Harari',
  '"In a time of universal deceit, telling the truth is a revolutionary act." — George Orwell',
  '"Books are the best way to escape reality, and the best way to face it." — Aldous Huxley',
  '"A book must be the axe for the frozen sea inside us." — Franz Kafka',
  '"Knowledge without experience is merely information; wisdom is lived experience." — Paulo Coelho',
  '"Writing is the only way I know to not die completely." — Gabriel García Márquez',
  '"A library is a miniature universe containing every possibility of human thought." — Jorge Luis Borges',
  '"We are not born wise; we become so through learning and pain." — Simone de Beauvoir',
  '"We are condemned to freedom, and knowledge is what gives that freedom meaning." — Jean-Paul Sartre',
  '"Do not walk behind me, I may not lead. Walk beside me and be my friend in the search for truth." — Albert Camus',
  '"Science is a god for some, and a cow that gives milk for others." — Friedrich Schiller',
  '"Those who know no foreign languages know nothing of their own." — Johann Wolfgang von Goethe',
  '"The limits of my language mean the limits of my world." — Ludwig Wittgenstein',
  '"Thinking is beginning to question what seems obvious." — Martin Heidegger',
  '"Science does not think; the human mind is what gives science its meaning." — Hannah Arendt',
  '"Knowledge is power, and whoever owns the book owns part of that power." — Michel Foucault',
  '"There is nothing outside the text, and every reading is a rewriting." — Jacques Derrida',
  '"Reading is the act of chasing meanings that never end." — Umberto Eco',
  '"Classics are books that have never finished saying what they have to say." — Italo Calvino',
  '"Memory is resistance against forgetting, and books are the archive of that resistance." — Milan Kundera',
  '"If you only read the books everyone else reads, you will only think the way everyone else thinks." — Haruki Murakami',
  '"Books are a uniquely portable magic." — Stephen King',
  '"Words are our most inexhaustible source of magic, capable of both inflicting injury and remedying it." — J.K. Rowling',
  '"A library is a place of freedom, where you can explore any world you want." — Neil Gaiman',
  '"A word is the key that opens invisible locks." — Margaret Atwood',
  '"If there is a book you want to read and it has not been written yet, you must write it." — Toni Morrison',
  '"Literature is the last refuge of freedom in totalitarian systems." — Ismail Kadare',
  '"Reading is opening a second eye that sees what others cannot." — Orhan Pamuk',
  '"Education is an act of love, and therefore an act of courage." — Paulo Freire',
  '"Institutional learning may kill innate curiosity, so be careful." — Ivan Illich',
  '"The medium is the message, and the book is the greatest medium." — Marshall McLuhan',
  '"The illiterate of the 21st century will not be those who cannot read, but those who cannot unlearn." — Alvin Toffler',
  '"Science begins with a problem and ends with deeper, more beautiful problems." — Karl Popper',
  '"Science does not progress in steady steps, but in great intellectual leaps." — Thomas Kuhn',
  '"Science is the poetry of reality." — Richard Dawkins',
  '"Wisdom is the ability to act on the best available information." — Sam Harris',
  '"We think slowly to learn, and quickly to live." — Daniel Kahneman',
  '"Truth is rare and time is precious, so choose what you read carefully." — Yuval Noah Harari',
  '"Knowledge is power, but vulnerability is the door through which wisdom enters." — Brené Brown',
  '"Great leaders do not have the answers; they have the right questions." — Simon Sinek',
  '"Genius is the result of 10,000 hours of learning and practice." — Malcolm Gladwell',
  '"Wisdom is being able to rethink your old convictions." — Adam Grant',
  '"Read what you love until you love reading, then read what builds you." — Naval Ravikant',
  '"Wisdom is knowing what to ignore." — Nassim Nicholas Taleb',
  '"A book is a conversation with the smartest minds throughout history." — Jordan Peterson',
  '"Philosophy does not give answers; it shatters the wrong ones." — Slavoj Žižek',
  '"Good books tell us what we already know but never had the words to describe." — Alain de Botton',
  '"Reading is an exercise in human empathy." — Martha Nussbaum',
  '"Thought is the space in which we experience our freedom." — Judith Butler',
  '"The mind is like a parachute. It does not work if it is not open." — Frank Zappa',
  '"He not busy being born is busy dying." — Bob Dylan',
  '"Truth is what we search for, and science is our stumbling path toward it." — John Lennon',
  '"There is a crack in everything. That is how the light gets in." — Leonard Cohen',
  '"Knowledge is the only thing that makes you feel younger." — David Bowie',
  '"The way to get started is to quit talking and begin doing." — Walt Disney',
  '"Innovation distinguishes between a leader and a follower, and science is the fuel of innovation." — Steve Jobs',
  '"It does not matter how much money you have; what matters is how many ideas and books you have." — Bill Gates',
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
