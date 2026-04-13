
import { LocalNotifications } from '@capacitor/local-notifications';

// ===== UTILITY: GMT-BASED DATE HELPERS =====
export const getGMTDate = (): Date => {
  const now = new Date();
  return new Date(now.getTime() + now.getTimezoneOffset() * 60000);
};

export const getGMTDateString = (): string => {
  return getGMTDate().toISOString().split('T')[0];
};

export const getGMTTimestamp = (): number => {
  return getGMTDate().getTime();
};

// ===== ELITE MOTIVATIONAL QUOTES - 200+ مقولات من كتاب حدائق الحكمة =====

// صنف مقولات الشرق (100 مقولة) — للمستخدم العربي
const EASTERN_QUOTES: { ar: string; en: string }[] = [
  { ar: "الحكمة هي فعل ما ينبغي، على الوجه الذي ينبغي، في الوقت الذي ينبغي. — ابن القيم", en: "\"Wisdom is doing what is right, in the right way, at the right time.\" — Ibn Al-Qayyim" },
  { ar: "الحكمة هي المعرفة بالدين، والفهم الذي هو سجية ونور من الله. — الإمام مالك", en: "\"Wisdom is knowledge of religion, and understanding that is a natural gift and light from God.\" — Imam Malik" },
  { ar: "الحكمة هي تعليم الحقائق التي تنظم المجتمع. — الشيخ محمد الغزالي", en: "\"Wisdom is teaching the truths that organize society.\" — Sheikh Muhammad Al-Ghazali" },
  { ar: "الحكمة تتجاوز المعلومات الجزئية إلى المفاهيم الكلية. — د. عبد الكريم بكار", en: "\"Wisdom transcends partial information to universal concepts.\" — Dr. Abdel Karim Bakkar" },
  { ar: "الحكمة تعني وضع الشيء في موضعه. — د. عبد الكريم بكار", en: "\"Wisdom means putting things in their proper place.\" — Dr. Abdel Karim Bakkar" },
  { ar: "لا يفتخر القارئ بكثرة ما قرأ، بل بما استوعبه مما قرأ. — د. عبد الكريم بكار", en: "\"A reader should not boast of how much they read, but of how much they understood.\" — Dr. Abdel Karim Bakkar" },
  { ar: "الحكمة هبة عظيمة تعين صاحبها على إدراك الغايات والأسباب. — نبيل أحمد", en: "\"Wisdom is a great gift that helps its owner perceive purposes and causes.\" — Nabil Ahmad" },
  { ar: "الكتاب هو الجليس الذي لا يطريك، والصديق الذي لا يغريك. — الجاحظ", en: "\"A book is the companion that does not flatter you, and the friend that does not tempt you.\" — Al-Jahiz" },
  { ar: "أعز مكان في الدنا سرج سابح، وخير جليس في الزمان كتاب. — المتنبي", en: "\"The best companion in the world is a book.\" — Al-Mutanabbi" },
  { ar: "العلم بلا عمل جنون، والعمل بلا علم لا يكون. — أبو حامد الغزالي", en: "\"Knowledge without action is madness, and action without knowledge is void.\" — Abu Hamid Al-Ghazali" },
  { ar: "العلم لا ينمو إلا في بيئة الحرية والتفكير المستقل. — ابن خلدون", en: "\"Knowledge only grows in an environment of freedom and independent thought.\" — Ibn Khaldun" },
  { ar: "اللحاق بالحكمة هو غاية الإنسان. — ابن رشد", en: "\"Pursuing wisdom is the ultimate goal of mankind.\" — Ibn Rushd" },
  { ar: "العلم صيد والكتابة قيده، فقيد صيودك بالحبال الواثقة. — الشافعي", en: "\"Knowledge is prey and writing is its bond; tie your catch with strong ropes.\" — Al-Shafi'i" },
  { ar: "من أراد الدنيا فعليه بالعلم، ومن أراد الآخرة فعليه بالعلم. — الشافعي", en: "\"Whoever wants the world must seek knowledge, and whoever wants the hereafter must seek knowledge.\" — Al-Shafi'i" },
  { ar: "العلم يحرسه صاحبه، والمال يحرسه صاحبه. — علي بن أبي طالب", en: "\"Knowledge guards its owner, while its owner guards wealth.\" — Ali ibn Abi Talib" },
  { ar: "العلم يرفع بيوتاً لا عماد لها، والجهل يهدم بيت العز والكرم. — أحمد شوقي", en: "\"Knowledge raises houses without pillars, and ignorance destroys houses of honor.\" — Ahmad Shawqi" },
  { ar: "القراءة وحدها هي التي تُعطي الإنسان الواحد أكثر من حياة واحدة. — عباس محمود العقاد", en: "\"Reading alone gives a single person more than one life.\" — Abbas Mahmoud Al-Aqqad" },
  { ar: "لست أهوى القراءة لأكتب، بل أهوى القراءة لأعيش. — عباس محمود العقاد", en: "\"I do not love reading to write, but I love reading to live.\" — Abbas Mahmoud Al-Aqqad" },
  { ar: "العلم كالماء والهواء حق لكل إنسان. — طه حسين", en: "\"Knowledge, like water and air, is a right for every human.\" — Taha Hussein" },
  { ar: "العلم هو محاولة الإنسان لفهم القوانين التي وضعها الله في الكون. — مصطفى محمود", en: "\"Science is man's attempt to understand the laws God placed in the universe.\" — Mustafa Mahmoud" },
  { ar: "الكتاب هو روح الكاتب التي لا تموت. — مصطفى صادق الرافعي", en: "\"A book is the writer's soul that never dies.\" — Mustafa Sadiq Al-Rafi'i" },
  { ar: "القراءة هي المفتاح الذي يفتح أبواب العقول. — إبراهيم الفقي", en: "\"Reading is the key that opens the doors of minds.\" — Ibrahim Al-Feki" },
  { ar: "المعرفة ليست هي القوة، بل تطبيق المعرفة هو القوة. — إبراهيم الفقي", en: "\"Knowledge is not power; applying knowledge is power.\" — Ibrahim Al-Feki" },
  { ar: "الكاتب لا يموت ما دام فكره حياً في كتبه. — سيد قطب", en: "\"A writer does not die as long as their thought lives in their books.\" — Sayyid Qutb" },
  { ar: "القراءة هي التي جعلتني أدرك أن العالم أوسع من غرفتي. — نجيب محفوظ", en: "\"Reading made me realize that the world is wider than my room.\" — Naguib Mahfouz" },
  { ar: "الكتاب صديق لا يخون، ومعلم لا يمل. — ميخائيل نعيمة", en: "\"A book is a friend that does not betray, and a teacher that does not tire.\" — Mikhail Naimy" },
  { ar: "الحكمة هي أن تدرك أنك لا تزال طفلاً في مدرسة الحياة. — جبران خليل جبران", en: "\"Wisdom is realizing that you are still a child in the school of life.\" — Khalil Gibran" },
  { ar: "العلم الحقيقي هو الذي يجعلك تشك في كل ما ورثته من أفكار. — علي الوردي", en: "\"True knowledge makes you doubt everything you inherited.\" — Ali Al-Wardi" },
  { ar: "الكتاب هو الأداة التي تنقل الحضارة من جيل إلى جيل. — مالك بن نبي", en: "\"A book is the tool that transfers civilization from generation to generation.\" — Malek Bennabi" },
  { ar: "الحكمة هي البصيرة التي ترى الأشياء على حقيقتها. — محمد إقبال", en: "\"Wisdom is the insight that sees things as they truly are.\" — Muhammad Iqbal" },
  { ar: "الكتابة هي صرخة الروح في وجه الصمت. — بدر شاكر السياب", en: "\"Writing is the soul's cry against silence.\" — Badr Shakir Al-Sayyab" },
  { ar: "القراءة هي نوع من أنواع الحرية. — محمود درويش", en: "\"Reading is a form of freedom.\" — Mahmoud Darwish" },
  { ar: "الكتاب هو الجسر الذي نمر عبره إلى الآخر. — أدونيس", en: "\"A book is the bridge through which we cross to the other.\" — Adonis" },
  { ar: "الحكيم هو من يعرف متى يتحدث وكيف يتحدث. — إبراهيم اليازجي", en: "\"The wise one knows when to speak and how to speak.\" — Ibrahim Al-Yaziji" },
  { ar: "الكتاب هو السفر في الزمان والمكان وأنت جالس في مكانك. — أمين الريحاني", en: "\"A book is traveling through time and space while sitting in your place.\" — Amin Al-Rihani" },
  { ar: "غاية العلم هي العمل بالفضيلة. — الفارابي", en: "\"The purpose of knowledge is to practice virtue.\" — Al-Farabi" },
  { ar: "الحكمة هي استكمال النفس الإنسانية بالتصورات الكلية. — ابن سينا", en: "\"Wisdom is perfecting the human soul through universal concepts.\" — Ibn Sina" },
  { ar: "الحكمة هي العلم بحقائق الأشياء قدر طاقة الإنسان. — الكندي", en: "\"Wisdom is knowledge of the realities of things to the extent of human capacity.\" — Al-Kindi" },
  { ar: "الكتاب هو المعلم الذي لا يغضب، والناصح الذي لا يحابي. — ابن المقفع", en: "\"A book is the teacher that does not anger, and the advisor that does not show favoritism.\" — Ibn Al-Muqaffa" },
  { ar: "القراءة هي حياة ثانية تُضاف إلى عمر الإنسان. — أبو حيان التوحيدي", en: "\"Reading is a second life added to a person's age.\" — Abu Hayyan Al-Tawhidi" },
  { ar: "لا فائدة من كتاب لا يغير فيك شيئاً. — ابن حزم الأندلسي", en: "\"There is no benefit from a book that changes nothing in you.\" — Ibn Hazm" },
  { ar: "الكتابة هي تخليد للفكر من الضياع. — لسان الدين بن الخطيب", en: "\"Writing is immortalizing thought from being lost.\" — Lisan Al-Din ibn Al-Khatib" },
  { ar: "القراءة هي رياض العقول وبساتين الفكر. — الطنطاوي", en: "\"Reading is the garden of minds and orchards of thought.\" — Al-Tantawi" },
  { ar: "الحكيم من اتعظ بغيره، والجاهل من اتعظ بنفسه. — مصطفى السباعي", en: "\"The wise learn from others, the foolish learn from themselves.\" — Mustafa Al-Siba'i" },
  { ar: "الحكمة هي العقل الملتزم بالوحي. — محمد عمارة", en: "\"Wisdom is reason committed to revelation.\" — Muhammad Imara" },
  { ar: "العلم هو المنهج، وليس مجرد معلومات مرصوصة. — زكي نجيب محمود", en: "\"Science is methodology, not just stacked information.\" — Zaki Naguib Mahmoud" },
  { ar: "الجهل هو عدو الحرية الأول. — عبد الرحمن الكواكبي", en: "\"Ignorance is the first enemy of freedom.\" — Abdel Rahman Al-Kawakibi" },
  { ar: "العلم هو الروح المحركة للأمم. — جمال الدين الأفغاني", en: "\"Knowledge is the driving spirit of nations.\" — Jamal Al-Din Al-Afghani" },
  { ar: "الحكمة هي ثمرة الإيمان والعمل الصالح. — محمد رشيد رضا", en: "\"Wisdom is the fruit of faith and righteous deeds.\" — Muhammad Rashid Rida" },
  { ar: "الحكمة هي أعلى درجات السعادة الإنسانية. — ابن باجة", en: "\"Wisdom is the highest degree of human happiness.\" — Ibn Bajja" },
  { ar: "العلم هو الركن الأساسي في بناء الأسرة والمجتمع. — قاسم أمين", en: "\"Knowledge is the cornerstone in building family and society.\" — Qasim Amin" },
  { ar: "العلم هو الذي يحرر العقول من الخرافات. — عبد الحميد بن باديس", en: "\"Knowledge frees minds from superstitions.\" — Abdelhamid Ben Badis" },
  { ar: "الكتابة هي محاولة لاستعادة الفردوس المفقود. — إبراهيم الكوني", en: "\"Writing is an attempt to reclaim the lost paradise.\" — Ibrahim Al-Koni" },
  { ar: "الكتابة هي نوع من أنواع المقاومة. — أمل دنقل", en: "\"Writing is a form of resistance.\" — Amal Dunqul" },
  { ar: "الكتب هي حقائب السفر التي لا تحتاج لتذاكر. — غادة السمان", en: "\"Books are travel bags that need no tickets.\" — Ghada Al-Samman" },
  { ar: "نكتب لكي لا ننسى، ونقرأ لكي نعيش أكثر من حياة. — أحلام مستغانمي", en: "\"We write so we don't forget, and we read to live more than one life.\" — Ahlam Mosteghanemi" },
  { ar: "الكتاب هو الملاذ الأخير في عالم مضطرب. — واسيني الأعرج", en: "\"A book is the last refuge in a turbulent world.\" — Wasini Al-Araj" },
  { ar: "الحكمة هي ميزان العدل في القول والفعل. — محمد حسين هيكل", en: "\"Wisdom is the balance of justice in word and deed.\" — Muhammad Husayn Haykal" },
  { ar: "الحكمة هي أن تعرف متى تكون صامتاً ومتى تتكلم. — توفيق الحكيم", en: "\"Wisdom is knowing when to be silent and when to speak.\" — Tawfiq Al-Hakim" },
  { ar: "العلم يزداد بالإنفاق منه، والمال ينقص. — منصور الكيالي", en: "\"Knowledge increases by spending it, while wealth decreases.\" — Mansour Al-Kayali" },
  { ar: "القراءة الواعية هي حجر الزاوية في بناء الإنسان. — نبيل أحمد", en: "\"Conscious reading is the cornerstone in building a person.\" — Nabil Ahmad" },
  { ar: "العلم بالحقيقة هو أسمى لذات النفس الإنسانية. — ابن طفيل", en: "\"Knowledge of truth is the highest pleasure of the human soul.\" — Ibn Tufayl" },
  { ar: "العلوم أقفال والأسئلة مفاتيحها. — الخليل بن أحمد", en: "\"Sciences are locks and questions are their keys.\" — Al-Khalil ibn Ahmad" },
  { ar: "العلم زين للفتى، والجهل شين للفتى. — أبو الأسود الدؤلي", en: "\"Knowledge adorns the youth, and ignorance shames the youth.\" — Abu Al-Aswad Al-Du'ali" },
  { ar: "لا يزال المرء عالماً ما طلب العلم، فإذا ظن أنه قد علم فقد جهل. — الحسن البصري", en: "\"A person remains learned as long as they seek knowledge; when they think they know, they become ignorant.\" — Al-Hasan Al-Basri" },
  { ar: "لا أعلم بعد النبوة درجة أفضل من بث العلم. — عبد الله بن المبارك", en: "\"I know of no rank after prophethood better than spreading knowledge.\" — Abdullah ibn Al-Mubarak" },
  { ar: "من أراد ألا ينقطع عمله بعد موته فلينشر العلم. — ابن الجوزي", en: "\"Whoever wants their work to continue after death should spread knowledge.\" — Ibn Al-Jawzi" },
  { ar: "الحكمة هي العلم بالأشياء كما هي في الواقع. — فخر الدين الرازي", en: "\"Wisdom is knowledge of things as they are in reality.\" — Fakhr Al-Din Al-Razi" },
  { ar: "الحكمة هي مطابقة القول للواقع والعمل للمصلحة. — ابن تيمية", en: "\"Wisdom is matching words to reality and actions to benefit.\" — Ibn Taymiyyah" },
  { ar: "الحكمة هي وضع الشيء في مكانه وزمانه وبمقدار محدد. — يوسف القرضاوي", en: "\"Wisdom is placing things in their proper place, time, and measure.\" — Yusuf Al-Qaradawi" },
  { ar: "الكتاب هو الأنيس في الوحشة، والمعين في الغربة. — أحمد الوائلي", en: "\"A book is a companion in loneliness and an aid in exile.\" — Ahmad Al-Waeli" },
  { ar: "العلم هو الذي يفسر آيات الله في الآفاق وفي الأنفس. — محمد متولي الشعراوي", en: "\"Knowledge interprets God's signs in the horizons and in the souls.\" — Muhammad Metwalli Al-Sha'rawi" },
  { ar: "لا نهضة بلا علم، ولا علم بلا عقل نقدي. — محمد عابد الجابري", en: "\"No renaissance without knowledge, and no knowledge without critical reason.\" — Muhammad Abed Al-Jabri" },
  { ar: "الحكمة التاريخية هي فهم الماضي لبناء المستقبل. — هشام جعيط", en: "\"Historical wisdom is understanding the past to build the future.\" — Hichem Djait" },
  { ar: "الكتابة هي ترتيب للفوضى في داخلنا. — مريد البرغوثي", en: "\"Writing is organizing the chaos within us.\" — Mourid Barghouti" },
  { ar: "نقرأ لكي نفهم أننا لسنا وحدنا في هذا العالم. — رضوى عاشور", en: "\"We read to understand that we are not alone in this world.\" — Radwa Ashour" },
  { ar: "القراءة هي المفتاح الذي نفتح به مغاليق العقول. — علي الطنطاوي", en: "\"Reading is the key with which we open locked minds.\" — Ali Al-Tantawi" },
  { ar: "العلم لا يعطيك بعضه حتى تعطيه كلك. — أبو هلال العسكري", en: "\"Knowledge will not give you part of itself until you give it all of yourself.\" — Abu Hilal Al-Askari" },
  { ar: "الحكمة بصيرة مستنيرة تهدي للصائب من الأعمال. — ابن قيم الجوزية", en: "\"Wisdom is an enlightened insight that guides to righteous deeds.\" — Ibn Qayyim Al-Jawziyyah" },
  { ar: "العلم هو الضياء الذي يبدد ظلمات الجهل. — الخوارزمي", en: "\"Knowledge is the light that dispels the darkness of ignorance.\" — Al-Khwarizmi" },
  { ar: "غاية ما يبلغه الحكيم هو معرفة قدر جهله. — الرازي", en: "\"The pinnacle a wise person reaches is knowing the extent of their ignorance.\" — Al-Razi" },
  { ar: "من بخل بعلمه كان كمن كتم نوراً في ليل مظلم. — ابن حزم", en: "\"One who hoards knowledge is like one who conceals light in a dark night.\" — Ibn Hazm" },
  { ar: "الناس إلى العلم أحوج منهم إلى الطعام والشراب. — أحمد بن حنبل", en: "\"People need knowledge more than they need food and drink.\" — Ahmad ibn Hanbal" },
  { ar: "لا تجد في الكتب إلا ما وضعه الناس، فكن حكيماً في الانتقاء. — ابن المقفع", en: "\"You only find in books what people put there, so be wise in selection.\" — Ibn Al-Muqaffa" },
  { ar: "الكتابة هي لسان اليد، وسفير العقل. — القلقشندي", en: "\"Writing is the tongue of the hand and the ambassador of the mind.\" — Al-Qalqashandi" },
  { ar: "الكتاب هو الجليس الذي لا يمل، والرفيق الذي لا يميل. — الثعالبي", en: "\"A book is the companion that never bores, and the friend that never sways.\" — Al-Tha'alibi" },
  { ar: "الحكمة هي أن ترى العواقب قبل وقوعها. — لسان الدين بن الخطيب", en: "\"Wisdom is seeing consequences before they occur.\" — Lisan Al-Din ibn Al-Khatib" },
  { ar: "العلم بحر لا ساحل له، والحكمة سفينته. — ابن العربي", en: "\"Knowledge is a shoreless sea, and wisdom is its ship.\" — Ibn Arabi" },
  { ar: "العلم من المهد إلى اللحد. — ابن عساكر", en: "\"Knowledge from the cradle to the grave.\" — Ibn Asakir" },
  { ar: "العلم أفضل من المال، لأن العلم يحرسك والمال تحرسه. — المأمون", en: "\"Knowledge is better than wealth, for knowledge guards you while you guard wealth.\" — Al-Ma'mun" },
  { ar: "الحقيقة تطلب لذاتها، والعلم هو طريقها. — الحسن بن الهيثم", en: "\"Truth is sought for its own sake, and knowledge is its path.\" — Ibn Al-Haytham" },
  { ar: "لا يزال العلم في الناس ما داموا يطلبونه. — المنصور", en: "\"Knowledge remains among people as long as they seek it.\" — Al-Mansur" },
  { ar: "بالعلم والعدل تُبنى الممالك. — صلاح الدين الأيوبي", en: "\"With knowledge and justice, kingdoms are built.\" — Saladin" },
  { ar: "من يبحث عن الحقيقة عليه أن يجعل نفسه خصماً لكل ما يقرأ. — ابن الهيثم", en: "\"Whoever seeks truth must make themselves an opponent of everything they read.\" — Ibn Al-Haytham" },
  { ar: "الطب علم، والحكمة هي تطبيقه برحمة. — الزهراوي", en: "\"Medicine is science, and wisdom is applying it with mercy.\" — Al-Zahrawi" },
  { ar: "المعرفة هي جوهر الوجود الإنساني. — البيروني", en: "\"Knowledge is the essence of human existence.\" — Al-Biruni" },
  { ar: "السفر علم يقرأ فيه الإنسان كتاب الأرض. — ابن بطوطة", en: "\"Travel is knowledge in which one reads the book of the Earth.\" — Ibn Battuta" },
  { ar: "العلم زينة العقل وجمال الروح. — الزمخشري", en: "\"Knowledge is the adornment of the mind and the beauty of the soul.\" — Al-Zamakhshari" },
  { ar: "الكتاب هو القاموس الذي يترجم لنا أفكار العالم. — الفيروز آبادي", en: "\"A book is the dictionary that translates the world's ideas for us.\" — Al-Fairuzabadi" },
  { ar: "الحكمة هي خلاصة التجارب الإنسانية المقطرة. — نبيل أحمد", en: "\"Wisdom is the distilled essence of human experience.\" — Nabil Ahmad" },
];

// صنف مقولات الغرب (100 مقولة) — للمستخدم الإنجليزي
const WESTERN_QUOTES: { ar: string; en: string }[] = [
  { ar: "الصدق هو الفصل الأول من كتاب الحكمة. — توماس جيفرسون", en: "\"Honesty is the first chapter of the book of wisdom.\" — Thomas Jefferson" },
  { ar: "أولى خطواتك إلى الحكمة هي أن تتساءل عن كل شيء. — جورج برنارد شو", en: "\"The first step to wisdom is questioning everything.\" — George Bernard Shaw" },
  { ar: "خطوتك التالية في الحكمة هي أن تتناغم مع كل شيء. — جورج برنارد شو", en: "\"The next step in wisdom is to harmonize with everything.\" — George Bernard Shaw" },
  { ar: "القراءة تجعل الإنسان كاملاً، والمناقشة تجعله مستعداً، والكتابة تجعله دقيقاً. — فرانسيس بيكون", en: "\"Reading makes a full man, conference a ready man, and writing an exact man.\" — Francis Bacon" },
  { ar: "المعرفة هي القوة. — فرانسيس بيكون", en: "\"Knowledge is power.\" — Francis Bacon" },
  { ar: "قراءة الكتب الجيدة هي بمثابة التحاور مع أسمى عقول القرون الماضية. — رينيه ديكارت", en: "\"Reading good books is like having a conversation with the finest minds of past centuries.\" — René Descartes" },
  { ar: "الحكمة هي كمال العقل. — أرسطو", en: "\"Wisdom is the perfection of the mind.\" — Aristotle" },
  { ar: "الحكمة تبدأ من الاندهاش. — سقراط", en: "\"Wisdom begins in wonder.\" — Socrates" },
  { ar: "الخيال أهم من المعرفة. — ألبرت أينشتاين", en: "\"Imagination is more important than knowledge.\" — Albert Einstein" },
  { ar: "القراءة تمد العقل فقط بمواد المعرفة، والتفكير هو ما يجعل ما نقرأه ملكاً لنا. — جون لوك", en: "\"Reading furnishes the mind only with materials of knowledge; it is thinking that makes what we read ours.\" — John Locke" },
  { ar: "الاستثمار في المعرفة يحقق دائماً أفضل العوائد. — بنيامين فرانكلين", en: "\"An investment in knowledge pays the best interest.\" — Benjamin Franklin" },
  { ar: "لا يوجد ظلام إلا الجهل. — شكسبير", en: "\"There is no darkness but ignorance.\" — Shakespeare" },
  { ar: "الشخص الذي لا يقرأ الكتب الجيدة ليس لديه ميزة على الشخص الذي لا يقرأ. — مارك توين", en: "\"The man who does not read good books has no advantage over the man who cannot read.\" — Mark Twain" },
  { ar: "الكتابة هي صورة الروح. — فولتير", en: "\"Writing is the painting of the voice.\" — Voltaire" },
  { ar: "القراءة هي مفتاح باب المعرفة. — نابليون بونابرت", en: "\"Reading is the key to the door of knowledge.\" — Napoleon Bonaparte" },
  { ar: "العلم هو معرفة منظمة، والحكمة هي حياة منظمة. — إيمانويل كانط", en: "\"Science is organized knowledge. Wisdom is organized life.\" — Immanuel Kant" },
  { ar: "ما نعرفه هو قطرة، وما نجهله هو محيط. — إسحاق نيوتن", en: "\"What we know is a drop, what we don't know is an ocean.\" — Isaac Newton" },
  { ar: "التعلم هو الشيء الوحيد الذي لا يرهق العقل أبداً. — ليوناردو دا فينشي", en: "\"Learning never exhausts the mind.\" — Leonardo da Vinci" },
  { ar: "لا يمكنك تعليم الإنسان أي شيء، يمكنك فقط مساعدته على العثور عليه داخل نفسه. — جاليليو جاليلي", en: "\"You cannot teach a man anything; you can only help him find it within himself.\" — Galileo Galilei" },
  { ar: "تعلم دون تفكير هو جهد ضائع، وتفكير دون تعلم هو أمر خطير. — كونفوشيوس", en: "\"Learning without thought is labor lost, and thought without learning is perilous.\" — Confucius" },
  { ar: "البيت بلا كتب كالجسد بلا روح. — شيشرون", en: "\"A room without books is like a body without a soul.\" — Cicero" },
  { ar: "المعرفة هي الغذاء الحقيقي للروح. — أفلاطون", en: "\"Knowledge is the food of the soul.\" — Plato" },
  { ar: "الحكيم في غرفته يرى العالم كله. — رالف والدو إيمرسون", en: "\"The wise man in his room sees the whole world.\" — Ralph Waldo Emerson" },
  { ar: "أي شخص يتوقف عن التعلم هو عجوز، سواء كان في العشرين أو الثمانين. — هنري فورد", en: "\"Anyone who stops learning is old, whether at twenty or eighty.\" — Henry Ford" },
  { ar: "العبقرية هي 1% إلهام و99% جهد وعرق. — توماس إديسون", en: "\"Genius is one percent inspiration and ninety-nine percent perspiration.\" — Thomas Edison" },
  { ar: "كوني بطيئاً في القراءة لا يزعجني، المهم أنني لا أتراجع أبداً. — أبراهام لينكولن", en: "\"I am a slow walker, but I never walk back.\" — Abraham Lincoln" },
  { ar: "الذكاء بالإضافة إلى الشخصية، هذا هو الهدف من التعليم الحقيقي. — مارتن لوثر كينج", en: "\"Intelligence plus character—that is the goal of true education.\" — Martin Luther King Jr." },
  { ar: "المشكلة في العالم أن الأغبياء واثقون بأنفسهم تماماً، بينما الأذكياء تملؤهم الشكوك. — برتراند راسل", en: "\"The whole problem with the world is that fools are full of confidence and the wise are full of doubt.\" — Bertrand Russell" },
  { ar: "الكتاب الجيد يحتاج إلى قارئ جيد. — فريدريك نيتشه", en: "\"A good book needs a good reader.\" — Friedrich Nietzsche" },
  { ar: "العلم قد وجد علاجاً لكل الشرور، لكنه لم يجد علاجاً للامبالاة. — هيلين كيلر", en: "\"Science may have found a cure for most evils, but it has found no remedy for the worst of them all—the apathy of human beings.\" — Helen Keller" },
  { ar: "العقل هو السيد الحاكم للظروف. — جيمس ألين", en: "\"The mind is the master weaver of circumstances.\" — James Allen" },
  { ar: "القراءة للعقل كالتمرين للجسد. — برايان تريسي", en: "\"Reading is to the mind what exercise is to the body.\" — Brian Tracy" },
  { ar: "المعرفة ليست قوة إلا إذا تم تطبيقها. — ديل كارنيجي", en: "\"Knowledge isn't power until it is applied.\" — Dale Carnegie" },
  { ar: "نحن ما نفعله باستمرار، لذا فإن التميز ليس فعلاً بل عادة. — ستيفن كوفي", en: "\"We are what we repeatedly do. Excellence, then, is not an act, but a habit.\" — Stephen Covey" },
  { ar: "لا يوجد صديق مخلص مثل الكتاب. — إرنست همنغواي", en: "\"There is no friend as loyal as a book.\" — Ernest Hemingway" },
  { ar: "من الأفضل أن تكون قارئاً جيداً على أن تكون كاتباً سيئاً. — أوسكار وايلد", en: "\"It is better to be a good reader than a bad writer.\" — Oscar Wilde" },
  { ar: "كم من إنسان بدأ عصراً جديداً في حياته من قراءة كتاب. — هنري ديفيد ثورو", en: "\"How many a man has dated a new era in his life from the reading of a book.\" — Henry David Thoreau" },
  { ar: "هناك كنز في الكتب أكثر من كل ما غنمه القراصنة. — والت ديزني", en: "\"There is more treasure in books than in all the pirate's loot.\" — Walt Disney" },
  { ar: "الكلمات القليلة من الحكيم خير من الخطب الطويلة. — بليز باسكال", en: "\"Few words of a wise man are better than long speeches.\" — Blaise Pascal" },
  { ar: "المعرفة وحدها لا تكفي، لا بد من التطبيق. — يوهان غوته", en: "\"Knowing is not enough; we must apply.\" — Johann Wolfgang von Goethe" },
  { ar: "الحكمة هي نتاج التجربة. — ديفيد هيوم", en: "\"Wisdom is the product of experience.\" — David Hume" },
  { ar: "الكتاب الجيد هو هدية لعقل ناضج. — جورج مكدونالد", en: "\"A good book is a gift to a mature mind.\" — George MacDonald" },
  { ar: "سعادة حياتك تعتمد على جودة أفكارك. — ماركوس أوريليوس", en: "\"The happiness of your life depends on the quality of your thoughts.\" — Marcus Aurelius" },
  { ar: "رحلة الألف ميل تبدأ بخطوة واحدة. — لاوتسو", en: "\"A journey of a thousand miles begins with a single step.\" — Lao Tzu" },
  { ar: "القراءة هي التنفس للعقل. — فيكتور هوغو", en: "\"Reading is breathing for the mind.\" — Victor Hugo" },
  { ar: "المعرفة نوعان: أن نعرف الموضوع، أو أن نعرف أين نجد معلومات عنه. — صمويل جونسون", en: "\"Knowledge is of two kinds: knowing the subject, or knowing where to find information about it.\" — Samuel Johnson" },
  { ar: "كل ما يتخيله إنسان يمكن لآخرين أن يحققوه. — جول فيرن", en: "\"Anything one man can imagine, other men can make real.\" — Jules Verne" },
  { ar: "الهدف العظيم للتعليم ليس المعرفة بل العمل. — هربرت سبنسر", en: "\"The great aim of education is not knowledge but action.\" — Herbert Spencer" },
  { ar: "القادة هم قراء دائماً. — أنتوني روبنز", en: "\"Leaders are readers.\" — Tony Robbins" },
  { ar: "التعليم هو جواز سفرنا للمستقبل. — مالكوم إكس", en: "\"Education is our passport to the future.\" — Malcolm X" },
  { ar: "لا تترك أبداً للغد ما يمكنك فعله اليوم. — تشارلز ديكنز", en: "\"Never put off till tomorrow what you can do today.\" — Charles Dickens" },
  { ar: "لا يمكن للمرء أن يتعلم ما يعتقد أنه يعرفه بالفعل. — أبيكتيتوس", en: "\"It is impossible for a man to learn what he thinks he already knows.\" — Epictetus" },
  { ar: "الحكمة هي تأمل في الحياة وليس في الموت. — باروخ سبينوزا", en: "\"Wisdom is meditation on life, not on death.\" — Baruch Spinoza" },
  { ar: "الكتاب هو النافذة التي نطل منها على العالم. — جورج صاند", en: "\"A book is the window through which we look at the world.\" — George Sand" },
  { ar: "القراءة بلا تفكير كالطعام بلا هضم. — إدموند بيرك", en: "\"Reading without reflecting is like eating without digesting.\" — Edmund Burke" },
  { ar: "العقل الذي يتفتح بفكرة جديدة لا يعود أبداً إلى أبعاده الأصلية. — أوليفر وندل هولمز", en: "\"A mind that is stretched by a new experience can never go back to its old dimensions.\" — Oliver Wendell Holmes" },
  { ar: "أعظم اكتشاف هو أن الإنسان يمكنه تغيير حياته عبر تغيير مواقفه العقلية. — وليام جيمس", en: "\"The greatest discovery is that a human being can alter his life by altering his attitudes of mind.\" — William James" },
  { ar: "نكتب لكي نعبر، لا لكي نثير الإعجاب. — موليير", en: "\"We write to express, not to impress.\" — Molière" },
  { ar: "الكتابة هي نوع من أنواع الانتقام من الواقع. — جورج أورويل", en: "\"Writing is a form of revenge against reality.\" — George Orwell" },
  { ar: "الكتاب يجب أن يكون الفأس التي تكسر البحر المتجمد في داخلنا. — فرانس كافكا", en: "\"A book must be the axe for the frozen sea inside us.\" — Franz Kafka" },
  { ar: "عندما تريد شيئاً، يتآمر الكون كله ليساعدك على تحقيقه. — باولو كويلو", en: "\"When you want something, all the universe conspires in helping you to achieve it.\" — Paulo Coelho" },
  { ar: "القراءة هي الطريقة الوحيدة للسفر دون مغادرة المكان. — غابرييل غارسيا ماركيز", en: "\"Reading is the only way to travel without leaving your seat.\" — Gabriel García Márquez" },
  { ar: "الكتب هي التي علمتني أن مخاوفي لم تكن خاصة بي وحدي. — جيمس بالدوين", en: "\"Books taught me that my fears were not mine alone.\" — James Baldwin" },
  { ar: "الكتب هي أرواح العظماء التي لا تموت. — فيرجينيا وولف", en: "\"Books are the souls of great ones that never die.\" — Virginia Woolf" },
  { ar: "السفر يكمل التعليم. — ألدوس هكسلي", en: "\"Travel completes education.\" — Aldous Huxley" },
  { ar: "الكاتب هو من يشهد على عصره. — إميل زولا", en: "\"The writer is one who witnesses their era.\" — Émile Zola" },
  { ar: "ابقَ جائعاً، ابقَ أحمقاً. — ستيف جوبز", en: "\"Stay hungry, stay foolish.\" — Steve Jobs" },
  { ar: "القراءة هي طريقتي في التعلم من تجارب الآخرين. — بيل غيتس", en: "\"Reading is my way of learning from others' experiences.\" — Bill Gates" },
  { ar: "الكتب هي بطاقتي الشخصية للحرية. — أوبرا وينفري", en: "\"Books were my pass to personal freedom.\" — Oprah Winfrey" },
  { ar: "الرواية هي مرآة تمشي في طريق طويل. — هنري جيمس", en: "\"The novel is a mirror walking along a long road.\" — Henry James" },
  { ar: "الحكمة هي المعرفة التي تمنعنا من الكلام عند اللزوم. — أمبروز بيرس", en: "\"Wisdom is the knowledge that prevents us from speaking when necessary.\" — Ambrose Bierce" },
  { ar: "لا يفوت الأوان أبداً لتكون ما كان من الممكن أن تكونه. — جورج إيليوت", en: "\"It is never too late to be what you might have been.\" — George Eliot" },
  { ar: "القليل من التعلم شيء خطر. — ألكسندر بوب", en: "\"A little learning is a dangerous thing.\" — Alexander Pope" },
  { ar: "التعليم ليس استعداداً للحياة، بل هو الحياة ذاتها. — جون ديوي", en: "\"Education is not preparation for life; education is life itself.\" — John Dewey" },
  { ar: "في العلم، يجب أن نهتم بالأشياء، لا بالأشخاص. — ماري كوري", en: "\"In science, we must be interested in things, not in persons.\" — Marie Curie" },
  { ar: "الكاتب الذي لا يبكي لن يبكي قارئه. — روبرت فروست", en: "\"No tears in the writer, no tears in the reader.\" — Robert Frost" },
  { ar: "القراءة عادة يصعب التخلص منها. — سومرست موم", en: "\"Reading is a habit that is hard to break.\" — W. Somerset Maugham" },
  { ar: "المثقف هو من يقول الحق في وجه القوة. — إدوارد سعيد", en: "\"The intellectual is one who speaks truth to power.\" — Edward Said" },
  { ar: "التعليم هو وسيلة لبناء عقول حرة. — نعوم تشومسكي", en: "\"Education is a means of building free minds.\" — Noam Chomsky" },
  { ar: "الكتب هي دليل على أن البشر يمكنهم القيام بالسحر. — كارل ساغان", en: "\"Books are proof that humans can work magic.\" — Carl Sagan" },
  { ar: "المعلم هو من يذكرك بما تعرفه بالفعل. — ريتشارد باخ", en: "\"A teacher is one who reminds you of what you already know.\" — Richard Bach" },
  { ar: "اكتب لكي تجد نفسك. — جاك كيرواك", en: "\"Write to find yourself.\" — Jack Kerouac" },
  { ar: "الجمال هو الحقيقة، والحقيقة هي الجمال. — جون كيتس", en: "\"Beauty is truth, truth beauty.\" — John Keats" },
  { ar: "بدون الكلمة، بدون الكتاب، لا يوجد تاريخ. — هيرمان هيسه", en: "\"Without the word, without the book, there is no history.\" — Hermann Hesse" },
  { ar: "لطالما تخيلت أن الجنة ستكون نوعاً من المكتبة. — خورخي لويس بورخيس", en: "\"I have always imagined that Paradise will be a kind of library.\" — Jorge Luis Borges" },
  { ar: "الحكيم هو من لا يحزن على ما ليس عنده، بل يفرح بما عنده. — ألبرت هوبارد", en: "\"The wise one does not mourn what they lack, but rejoices in what they have.\" — Elbert Hubbard" },
  { ar: "العلم هو الذي يجعل الإنسان يعرف كم هو جاهل. — جوناثان سويفت", en: "\"Science teaches us how much we do not know.\" — Jonathan Swift" },
  { ar: "الكاتب الحقيقي هو من يكتب للأجيال القادمة. — سيمون دي بوفوار", en: "\"The true writer is one who writes for future generations.\" — Simone de Beauvoir" },
  { ar: "إذا كنت لا تحب القراءة، فأنت لم تجد الكتاب الصحيح بعد. — جي كي رولينغ", en: "\"If you don't like reading, you haven't found the right book yet.\" — J.K. Rowling" },
  { ar: "لا تحكم على يومك بالحصاد، بل بالبذور التي تزرعها. — روبرت لويس ستيفنسون", en: "\"Don't judge each day by the harvest you reap, but by the seeds that you plant.\" — Robert Louis Stevenson" },
  { ar: "الكتب كثيرة جداً، والوقت قليل جداً. — فرانك زابا", en: "\"So many books, so little time.\" — Frank Zappa" },
  { ar: "القراءة الجيدة هي عمل نبيل. — هنري ثورو", en: "\"To read well is a noble exercise.\" — Henry Thoreau" },
  { ar: "العلم بدون ضمير خراب للروح. — فرانسوا رابليه", en: "\"Science without conscience is the ruin of the soul.\" — François Rabelais" },
  { ar: "العالم الحقيقي للمعرفة هو القلب. — جان جاك روسو", en: "\"The real world of knowledge is the heart.\" — Jean-Jacques Rousseau" },
  { ar: "القراءة هي العلاج الأفضل لآلام الحياة. — مونتسكيو", en: "\"Reading is the best remedy for the pains of life.\" — Montesquieu" },
  { ar: "المعرفة لا حدود لها، وكلما عرفنا أكثر أدركنا جهلنا. — بليز باسكال", en: "\"Knowledge has no limits; the more we know, the more we realize our ignorance.\" — Blaise Pascal" },
  { ar: "نحن لا نغزو الجبال، بل نغزو أنفسنا. — إدموند هيلاري", en: "\"We do not conquer mountains, we conquer ourselves.\" — Edmund Hillary" },
  { ar: "أين الحكمة التي فقدناها في المعرفة؟ — ت. س. إليوت", en: "\"Where is the wisdom we have lost in knowledge?\" — T.S. Eliot" },
  { ar: "التعلم هو اكتشاف أن كل شيء ممكن. — والت ويتمان", en: "\"Learning is discovering that everything is possible.\" — Walt Whitman" },
  { ar: "الوقت الكافي للقراءة هو وقت مستثمر في المستقبل. — جون كنيدي", en: "\"Time spent reading is time invested in the future.\" — John F. Kennedy" },
];

// Original quotes from the app (preserved)
const ORIGINAL_QUOTES: { ar: string; en: string }[] = [
  { ar: "القراءة تمد العقل فقط بلوازم المعرفة، أما التفكير فهو الذي يجعل ما نقرأه مُلكاً لنا. — جون لوك", en: "\"Reading furnishes the mind only with materials of knowledge; it is thinking that makes what we read ours.\" — John Locke" },
  { ar: "الكتب ليست أكوام ورق ميتة، إنها عقولٌ تعيش على الأرفف وتنتظر من يحاورها. — عباس محمود العقاد", en: "\"Books are not dead piles of paper, they are minds living on shelves waiting for a conversation.\" — Abbas Al-Aqqad" },
  { ar: "خير جليسٍ في الأنام كتاب. — المتنبي", en: "\"The best companion in the world is a book.\" — Al-Mutanabbi" },
  { ar: "الجهل يهدم بيوت العز والكرم، والعلم يرفع بيتاً لا عماد له. — علي بن أبي طالب", en: "\"Ignorance destroys houses of honor, and knowledge raises houses that have no pillars.\" — Ali ibn Abi Talib" },
  { ar: "القراءة غذاء الروح، والكتب هي السلم الذي نرتقي به نحو السمو الفكري.", en: "\"Reading is food for the soul, and books are the ladder by which we ascend to intellectual greatness.\"" },
  { ar: "إنّ الإنسان الذي لا يقرأ ليس أفضل حالاً من الإنسان الذي لا يستطيع القراءة. — مارك توين", en: "\"The man who does not read has no advantage over the man who cannot read.\" — Mark Twain" },
  { ar: "اقرأ كتاباً جيداً ثلاث مرات أنفع لك من أن تقرأ ثلاثة كتب. — عباس العقاد", en: "\"Read one good book three times. It is more beneficial than reading three good books once.\" — Abbas Al-Aqqad" },
  { ar: "ليس ثمة سفينة كالكتاب تأخذنا إلى أبعد الأماكن. — إميلي ديكنسون", en: "\"There is no frigate like a book to take us leagues away.\" — Emily Dickinson" },
  { ar: "الكتاب هو المعلم الذي يعلم بلا عصا ولا كلمات غضب، بلا خبز ولا مال. — ابن خلدون", en: "\"A book is a teacher that educates without a stick, without anger, without bread, or money.\" — Ibn Khaldun" },
  { ar: "التعلم هو الشيء الوحيد الذي لا يستطيع العقل أن يتعب منه أبداً. — ليوناردو دا فينشي", en: "\"Learning never exhausts the mind.\" — Leonardo da Vinci" },
  { ar: "لا تقرأ لتكون أذكى فحسب، بل اقرأ لتصبح أعمق، أوسع فهماً، وأكثر رحمة بالعالم.", en: "\"Don't read just to be smarter. Read to be deeper, broader in understanding, and more compassionate.\"" },
  { ar: "من لم يتعلم في صغره، لم يتقدم في كبره. — الإمام الشافعي", en: "\"Who does not learn in youth, does not advance in age.\" — Imam Al-Shafi'i" },
  { ar: "إذا أوى أحدكم إلى فراشه فليقرأ .. فإن القراءة نور للقلب وطمأنينة للنفس.", en: "\"Let reading be your sanctuary at night... for it is light for the heart and tranquility for the soul.\"" },
  { ar: "المعرفة الحقيقية لا تُقاس بما تحفظ، بل بما تفهم وتطبق في حياتك.", en: "\"True knowledge is not measured by what you memorize, but by what you understand and apply.\"" },
  { ar: "اقضِ وقتك مع الكتب، فهي الصديق الذي لا يغدر والمعلم الذي لا يملّ.", en: "\"Spend your time with books — they are friends that never betray and teachers that never tire.\"" },
];

// ===== SMART QUOTE SELECTOR =====
// Arabic language: Eastern quotes + some Western | English language: Western quotes
export const getQuotesForLanguage = (lang: 'ar' | 'en'): { ar: string; en: string }[] => {
  if (lang === 'ar') {
    // Arabic users: Eastern quotes + some Western thinkers
    return [...EASTERN_QUOTES, ...WESTERN_QUOTES.slice(0, 30), ...ORIGINAL_QUOTES];
  } else {
    // English users: Western quotes primarily
    return [...WESTERN_QUOTES, ...ORIGINAL_QUOTES];
  }
};

interface NotificationStats {
  lastSessionMins: number;
  todayMins: number;
  totalMins: number;
  totalStars: number;
  totalBooks: number;
  bookBreakdown: { title: string; mins: number; stars: number }[];
  streak: number;
}

// ===== CONTEXTUAL NOTIFICATION INTENSITY CALCULATOR =====
const getNotificationIntensity = (stats: NotificationStats): 'low' | 'medium' | 'high' | 'critical' => {
  // Critical: streak at risk, no reading today
  if (stats.todayMins === 0 && stats.streak > 3) return 'critical';
  // High: minimal reading, streak building
  if (stats.todayMins < 5 && stats.streak > 0) return 'high';
  // Medium: some reading but below target
  if (stats.todayMins < 15) return 'medium';
  // Low: good performance
  return 'low';
};

// ===== CONTEXTUAL NOTIFICATION MESSAGES =====
const getContextualMessages = (isAR: boolean, stats: NotificationStats, intensity: string): { title: string; body: string }[] => {
  const messages: { title: string; body: string }[] = [];

  if (intensity === 'critical') {
    messages.push({
      title: isAR ? '🚨 تنبيه عاجل — السلسلة في خطر!' : '🚨 Urgent — Streak at Risk!',
      body: isAR
        ? `لم تقرأ اليوم بعد! سلسلة التزامك (${stats.streak} يوماً) مهددة بالانكسار. دقيقتان فقط تحميها.`
        : `You haven't read today! Your ${stats.streak}-day streak is at risk. Just 2 minutes can save it.`
    });
    messages.push({
      title: isAR ? '⚡ وقت الإنقاذ الآن!' : '⚡ Rescue Time Now!',
      body: isAR
        ? `المحراب ينتظرك. افتح كتاباً واقرأ ولو صفحة واحدة — حافظ على سلسلة الـ ${stats.streak} يوماً.`
        : `The Sanctuary awaits. Open a book and read even one page — protect your ${stats.streak}-day streak.`
    });
  }

  if (intensity === 'high') {
    messages.push({
      title: isAR ? '📖 المحراب ينادي' : '📖 The Sanctuary Calls',
      body: isAR
        ? `قرأت ${stats.todayMins} دقيقة فقط اليوم. بادر بجلسة تأمل إضافية لتعزيز تقدمك المعرفي.`
        : `You've only read ${stats.todayMins} minutes today. Start an additional session to strengthen your progress.`
    });
  }

  if (stats.totalStars > 0 && stats.totalStars % 5 === 0) {
    messages.push({
      title: isAR ? '🏆 إنجاز تراكمي!' : '🏆 Cumulative Achievement!',
      body: isAR
        ? `بلغ رصيدك ${stats.totalStars} نجمة! استمر في هذا التدفق المعرفي الاستثنائي.`
        : `You've earned ${stats.totalStars} stars! Keep this exceptional knowledge flow going.`
    });
  }

  if (stats.streak >= 7 && stats.streak % 7 === 0) {
    messages.push({
      title: isAR ? '🛡️ أسبوع ذهبي!' : '🛡️ Golden Week!',
      body: isAR
        ? `${stats.streak} يوم متواصل من القراءة! أنت من النخبة الفكرية. كل أسبوع يمنحك درعاً جديداً.`
        : `${stats.streak} consecutive days of reading! You're among the intellectual elite. Every week earns you a new shield.`
    });
  }

  return messages;
};

export const scheduleMotivationalNotifications = async (lang: 'ar' | 'en', stats: NotificationStats) => {
  try {
    const hasPermission = await LocalNotifications.checkPermissions();
    if (hasPermission.display !== 'granted') {
       const result = await LocalNotifications.requestPermissions();
       if (result.display !== 'granted') return;
    }

    // Clear all previous scheduled notifications
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
    }

    const isAR = lang === 'ar';
    const now = Date.now();
    const notifications: any[] = [];
    let notifId = 100;
    const intensity = getNotificationIntensity(stats);
    const quotes = getQuotesForLanguage(lang);

    // ===================================================================
    // SEQUENCE 1: EXIT SUMMARY (1 minute after leaving the app)
    // حصيلة شاملة احترافية بعد دقيقة واحدة من الخروج
    // ===================================================================

    // 1A. Session Duration Summary
    const sessionText = isAR
      ? `لبثتَ في رحاب المحراب ${stats.lastSessionMins} دقيقة من التأمل والقراءة الراقية. كلُّ لحظةٍ تقضيها في العلم هي لبنةٌ في صرح وعيك المتين.`
      : `You spent ${stats.lastSessionMins} minutes in the Sanctuary in focused intellectual pursuit. Every moment invested in knowledge strengthens the architecture of your consciousness.`;
    
    notifications.push({
      id: ++notifId,
      title: isAR ? '✨ ختام جلسة التأمل المعرفي' : '✨ Intellectual Session Concluded',
      body: sessionText,
      smallIcon: 'ic_stat_icon',
      largeIcon: 'ic_launcher',
      iconColor: '#ff0000',
      schedule: { at: new Date(now + 60 * 1000), allowWhileIdle: true }
    });

    // 1B. Today's Cumulative Progress (1:15 min after exit)
    const todayText = isAR
      ? `📊 حصاد اليوم الفكري: ${stats.todayMins} دقيقة قراءة مركزة | ${stats.totalBooks} كتاب في المحراب | ${stats.totalStars} نجمة تحصيلية مضيئة`
      : `📊 Today's intellectual harvest: ${stats.todayMins} min focused reading | ${stats.totalBooks} volumes in Sanctuary | ${stats.totalStars} achievement stars`;
    
    notifications.push({
      id: ++notifId,
      title: isAR ? '📈 الحصيلة اليومية الشاملة' : '📈 Comprehensive Daily Report',
      body: todayText,
      smallIcon: 'ic_stat_icon',
      largeIcon: 'ic_launcher',
      iconColor: '#ff0000',
      schedule: { at: new Date(now + 75 * 1000), allowWhileIdle: true }
    });

    // 1C. Book-specific progress (1:30 min after exit)
    if (stats.bookBreakdown.length > 0) {
      const mainBook = stats.bookBreakdown[0];
      const bookProgressText = isAR
        ? `📜 تركيزك الأعمق اليوم كان في "${mainBook.title}" لمدة ${mainBook.mins} دقيقة — واصل الغوص في أعماق المعرفة.`
        : `📜 Your deepest focus today was on "${mainBook.title}" for ${mainBook.mins} minutes — continue diving into the depths of knowledge.`;
      
      notifications.push({
        id: ++notifId,
        title: isAR ? '📖 تقرير التركيز الأدبي' : '📖 Literary Focus Report',
        body: bookProgressText,
        smallIcon: 'ic_stat_icon',
        largeIcon: 'ic_launcher',
        iconColor: '#ff0000',
        schedule: { at: new Date(now + 90 * 1000), allowWhileIdle: true }
      });
    }

    // 1D. Cumulative Total + Growth (2 min after exit)
    const totalHours = (stats.totalMins / 60).toFixed(1);
    const cumulativeText = isAR
      ? `🏛️ بلغ رصيدك المعرفي التراكمي ${totalHours} ساعة. سلسلة الالتزام: ${stats.streak} يوم متواصل. أنت تبني إرثاً فكرياً لا يُمحى.`
      : `🏛️ Your cumulative knowledge capital: ${totalHours} hours. Consistency streak: ${stats.streak} consecutive days. You are building an intellectual legacy that endures.`;
    
    notifications.push({
      id: ++notifId,
      title: isAR ? '🏆 الأثر التراكمي المعرفي' : '🏆 Cumulative Cognitive Impact',
      body: cumulativeText,
      smallIcon: 'ic_stat_icon',
      largeIcon: 'ic_launcher',
      iconColor: '#ff0000',
      schedule: { at: new Date(now + 120 * 1000), allowWhileIdle: true }
    });

    // ===================================================================
    // SEQUENCE 1.5: CONTEXTUAL NOTIFICATIONS (based on user performance)
    // تنبيهات سياقية مبنية على أداء المستخدم
    // ===================================================================
    const contextualMsgs = getContextualMessages(isAR, stats, intensity);
    contextualMsgs.forEach((msg, i) => {
      notifications.push({
        id: ++notifId,
        title: msg.title,
        body: msg.body,
        smallIcon: 'ic_stat_icon',
        largeIcon: 'ic_launcher',
        iconColor: '#ff0000',
        schedule: { at: new Date(now + (3 + i) * 60 * 1000), allowWhileIdle: true }
      });
    });

    // ===================================================================
    // SEQUENCE 2: HALF-HOURLY PROFESSIONAL NOTIFICATIONS
    // تنبيهات كل نصف ساعة — أكثر كثافة في حالة الأداء المنخفض
    // ===================================================================

    // Determine notification frequency based on intensity
    const intervalMinutes = intensity === 'critical' ? 20 : intensity === 'high' ? 25 : 30;
    const totalSlots = intensity === 'critical' ? 16 : intensity === 'high' ? 14 : 12;

    const halfHourlyTypes = (() => {
      const base = ['summary', 'quote', 'books', 'cumulative', 'quote', 'motivation', 'quote', 'summary', 'quote', 'books', 'cumulative', 'quote'];
      if (intensity === 'critical' || intensity === 'high') {
        return [...base, 'motivation', 'quote', 'summary', 'quote'];
      }
      return base;
    })();

    const usedQuoteIndices: number[] = [];
    const getUniqueQuote = (): typeof quotes[0] => {
      let index: number;
      do {
        index = Math.floor(Math.random() * quotes.length);
      } while (usedQuoteIndices.includes(index) && usedQuoteIndices.length < quotes.length);
      usedQuoteIndices.push(index);
      return quotes[index];
    };

    for (let i = 0; i < Math.min(halfHourlyTypes.length, totalSlots); i++) {
      const type = halfHourlyTypes[i];
      const delay = (i + 1) * intervalMinutes * 60 * 1000;
      let title = '';
      let body = '';

      switch (type) {
        case 'summary': {
          title = isAR ? '📊 ملخص أدائك المعرفي' : '📊 Knowledge Performance Summary';
          body = isAR
            ? `استثمرت ${stats.todayMins} دقيقة اليوم في القراءة المركزة. محرابك يضم ${stats.totalBooks} مجلد. كل صفحة تقرؤها تُعيد تشكيل عقلك.`
            : `You invested ${stats.todayMins} minutes today in focused reading. Your sanctuary holds ${stats.totalBooks} volumes. Every page restructures your mind.`;
          break;
        }
        case 'quote': {
          const quote = getUniqueQuote();
          title = isAR ? '🕯️ تأمُّلٌ في المحراب' : '🕯️ Sanctuary Contemplation';
          body = isAR ? quote.ar : quote.en;
          break;
        }
        case 'books': {
          if (stats.bookBreakdown.length > 0) {
            const randomBook = stats.bookBreakdown[Math.floor(Math.random() * stats.bookBreakdown.length)];
            title = isAR ? '📚 نداء المخطوطات' : '📚 The Manuscripts Calling';
            body = isAR
              ? `كتاب "${randomBook.title}" ينتظرك. قضيت فيه ${randomBook.mins} دقيقة حتى الآن — الحكمة لا تنضب لمن يواصل.`
              : `"${randomBook.title}" awaits you. You've spent ${randomBook.mins} minutes so far — wisdom never runs dry for those who persist.`;
          } else {
            const quote = getUniqueQuote();
            title = isAR ? '📚 ابدأ رحلتك الفكرية' : '📚 Begin Your Intellectual Journey';
            body = isAR ? quote.ar : quote.en;
          }
          break;
        }
        case 'cumulative': {
          const totalH = (stats.totalMins / 60).toFixed(1);
          title = isAR ? '🏛️ رصيدك التراكمي' : '🏛️ Cumulative Capital';
          body = isAR
            ? `مجموع ساعات التأمل الفكري: ${totalH} ساعة | النجوم: ${stats.totalStars} | سلسلة الالتزام: ${stats.streak} يوم. أنت من الـ 3% الذين يصنعون الفرق.`
            : `Total intellectual hours: ${totalH}h | Stars: ${stats.totalStars} | Streak: ${stats.streak} days. You are among the 3% who make the difference.`;
          break;
        }
        case 'motivation': {
          title = isAR ? '🔥 إشعال الحماس' : '🔥 Igniting Passion';
          body = isAR
            ? `تذكّر: القراءة ليست هواية، بل هي تمرين يومي لعضلة الحكمة. استمر في بناء صرح معرفتك، فالعالَمُ بحاجة إلى عقلك المستنير.`
            : `Remember: Reading is not a hobby — it is daily exercise for the wisdom muscle. Keep building your knowledge monument. The world needs your enlightened mind.`;
          break;
        }
      }

      notifications.push({
        id: ++notifId,
        title,
        body,
        smallIcon: 'ic_stat_icon',
        largeIcon: 'ic_launcher',
        iconColor: '#ff0000',
        schedule: { at: new Date(now + delay), allowWhileIdle: true }
      });
    }

    await LocalNotifications.schedule({ notifications });
  } catch (e) {
    console.error("Advanced notifications scheduling failed:", e);
  }
};

// ===================================================================
// PERIODIC SUMMARY NOTIFICATIONS (48h + Weekly)
// نظام التحليل الذكي والحوصلة الدورية
// ===================================================================
export const schedulePeriodicSummary = async (lang: 'ar' | 'en', stats: NotificationStats) => {
  try {
    const hasPermission = await LocalNotifications.checkPermissions();
    if (hasPermission.display !== 'granted') return;

    const isAR = lang === 'ar';
    const now = Date.now();
    const notifications: any[] = [];
    const totalHours = (stats.totalMins / 60).toFixed(1);

    // Top books by time
    const topBooks = stats.bookBreakdown.slice(0, 3);
    const topBooksText = topBooks.map(b => `"${b.title}" (${b.mins}m)`).join(', ');

    // ── 48-HOUR SUMMARY ──
    const summary48hBody = isAR
      ? `📊 ملخص 48 ساعة:\n• دقائق القراءة: ${stats.todayMins * 2} دقيقة تقديرية\n• الكتب الأكثر قراءة: ${topBooksText || 'لا توجد بيانات'}\n• سلسلة الالتزام: ${stats.streak} يوم\n• النجوم المكتسبة: ${stats.totalStars}\n• الرصيد التراكمي: ${totalHours} ساعة`
      : `📊 48-Hour Summary:\n• Reading Minutes: ~${stats.todayMins * 2} estimated\n• Most Read: ${topBooksText || 'No data'}\n• Streak: ${stats.streak} days\n• Stars Earned: ${stats.totalStars}\n• Total Capital: ${totalHours}h`;

    notifications.push({
      id: 9001,
      title: isAR ? '📋 التحليل الذكي — ملخص 48 ساعة' : '📋 Smart Analytics — 48h Summary',
      body: summary48hBody,
      smallIcon: 'ic_stat_icon',
      largeIcon: 'ic_launcher',
      iconColor: '#ff0000',
      schedule: { at: new Date(now + 48 * 60 * 60 * 1000), allowWhileIdle: true }
    });

    // ── WEEKLY SUMMARY ──
    const summaryWeeklyBody = isAR
      ? `📊 الملخص الأسبوعي الشامل:\n• إجمالي دقائق القراءة الأسبوعية: ${stats.todayMins * 7} دقيقة تقديرية\n• الكتب الأكثر قراءة: ${topBooksText || 'لا توجد بيانات'}\n• سلسلة الالتزام: ${stats.streak} يوم\n• إجمالي النجوم: ${stats.totalStars}\n• المجموع التراكمي: ${totalHours} ساعة\n• عدد الكتب: ${stats.totalBooks}`
      : `📊 Weekly Comprehensive Summary:\n• Weekly Minutes: ~${stats.todayMins * 7} estimated\n• Most Read: ${topBooksText || 'No data'}\n• Streak: ${stats.streak} days\n• Total Stars: ${stats.totalStars}\n• Cumulative: ${totalHours}h\n• Total Books: ${stats.totalBooks}`;

    notifications.push({
      id: 9002,
      title: isAR ? '📋 التحليل الذكي — الملخص الأسبوعي' : '📋 Smart Analytics — Weekly Summary',
      body: summaryWeeklyBody,
      smallIcon: 'ic_stat_icon',
      largeIcon: 'ic_launcher',
      iconColor: '#ff0000',
      schedule: { at: new Date(now + 7 * 24 * 60 * 60 * 1000), allowWhileIdle: true }
    });

    await LocalNotifications.schedule({ notifications });
  } catch (e) {
    console.error("Periodic summary scheduling failed:", e);
  }
};
