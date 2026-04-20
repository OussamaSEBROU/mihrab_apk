
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

  // ═══════════════════════════════════════════════════════════════════════
  // الصنف الأول: مقولات الشرق الجديدة (100 مقولة إضافية)
  // New Eastern Quotes Expansion — 100 additional quotes
  // ═══════════════════════════════════════════════════════════════════════
  { ar: "إذا لم يزدك العلم خُلُقاً، فقد تزيدك المعرفة شقاءً. — مصطفى السباعي", en: "\"If knowledge does not improve your character, it may only increase your misery.\" — Mustafa Al-Siba'i" },
  { ar: "القراءة المنهجية هي التي تبني العقل، أما القراءة العشوائية فتمتع العقل ولا تبنيه. — عبد الكريم بكار", en: "\"Systematic reading builds the mind, while random reading entertains it without building it.\" — Abdel Karim Bakkar" },
  { ar: "العلم بلا تقوى كالسراج في يد اللص، يزيد صاحبه قدرة على الأذى. — أبو حامد الغزالي", en: "\"Knowledge without piety is like a lamp in a thief's hand, increasing their ability to harm.\" — Abu Hamid Al-Ghazali" },
  { ar: "من يقرأ التاريخ لا يرى الحوادث صدفة، بل يراها قانوناً يسير وفق أسباب ومسببات. — ابن خلدون", en: "\"Whoever reads history does not see events as coincidence, but as laws governed by causes and effects.\" — Ibn Khaldun" },
  { ar: "لا تجعل يقينك شكاً، ولا علمك جهلاً، ولا ظنك حقاً. — علي بن أبي طالب", en: "\"Do not turn your certainty into doubt, your knowledge into ignorance, or your assumption into truth.\" — Ali ibn Abi Talib" },
  { ar: "الفكر لا يحده حدود، والروح لا تحبسها جدران، والكتاب هو السبيل لكليهما. — عباس محمود العقاد", en: "\"Thought knows no bounds, the spirit no walls, and the book is the path to both.\" — Abbas Mahmoud Al-Aqqad" },
  { ar: "إن المعرفة ليست تكديساً للمعلومات، بل هي القدرة على استثمار الفكرة في الواقع. — مالك بن نبي", en: "\"Knowledge is not the accumulation of information, but the ability to invest ideas in reality.\" — Malek Bennabi" },
  { ar: "كلما أدبني الدهر أراني نقص عقلي، وإذا ما ازددت علماً زادني علماً بجهلي. — الشافعي", en: "\"The more life taught me, the more it showed me my deficiencies; and the more I learned, the more I learned of my ignorance.\" — Al-Shafi'i" },
  { ar: "الأمة التي تقرأ لا تُهزم، والأمة التي تفكر لا تُستعبد. — محمد الغزالي", en: "\"A nation that reads cannot be defeated, and a nation that thinks cannot be enslaved.\" — Muhammad Al-Ghazali" },
  { ar: "العلم يبني، والجهل يهدم، والحكمة هي التي تختار ما نبني وما نهدم. — أحمد شوقي", en: "\"Knowledge builds, ignorance destroys, and wisdom chooses what we build and what we demolish.\" — Ahmad Shawqi" },
  { ar: "ليس الحكيم الذي يعرف الخير من الشر، بل الحكيم الذي يعرف خير الشرين. — ابن القيم", en: "\"The wise one is not who knows good from evil, but who knows the lesser of two evils.\" — Ibn Al-Qayyim" },
  { ar: "العلم هو السلم الذي نصعد به نحو ذواتنا قبل أن نصعد به نحو العالم. — إبراهيم الفقي", en: "\"Knowledge is the ladder we climb toward ourselves before climbing toward the world.\" — Ibrahim Al-Feki" },
  { ar: "لا قيمة لعلم لا يلامس الروح، ولا معنى لحكمة لا تنعكس في السلوك. — جبران خليل جبران", en: "\"There is no value in knowledge that does not touch the soul, nor meaning in wisdom that is not reflected in behavior.\" — Khalil Gibran" },
  { ar: "إن ما تقرأه يحدد من أنت، وما تكتبه يحدد من ستكون. — ميخائيل نعيمة", en: "\"What you read determines who you are, and what you write determines who you will become.\" — Mikhail Naimy" },
  { ar: "العلم نور يضيء الدروب المظلمة، لكنه يحتاج لعين قادرة على الإبصار. — طه حسين", en: "\"Knowledge is a light that illuminates dark paths, but it needs an eye capable of seeing.\" — Taha Hussein" },
  { ar: "الحقيقة المطلقة لا يدركها إلا من تجرد من أهواء نفسه. — مصطفى محمود", en: "\"Absolute truth is only perceived by those who free themselves from their own desires.\" — Mustafa Mahmoud" },
  { ar: "الكلمة ليست مجرد حروف، بل هي طاقة تشعل في القلوب جذوة التغيير. — سيد قطب", en: "\"A word is not just letters; it is an energy that ignites the ember of change in hearts.\" — Sayyid Qutb" },
  { ar: "القراءة هي السفر في عقول الرجال دون أن تغادر غرفتك. — علي الطنطاوي", en: "\"Reading is traveling through the minds of men without leaving your room.\" — Ali Al-Tantawi" },
  { ar: "الفكر العربي يحتاج لمزاوجة بين أصالة الحكمة ومعاصرة العلم. — زكي نجيب محمود", en: "\"Arab thought needs a marriage between the authenticity of wisdom and the modernity of science.\" — Zaki Naguib Mahmoud" },
  { ar: "العقل وعاء يضيق بما يوضع فيه إلا وعاء العلم فإنه يتسع. — نجيب محفوظ", en: "\"The mind is a vessel that narrows with what is placed in it, except the vessel of knowledge, which expands.\" — Naguib Mahfouz" },
  { ar: "الحكيم هو من ملك زمام لسانه، والجاهل هو من أطلقه. — إبراهيم اليازجي", en: "\"The wise one controls their tongue, and the ignorant one lets it loose.\" — Ibrahim Al-Yaziji" },
  { ar: "العلم بالشيء هو إدراك ماهيته في عالم الوجود وعالم العقل. — الفارابي", en: "\"Knowledge of a thing is perceiving its essence in the world of existence and the world of the mind.\" — Al-Farabi" },
  { ar: "العلم لا يُنال بالراحة، والحكمة لا تُدرك بالتمني. — ابن رشد", en: "\"Knowledge is not gained through comfort, and wisdom is not attained through wishful thinking.\" — Ibn Rushd" },
  { ar: "الناس أربعة: رجل يدري ويدري أنه يدري فذلك عالم فاتبعوه. — الخليل بن أحمد", en: "\"People are four: a man who knows and knows he knows — that is a scholar, so follow him.\" — Al-Khalil ibn Ahmad" },
  { ar: "الكتاب هو الصديق الذي لا يخونك أبداً إذا أخلصت له. — الجاحظ", en: "\"A book is the friend that never betrays you if you are sincere to it.\" — Al-Jahiz" },
  { ar: "العلم علم القلب، فذاك العلم النافع. — الحسن البصري", en: "\"True knowledge is the knowledge of the heart; that is beneficial knowledge.\" — Al-Hasan Al-Basri" },
  { ar: "القراءة هي حياة العقل، والكتابة هي تخليد لتلك الحياة. — أبو هلال العسكري", en: "\"Reading is the life of the mind, and writing is the immortalization of that life.\" — Abu Hilal Al-Askari" },
  { ar: "من طلب العلم لغير الله لم يزدد من الله إلا بعداً. — ابن حزم", en: "\"Whoever seeks knowledge for other than God only increases in distance from God.\" — Ibn Hazm" },
  { ar: "العقل غريزة تقوى بالتجارب وتنمو بالتعلم. — الماوردي", en: "\"The mind is an instinct strengthened by experience and grown through learning.\" — Al-Mawardi" },
  { ar: "في كل كتاب تقرأه، أنت تقابل روحاً جديدة تشاركك تجاربها. — مصطفى صادق الرافعي", en: "\"In every book you read, you meet a new soul sharing its experiences with you.\" — Mustafa Sadiq Al-Rafi'i" },
  { ar: "الحكمة هي البصيرة التي تفرق بين الثابت والمتحول. — محمد عمارة", en: "\"Wisdom is the insight that distinguishes between the constant and the changing.\" — Muhammad Imara" },
  { ar: "المستعد للشيء يدرك حقيقته بأدنى تنبيه. — ابن سينا", en: "\"One who is prepared for something perceives its reality with the slightest hint.\" — Ibn Sina" },
  { ar: "العلم لا يكتمل إلا بالشك، فبالشك تُعرف الحقائق. — الرازي", en: "\"Knowledge is only complete through doubt, for through doubt truths are discovered.\" — Al-Razi" },
  { ar: "تعلّم حسن الاستماع كما تتعلم حسن الكلام. — ابن المقفع", en: "\"Learn to listen well just as you learn to speak well.\" — Ibn Al-Muqaffa" },
  { ar: "الحكمة هي أعلى الفضائل الإنسانية وأقربها للكمال. — الكندي", en: "\"Wisdom is the highest of human virtues and the closest to perfection.\" — Al-Kindi" },
  { ar: "الكتابة هي مرآة العصور التي لا تصدأ. — لسان الدين بن الخطيب", en: "\"Writing is the mirror of ages that never rusts.\" — Lisan Al-Din ibn Al-Khatib" },
  { ar: "من لم يرتضِ بالعلم دليلاً، تاه في دروب الضلال. — ابن باجة", en: "\"Whoever does not accept knowledge as a guide will be lost on the paths of misguidance.\" — Ibn Bajja" },
  { ar: "تعلموا العلم لتعرفوا الحق، واعرفوا الحق لتعملوا به. — عبد الحميد بن باديس", en: "\"Learn knowledge to know the truth, and know the truth to act upon it.\" — Abdelhamid Ben Badis" },
  { ar: "الموقف هو الحكمة الحقيقية، والكلمة هي سلاحها. — أمل دنقل", en: "\"The stance is true wisdom, and the word is its weapon.\" — Amal Dunqul" },
  { ar: "الحكمة هي صوت الصمت الذي يسبق العاصفة. — بدر شاكر السياب", en: "\"Wisdom is the voice of silence that precedes the storm.\" — Badr Shakir Al-Sayyab" },
  { ar: "في القراءة نجد ما فقدناه في الواقع، وفي الكتابة نصنع ما نتمناه. — محمود درويش", en: "\"In reading we find what we lost in reality, and in writing we create what we wish for.\" — Mahmoud Darwish" },
  { ar: "الذاكرة هي مخزن العلم، والنسيان هو عدوه الأول. — رضوى عاشور", en: "\"Memory is the storehouse of knowledge, and forgetfulness is its first enemy.\" — Radwa Ashour" },
  { ar: "القراءة هي فعل وجودي يعيد صياغة وعينا بالعالم. — واسيني الأعرج", en: "\"Reading is an existential act that reshapes our awareness of the world.\" — Wasini Al-Araj" },
  { ar: "الكتب هي أصدقاء الرحلة الذين لا يطلبون شيئاً ويعطون كل شيء. — أحلام مستغانمي", en: "\"Books are travel companions who ask for nothing and give everything.\" — Ahlam Mosteghanemi" },
  { ar: "المعرفة مسؤولية ثقيلة، والحكمة هي القدرة على حملها. — مريد البرغوثي", en: "\"Knowledge is a heavy responsibility, and wisdom is the ability to carry it.\" — Mourid Barghouti" },
  { ar: "الفكر النقدي هو المفتاح الحقيقي لفهم التاريخ. — هشام جعيط", en: "\"Critical thinking is the true key to understanding history.\" — Hichem Djait" },
  { ar: "لا يمكن تجديد العقل إلا من خلال إعادة قراءة التراث بعيون معاصرة. — محمد عابد الجابري", en: "\"The mind can only be renewed by re-reading heritage with contemporary eyes.\" — Muhammad Abed Al-Jabri" },
  { ar: "العلم هو الحرية، والجهل هو العبودية. — قاسم أمين", en: "\"Knowledge is freedom, and ignorance is slavery.\" — Qasim Amin" },
  { ar: "الحكيم هو من يبحث عن السؤال لا من يدعي امتلاك الجواب. — توفيق الحكيم", en: "\"The wise one seeks the question, not claims to possess the answer.\" — Tawfiq Al-Hakim" },
  { ar: "الأدب هو العلم بصورة فنية، والحكمة هي جوهرهما. — محمد حسين هيكل", en: "\"Literature is knowledge in artistic form, and wisdom is the essence of both.\" — Muhammad Husayn Haykal" },
  { ar: "الاستبداد يخشى العلم لأنه يكشف زيفه. — عبد الرحمن الكواكبي", en: "\"Tyranny fears knowledge because it exposes its falsehood.\" — Abdel Rahman Al-Kawakibi" },
  { ar: "القوة في العلم، والضعف في الجهل. — جمال الدين الأفغاني", en: "\"Strength lies in knowledge, and weakness lies in ignorance.\" — Jamal Al-Din Al-Afghani" },
  { ar: "إصلاح الفكر يبدأ من إصلاح مناهج التعلم. — محمد رشيد رضا", en: "\"Reforming thought begins with reforming methods of learning.\" — Muhammad Rashid Rida" },
  { ar: "الفرق بين العالم والجاهل هو الفرق بين البصير والأعمى. — منصور الكيالي", en: "\"The difference between the knowledgeable and the ignorant is the difference between the seeing and the blind.\" — Mansour Al-Kayali" },
  { ar: "الحكمة هي البوصلة التي توجه سفينة حياتك في بحر المتناقضات. — نبيل أحمد", en: "\"Wisdom is the compass that guides your life's ship through the sea of contradictions.\" — Nabil Ahmad" },
  { ar: "العقل قادر على إدراك الخالق من خلال تأمل مخلوقاته. — ابن طفيل", en: "\"The mind is capable of perceiving the Creator through contemplating His creations.\" — Ibn Tufayl" },
  { ar: "العلم شرف لا يملكه إلا من صبر على مرارة طلبه. — أبو الأسود الدؤلي", en: "\"Knowledge is an honor that belongs only to those who endure the bitterness of seeking it.\" — Abu Al-Aswad Al-Du'ali" },
  { ar: "أول العلم النية، ثم الاستماع، ثم الفهم، ثم العمل، ثم النشر. — عبد الله بن المبارك", en: "\"The beginning of knowledge is intention, then listening, then understanding, then action, then spreading it.\" — Abdullah ibn Al-Mubarak" },
  { ar: "الوقت هو مادة العلم، فمن أضاع وقته أضاع علمه. — ابن الجوزي", en: "\"Time is the substance of knowledge; whoever wastes their time wastes their knowledge.\" — Ibn Al-Jawzi" },
  { ar: "الحكمة هي معرفة الحق لصوابه، والباطل لفساده. — فخر الدين الرازي", en: "\"Wisdom is knowing truth for its correctness and falsehood for its corruption.\" — Fakhr Al-Din Al-Razi" },
  { ar: "الوسطية هي قمة الحكمة في الفهم والتطبيق. — يوسف القرضاوي", en: "\"Moderation is the pinnacle of wisdom in understanding and application.\" — Yusuf Al-Qaradawi" },
  { ar: "الفكر الإنساني نهر متدفق، والكتب هي ضفافه. — أحمد الوائلي", en: "\"Human thought is a flowing river, and books are its banks.\" — Ahmad Al-Waeli" },
  { ar: "العلم وسيلة لإعمار الأرض وفق منهج الله. — محمد متولي الشعراوي", en: "\"Knowledge is a means to develop the earth according to God's method.\" — Muhammad Metwalli Al-Sha'rawi" },
  { ar: "من قرأ كتاباً فكأنما عاش عمراً مع مؤلفه. — أبو حيان التوحيدي", en: "\"Whoever reads a book is as if they lived a lifetime with its author.\" — Abu Hayyan Al-Tawhidi" },
  { ar: "الحكمة هي الكلمة المختصرة التي تغني عن الكتب الطويلة. — الثعالبي", en: "\"Wisdom is the concise word that replaces lengthy books.\" — Al-Tha'alibi" },
  { ar: "العلم زينة للأغنياء ومال للفقراء. — الزمخشري", en: "\"Knowledge is an ornament for the rich and wealth for the poor.\" — Al-Zamakhshari" },
  { ar: "الحقيقة مرة، ولكنها الدواء الوحيد للجهل. — البيروني", en: "\"Truth is bitter, but it is the only cure for ignorance.\" — Al-Biruni" },
  { ar: "من لم يسافر لم يقرأ إلا صفحة واحدة من كتاب الدنيا. — ابن بطوطة", en: "\"Whoever has not traveled has only read one page of the book of the world.\" — Ibn Battuta" },
  { ar: "غاية العلوم نفع الناس وتخفيف آلامهم. — الزهراوي", en: "\"The purpose of sciences is to benefit people and alleviate their suffering.\" — Al-Zahrawi" },
  { ar: "المنهج العلمي يبدأ بالشك وينتهي باليقين المبني على التجربة. — الحسن بن الهيثم", en: "\"The scientific method begins with doubt and ends with certainty built on experiment.\" — Ibn Al-Haytham" },
  { ar: "العلم والعدل هما جناحا النهضة. — صلاح الدين الأيوبي", en: "\"Knowledge and justice are the two wings of renaissance.\" — Saladin" },
  { ar: "العلم لا يُعطى إلا لمن أخلص له النية والطلب. — المنصور", en: "\"Knowledge is only given to those who are sincere in their intention and pursuit.\" — Al-Mansur" },
  { ar: "المعرفة ذوق، والحكمة هي حال القلوب المستنيرة. — ابن العربي", en: "\"Knowledge is taste, and wisdom is the state of enlightened hearts.\" — Ibn Arabi" },
  { ar: "الكتابة لغة العقل الصامتة. — القلقشندي", en: "\"Writing is the silent language of the mind.\" — Al-Qalqashandi" },
  { ar: "العلم شجرة ثمارها الحكمة والعمل الصالح. — ابن عساكر", en: "\"Knowledge is a tree whose fruits are wisdom and righteous deeds.\" — Ibn Asakir" },
  { ar: "الكلمات مفاتيح المعاني، والكتب خزائنها. — الفيروز آبادي", en: "\"Words are the keys to meanings, and books are their treasuries.\" — Al-Fairuzabadi" },
  { ar: "المجتمع الجاهل يقدس الشخصيات، والمجتمع الواعي يقدس الأفكار. — علي الوردي", en: "\"An ignorant society worships personalities, while an aware society worships ideas.\" — Ali Al-Wardi" },
  { ar: "الحكمة تكمن في العودة إلى الفطرة الصافية. — إبراهيم الكوني", en: "\"Wisdom lies in returning to pure nature.\" — Ibrahim Al-Koni" },
  { ar: "القراءة هي الهروب الجميل من سجن الذات. — غادة السمان", en: "\"Reading is the beautiful escape from the prison of the self.\" — Ghada Al-Samman" },
  { ar: "الكتاب هو الرفيق الذي لا يمل حديثه ولا يتغير وده. — أمين الريحاني", en: "\"A book is the companion whose conversation never bores and whose affection never changes.\" — Amin Al-Rihani" },
  { ar: "الفكر المستنير هو الذي يرى النور في آخر النفق. — منصور خالد", en: "\"Enlightened thought is one that sees light at the end of the tunnel.\" — Mansour Khalid" },
  { ar: "العلم أمانة في عنق صاحبه، والحكمة هي حسن أداء الأمانة. — محمد سليم العوا", en: "\"Knowledge is a trust on its bearer's neck, and wisdom is the good fulfillment of that trust.\" — Muhammad Salim Al-Awa" },
  { ar: "العلم لا يعرف حدوداً، والحكمة هي توظيفه لخدمة البشرية. — أحمد زويل", en: "\"Knowledge knows no boundaries, and wisdom is employing it to serve humanity.\" — Ahmed Zewail" },
  { ar: "المعرفة هي الطريق الوحيد للوصول إلى النجوم. — فاروق الباز", en: "\"Knowledge is the only path to reach the stars.\" — Farouk El-Baz" },
  { ar: "العلم هو لغة عالمية توحد القلوب قبل العقول. — مجدي يعقوب", en: "\"Knowledge is a universal language that unites hearts before minds.\" — Magdi Yacoub" },
  { ar: "المثقف يجب أن يكون قلقاً دائماً، باحثاً عن الحقيقة لا عن الراحة. — إدوارد سعيد", en: "\"An intellectual must always be restless, seeking truth not comfort.\" — Edward Said" },
  { ar: "الكلمة التي لا تزلزل الأرض تحت أقدام الطغاة هي كلمة ميتة. — نزار قباني", en: "\"A word that does not shake the earth under the feet of tyrants is a dead word.\" — Nizar Qabbani" },
  { ar: "العلم الحقيقي هو الذي يحرر الإنسان من الخوف. — محمود محمد طه", en: "\"True knowledge is that which frees humanity from fear.\" — Mahmoud Muhammad Taha" },
  { ar: "القراءة هي السلاح الأقوى لكسر قيود التهميش. — فاطمة المرنيسي", en: "\"Reading is the most powerful weapon to break the chains of marginalization.\" — Fatima Mernissi" },
  { ar: "العلم ليس بكثرة الرواية، وإنما العلم نور يضعه الله في القلب. — مالك بن أنس", en: "\"Knowledge is not the abundance of narration, but a light God places in the heart.\" — Malik ibn Anas" },
  { ar: "من يطلب الحقيقة بصدق لا يخشى مراجعة أفكاره. — الحسن بن الهيثم", en: "\"Whoever seeks truth sincerely does not fear revisiting their ideas.\" — Ibn Al-Haytham" },
  { ar: "السعادة القصوى في التأمل العلمي والعمل الحكيم. — ابن باجة", en: "\"Ultimate happiness lies in scientific contemplation and wise action.\" — Ibn Bajja" },
  { ar: "الحكمة هي الانسجام مع قوانين الطبيعة الكلية. — ابن طفيل", en: "\"Wisdom is harmony with the universal laws of nature.\" — Ibn Tufayl" },
  { ar: "القارئ الجيد هو من يقرأ ما بين السطور لا الحروف فقط. — عبد الكريم بكار", en: "\"A good reader reads between the lines, not just the letters.\" — Abdel Karim Bakkar" },
  { ar: "الجهل بالدين أخطر من الجهل بالعلم المادي. — محمد الغزالي", en: "\"Ignorance of religion is more dangerous than ignorance of material science.\" — Muhammad Al-Ghazali" },
  { ar: "الحياة في سبيل فكرة هي الحياة الحقيقية. — سيد قطب", en: "\"Life for the sake of an idea is the true life.\" — Sayyid Qutb" },
  { ar: "الحكيم هو من يرى الفتنة وهي مقبلة، والجاهل يراها وهي مدبرة. — مصطفى السباعي", en: "\"The wise one sees discord as it approaches, while the ignorant sees it as it departs.\" — Mustafa Al-Siba'i" },
  { ar: "العلم والدين وجهان لعملة واحدة هي الحقيقة. — مصطفى محمود", en: "\"Science and religion are two sides of one coin: truth.\" — Mustafa Mahmoud" },
  { ar: "في حدائق الحكمة، نزرع الأفكار لنجني الأفعال العظيمة. — نبيل أحمد", en: "\"In the gardens of wisdom, we plant ideas to harvest great deeds.\" — Nabil Ahmad" },
  { ar: "المعرفة بلا عمل كالشجر بلا ثمر، والحكمة هي الثمرة المطلوبة. — ابن القيم", en: "\"Knowledge without action is like a tree without fruit, and wisdom is the desired fruit.\" — Ibn Al-Qayyim" },
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

  // ═══════════════════════════════════════════════════════════════════════
  // الصنف الثاني: مقولات الغرب الجديدة (100 مقولة إضافية)
  // New Western Quotes Expansion — 100 additional quotes
  // ═══════════════════════════════════════════════════════════════════════
  { ar: "الحياة غير المفحوصة لا تستحق أن تُعاش. — سقراط", en: "\"The unexamined life is not worth living.\" — Socrates" },
  { ar: "أنا أفكر، إذن أنا موجود. — رينيه ديكارت", en: "\"I think, therefore I am.\" — René Descartes" },
  { ar: "الشجاعة ليست غياب الخوف، بل الحكم بأن شيئاً آخر أهم من الخوف. — أمبروز ريدموند", en: "\"Courage is not the absence of fear, but the judgment that something else is more important than fear.\" — Ambrose Redmoon" },
  { ar: "كن التغيير الذي تريد أن تراه في العالم. — المهاتما غاندي", en: "\"Be the change you wish to see in the world.\" — Mahatma Gandhi" },
  { ar: "في وسط كل صعوبة تكمن فرصة. — ألبرت أينشتاين", en: "\"In the middle of difficulty lies opportunity.\" — Albert Einstein" },
  { ar: "السعي وراء الحقيقة والجمال هو مجال النشاط الذي يُسمح لنا فيه أن نبقى أطفالاً طوال حياتنا. — أينشتاين", en: "\"The pursuit of truth and beauty is a sphere of activity in which we are permitted to remain children all our lives.\" — Albert Einstein" },
  { ar: "التعليم هو إشعال شعلة، وليس ملء وعاء. — سقراط", en: "\"Education is the kindling of a flame, not the filling of a vessel.\" — Socrates" },
  { ar: "الحكمة الحقيقية تأتي لكل واحد منا عندما ندرك كم قليلاً نفهم عن الحياة. — سقراط", en: "\"True wisdom comes to each of us when we realize how little we understand about life.\" — Socrates" },
  { ar: "العقل المتفتح كالمظلة، لا يعمل إلا عندما يكون مفتوحاً. — فرانك زابا", en: "\"A mind is like a parachute. It doesn't work if it is not open.\" — Frank Zappa" },
  { ar: "ليس المهم أن تعيش سنوات كثيرة، بل المهم أن تعيش حياة كثيرة في سنواتك. — رالف والدو إيمرسون", en: "\"It is not the length of life, but the depth of life that matters.\" — Ralph Waldo Emerson" },
  { ar: "المعرفة تتكلم، لكن الحكمة تستمع. — جيمي هندريكس", en: "\"Knowledge speaks, but wisdom listens.\" — Jimi Hendrix" },
  { ar: "الخطأ الأكبر الذي يمكنك ارتكابه هو الخوف الدائم من ارتكاب خطأ. — إلبرت هوبارد", en: "\"The greatest mistake you can make is to be continually fearing you will make one.\" — Elbert Hubbard" },
  { ar: "كل ما نراه أو نبدو عليه ليس إلا حلماً داخل حلم. — إدغار آلان بو", en: "\"All that we see or seem is but a dream within a dream.\" — Edgar Allan Poe" },
  { ar: "الأمل هو الشيء ذو الريش الذي يجثم في الروح. — إميلي ديكنسون", en: "\"Hope is the thing with feathers that perches in the soul.\" — Emily Dickinson" },
  { ar: "الطريقة الوحيدة للقيام بعمل عظيم هي أن تحب ما تفعله. — ستيف جوبز", en: "\"The only way to do great work is to love what you do.\" — Steve Jobs" },
  { ar: "عش كما لو أنك ستموت غداً. تعلم كما لو أنك ستعيش للأبد. — المهاتما غاندي", en: "\"Live as if you were to die tomorrow. Learn as if you were to live forever.\" — Mahatma Gandhi" },
  { ar: "ليس كل من يتجول تائهاً. — ج. ر. ر. تولكين", en: "\"Not all those who wander are lost.\" — J.R.R. Tolkien" },
  { ar: "الحرية ليست شيئاً يُمنح بل يُؤخذ. — جيمس بالدوين", en: "\"Freedom is not something that anybody can be given. Freedom is something people take.\" — James Baldwin" },
  { ar: "الإنسان ليس سوى ما يصنعه بنفسه. — جان بول سارتر", en: "\"Man is nothing else but what he makes of himself.\" — Jean-Paul Sartre" },
  { ar: "الفن يغسل عن الروح غبار الحياة اليومية. — بابلو بيكاسو", en: "\"Art washes away from the soul the dust of everyday life.\" — Pablo Picasso" },
  { ar: "في النهاية، لن نتذكر كلمات أعدائنا، بل صمت أصدقائنا. — مارتن لوثر كينج", en: "\"In the end, we will remember not the words of our enemies, but the silence of our friends.\" — Martin Luther King Jr." },
  { ar: "الإبداع هو الذكاء وهو يستمتع. — ألبرت أينشتاين", en: "\"Creativity is intelligence having fun.\" — Albert Einstein" },
  { ar: "الرجل الذي يقرأ كثيراً ويستخدم عقله قليلاً يقع في عادات كسولة في التفكير. — أينشتاين", en: "\"Any man who reads too much and uses his own brain too little falls into lazy habits of thinking.\" — Albert Einstein" },
  { ar: "الحكمة هي ابنة التجربة. — ليوناردو دا فينشي", en: "\"Wisdom is the daughter of experience.\" — Leonardo da Vinci" },
  { ar: "من يتحكم في الماضي يتحكم في المستقبل، ومن يتحكم في الحاضر يتحكم في الماضي. — جورج أورويل", en: "\"Who controls the past controls the future. Who controls the present controls the past.\" — George Orwell" },
  { ar: "الفلسفة هي المعركة ضد سحر لغتنا على عقلنا. — لودفيغ فيتغنشتاين", en: "\"Philosophy is a battle against the bewitchment of our intelligence by means of language.\" — Ludwig Wittgenstein" },
  { ar: "التفكير هو أصعب أنواع العمل، ولعل هذا هو السبب في أن قلة قليلة تنخرط فيه. — هنري فورد", en: "\"Thinking is the hardest work there is, which is probably the reason why so few engage in it.\" — Henry Ford" },
  { ar: "العلم هو المعرفة المنظمة. الفن هو الإبداع المنظم. — ويل ديورانت", en: "\"Science is organized knowledge. Art is organized creativity.\" — Will Durant" },
  { ar: "أن تكون نفسك في عالم يحاول باستمرار أن يجعلك شيئاً آخر هو أعظم إنجاز. — إيمرسون", en: "\"To be yourself in a world that is constantly trying to make you something else is the greatest accomplishment.\" — Ralph Waldo Emerson" },
  { ar: "الأشياء لا تتغير، نحن نتغير. — هنري ديفيد ثورو", en: "\"Things do not change; we change.\" — Henry David Thoreau" },
  { ar: "السعادة ليست شيئاً جاهزاً. إنها تأتي من أفعالك الخاصة. — الدالاي لاما", en: "\"Happiness is not something readymade. It comes from your own actions.\" — Dalai Lama" },
  { ar: "الثقة بالنفس هي أول سر من أسرار النجاح. — إيمرسون", en: "\"Self-trust is the first secret of success.\" — Ralph Waldo Emerson" },
  { ar: "من يملك كتاباً ولا يقرأه ليس أفضل حالاً ممن لا يستطيع القراءة. — مارك توين", en: "\"A person who won't read has no advantage over one who can't read.\" — Mark Twain" },
  { ar: "العظمة ليست في أن لا تسقط أبداً، بل في أن تنهض كل مرة تسقط. — كونفوشيوس", en: "\"Our greatest glory is not in never falling, but in rising every time we fall.\" — Confucius" },
  { ar: "النجاح هو الانتقال من فشل إلى فشل دون فقدان الحماس. — ونستون تشرشل", en: "\"Success is stumbling from failure to failure with no loss of enthusiasm.\" — Winston Churchill" },
  { ar: "كلما تعلمت أكثر، كلما أدركت كم أنا جاهل. — سقراط", en: "\"The more I learn, the more I realize how much I don't know.\" — Socrates" },
  { ar: "الطريق الوحيد للخروج هو المرور من خلاله. — روبرت فروست", en: "\"The only way out is through.\" — Robert Frost" },
  { ar: "كل شيء يمكن تخيله هو حقيقي. — بابلو بيكاسو", en: "\"Everything you can imagine is real.\" — Pablo Picasso" },
  { ar: "لا شيء مستحيل، الكلمة نفسها تقول أنا ممكن. — أودري هيبورن", en: "\"Nothing is impossible, the word itself says 'I'm possible'!\" — Audrey Hepburn" },
  { ar: "العقل الذي لا يتغذى يأكل نفسه. — غور فيدال", en: "\"The mind that is not fed devours itself.\" — Gore Vidal" },
  { ar: "الثقافة هي ما يبقى بعد أن تنسى كل ما تعلمته. — ألبرت أينشتاين", en: "\"Culture is what remains after you have forgotten everything you learned.\" — Albert Einstein" },
  { ar: "من لا يعرف التاريخ محكوم عليه بتكراره. — جورج سانتايانا", en: "\"Those who cannot remember the past are condemned to repeat it.\" — George Santayana" },
  { ar: "الكتاب هو حلم تحمله في يدك. — نيل غيمان", en: "\"A book is a dream that you hold in your hand.\" — Neil Gaiman" },
  { ar: "القلم أقوى من السيف. — إدوارد بولوير-ليتون", en: "\"The pen is mightier than the sword.\" — Edward Bulwer-Lytton" },
  { ar: "العلم بدون دين أعرج، والدين بدون علم أعمى. — أينشتاين", en: "\"Science without religion is lame, religion without science is blind.\" — Albert Einstein" },
  { ar: "إذا تعلمت من الهزيمة، فأنت لم تُهزم حقاً. — زيغ زيغلار", en: "\"If you learn from defeat, you haven't really lost.\" — Zig Ziglar" },
  { ar: "الشخص الذي يقرأ يعيش ألف حياة قبل أن يموت. — جورج ر. ر. مارتن", en: "\"A reader lives a thousand lives before he dies. The man who never reads lives only one.\" — George R.R. Martin" },
  { ar: "التعليم هو السلاح الأقوى الذي يمكنك استخدامه لتغيير العالم. — نيلسون مانديلا", en: "\"Education is the most powerful weapon which you can use to change the world.\" — Nelson Mandela" },
  { ar: "المعرفة ليست لها قيمة إلا إذا وُضعت موضع التطبيق. — أنتون تشيخوف", en: "\"Knowledge is of no value unless you put it into practice.\" — Anton Chekhov" },
  { ar: "لا يمكن لأي شيء أن يُخمد النور الذي يشع من الداخل. — مايا أنجيلو", en: "\"Nothing can dim the light that shines from within.\" — Maya Angelou" },
  { ar: "الفضول هو العلامة الأكيدة للعقل النشط. — صمويل جونسون", en: "\"Curiosity is the sure sign of an active mind.\" — Samuel Johnson" },
  { ar: "الخيال هو بداية الخلق. — جورج برنارد شو", en: "\"Imagination is the beginning of creation.\" — George Bernard Shaw" },
  { ar: "الأفكار العظيمة تأتي من القلب. — ماركيز دي فوفينارغ", en: "\"Great thoughts come from the heart.\" — Marquis de Vauvenargues" },
  { ar: "لا يوجد حد للتعلم، والحياة هي مدرسة دائمة. — ألبرت شفايتزر", en: "\"There is no limit to learning, and life is a perpetual school.\" — Albert Schweitzer" },
  { ar: "الحكمة ليست نتاج التعليم بل نتاج محاولة الحصول عليها مدى الحياة. — أينشتاين", en: "\"Wisdom is not a product of schooling but of the lifelong attempt to acquire it.\" — Albert Einstein" },
  { ar: "نحن نقرأ لنعرف أننا لسنا وحدنا. — سي إس لويس", en: "\"We read to know we are not alone.\" — C.S. Lewis" },
  { ar: "الكتاب المفتوح هو عقل يتحدث. — مثل هندي", en: "\"An open book is a speaking mind.\" — Indian Proverb" },
  { ar: "المعرفة تكتسب بالجهد، لكن الحكمة تكتسب بالملاحظة. — ماريلين فوس سافانت", en: "\"Knowledge is acquired by effort, but wisdom is acquired by observation.\" — Marilyn vos Savant" },
  { ar: "لا تخف من النمو ببطء، بل خف من الوقوف ساكناً. — مثل صيني", en: "\"Do not fear growing slowly, fear only standing still.\" — Chinese Proverb" },
  { ar: "قرأت لأحيا. — غوستاف فلوبير", en: "\"I read to live.\" — Gustave Flaubert" },
  { ar: "المثقف هو من يستطيع أن يتأمل فكرة دون أن يتبناها بالضرورة. — أرسطو", en: "\"It is the mark of an educated mind to be able to entertain a thought without accepting it.\" — Aristotle" },
  { ar: "الإنسان الحر هو من يستطيع أن يرفض دعوة لعشاء دون أن يقدم عذراً. — جول رينار", en: "\"A free person is one who can refuse a dinner invitation without giving an excuse.\" — Jules Renard" },
  { ar: "العادات الصغيرة تصنع فروقاً كبيرة. — جيمس كلير", en: "\"Small habits make a big difference.\" — James Clear" },
  { ar: "أحب اللعبة لتأثيرها على تفكيري، لا لتأثير تفكيري عليها. — آلان تورينغ", en: "\"I admire the game for its effect on my mind, not my mind's effect on it.\" — Alan Turing" },
  { ar: "القلب الذي يحب هو دائماً شاب. — مثل يوناني", en: "\"A heart that loves is always young.\" — Greek Proverb" },
  { ar: "إذا أردت أن تذهب بسرعة، اذهب وحدك. وإذا أردت أن تذهب بعيداً، اذهب مع الآخرين. — مثل أفريقي", en: "\"If you want to go fast, go alone. If you want to go far, go together.\" — African Proverb" },
  { ar: "لا تحكم على كل يوم بالحصاد الذي تجنيه بل بالبذور التي تزرعها. — ستيفنسون", en: "\"Don't judge each day by the harvest you reap but by the seeds that you plant.\" — Robert Louis Stevenson" },
  { ar: "المستقبل ملك لأولئك الذين يؤمنون بجمال أحلامهم. — إليانور روزفلت", en: "\"The future belongs to those who believe in the beauty of their dreams.\" — Eleanor Roosevelt" },
  { ar: "كلما زادت ثقافتك قلّ خوفك من الحياة. — ويل ديورانت", en: "\"The more you learn, the less you fear.\" — Will Durant" },
  { ar: "الحقيقة نادراً ما تكون نقية وليست بسيطة أبداً. — أوسكار وايلد", en: "\"The truth is rarely pure and never simple.\" — Oscar Wilde" },
  { ar: "ثمن العظمة هو المسؤولية. — ونستون تشرشل", en: "\"The price of greatness is responsibility.\" — Winston Churchill" },
  { ar: "في الكتب تكمن روح كل الماضي. — توماس كارلايل", en: "\"In books lies the soul of the whole past.\" — Thomas Carlyle" },
  { ar: "المعرفة هي أفضل استثمار يمكنك القيام به. — بنيامين فرانكلين", en: "\"Knowledge is the best investment you can make.\" — Benjamin Franklin" },
  { ar: "الكتاب الذي لا يعطيك شيئاً جديداً في كل قراءة لا يستحق القراءة أصلاً. — أوسكار وايلد", en: "\"A book that does not give you something new with every reading does not deserve to be read at all.\" — Oscar Wilde" },
  { ar: "العقل الكبير يناقش الأفكار، والعقل المتوسط يناقش الأحداث، والعقل الصغير يناقش الأشخاص. — إليانور روزفلت", en: "\"Great minds discuss ideas, average minds discuss events, small minds discuss people.\" — Eleanor Roosevelt" },
  { ar: "السر في التقدم هو البدء. — مارك توين", en: "\"The secret of getting ahead is getting started.\" — Mark Twain" },
  { ar: "اقرأ كثيراً. فالقراءة الجيدة هي الخطوة الأساسية لتصبح كاتباً جيداً. — ستيفن كينغ", en: "\"Read a lot. Good reading is the essential step to becoming a good writer.\" — Stephen King" },
  { ar: "لا يوجد بديل للعمل الشاق. — توماس إديسون", en: "\"There is no substitute for hard work.\" — Thomas Edison" },
  { ar: "الحياة قصيرة جداً لقراءة الكتب السيئة. — جيمس برايس", en: "\"Life is too short for reading bad books.\" — James Bryce" },
  { ar: "الفلسفة تعلمنا أن نشك فيما يبدو واضحاً. — برتراند راسل", en: "\"Philosophy teaches us to doubt what seems obvious.\" — Bertrand Russell" },
  { ar: "الشك هو بداية الحكمة. — أرسطو", en: "\"Doubt is the beginning of wisdom.\" — Aristotle" },
  { ar: "كتاب واحد جيد يعلمك أكثر من مائة صديق سطحي. — مثل أوروبي", en: "\"One good book teaches you more than a hundred superficial friends.\" — European Proverb" },
  { ar: "اللحظة التي تتوقف فيها عن التعلم هي اللحظة التي تبدأ فيها بالموت. — ألبرت أينشتاين", en: "\"The moment you stop learning, you start dying.\" — Albert Einstein" },
  { ar: "ليس الذكاء هو ما يهم، بل الفضول. — أينشتاين", en: "\"It is not that I'm so smart, it's just that I stay with problems longer.\" — Albert Einstein" },
  { ar: "إن لم يكن لديك وقت للقراءة، فليس لديك وقت ولا أدوات للكتابة. — ستيفن كينغ", en: "\"If you don't have time to read, you don't have the time or the tools to write.\" — Stephen King" },
  { ar: "التغيير هو قانون الحياة، ومن ينظر فقط إلى الماضي أو الحاضر سيفتقد المستقبل. — جون كنيدي", en: "\"Change is the law of life, and those who look only to the past are certain to miss the future.\" — John F. Kennedy" },
  { ar: "العالم كتاب، ومن لم يسافر لم يقرأ منه إلا صفحة. — أوغسطين", en: "\"The world is a book and those who do not travel read only one page.\" — Saint Augustine" },
  { ar: "لا تخف من الفشل. خف من عدم المحاولة. — روي تي بينيت", en: "\"Do not fear failure. Fear being in the exact same place next year as you are today.\" — Roy T. Bennett" },
  { ar: "الذين يجرؤون على الفشل فشلاً ذريعاً يمكنهم أن يحققوا نجاحاً عظيماً. — جون كنيدي", en: "\"Only those who dare to fail greatly can ever achieve greatly.\" — John F. Kennedy" },
  { ar: "التعلم المستمر هو الحد الأدنى المطلوب للنجاح في أي مجال. — دينيس وايتلي", en: "\"Continuous learning is the minimum requirement for success in any field.\" — Denis Waitley" },
  { ar: "الكتاب الذي يُقرأ مرة واحدة لا يستحق أن يُقرأ حتى مرة. — كارل ويبر", en: "\"A book worth reading is worth reading twice.\" — Carl Weber" },
  { ar: "القراءة تعطيك صوتاً فريداً في عالم صاخب. — ميشيل أوباما", en: "\"Reading gives you a unique voice in a noisy world.\" — Michelle Obama" },
  { ar: "الفشل هو التوابل التي تعطي النجاح نكهته. — ترومان كابوتي", en: "\"Failure is the condiment that gives success its flavor.\" — Truman Capote" },
  { ar: "إذا كان بإمكانك أن تحلم به، يمكنك أن تفعله. — والت ديزني", en: "\"If you can dream it, you can do it.\" — Walt Disney" },
  { ar: "سر السعادة لا يكمن في السعي وراء المزيد، بل في القدرة على الاستمتاع بالأقل. — سينيكا", en: "\"The secret of happiness is not in seeking more, but in developing the capacity to enjoy less.\" — Seneca" },
  { ar: "التعليم ليس ملء دلو، بل إشعال نار. — وليام بتلر ييتس", en: "\"Education is not the filling of a pail, but the lighting of a fire.\" — William Butler Yeats" },
  { ar: "الكلمات هي أقوى المخدرات التي تستخدمها البشرية. — روديارد كيبلينغ", en: "\"Words are the most powerful drugs used by mankind.\" — Rudyard Kipling" },
  { ar: "من يفتح باب مدرسة يغلق باب سجن. — فيكتور هوغو", en: "\"He who opens a school door, closes a prison.\" — Victor Hugo" },
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
    // SEQUENCE 2A: كل نصف ساعة — ثلاث مقولات حكمية متتالية
    // Three scholarly quotes every 30 minutes (for 12 hours = 24 batches)
    // ===================================================================

    const QUOTE_INTERVAL_MS = 30 * 60 * 1000; // 30 دقيقة
    const QUOTE_BATCHES = 24; // 12 ساعة = 24 دفعة
    const QUOTES_PER_BATCH = 3; // 3 مقولات في كل دفعة

    const usedQuoteIndices: number[] = [];
    const getUniqueQuote = (): typeof quotes[0] => {
      let index: number;
      do {
        index = Math.floor(Math.random() * quotes.length);
      } while (usedQuoteIndices.includes(index) && usedQuoteIndices.length < quotes.length);
      usedQuoteIndices.push(index);
      return quotes[index];
    };

    for (let batch = 0; batch < QUOTE_BATCHES; batch++) {
      const batchBaseDelay = (batch + 1) * QUOTE_INTERVAL_MS;
      for (let q = 0; q < QUOTES_PER_BATCH; q++) {
        const quote = getUniqueQuote();
        // الفجوة بين المقولات الثلاث داخل نفس الدفعة: دقيقة واحدة بينهما
        const quoteDelay = batchBaseDelay + q * 60 * 1000;
        notifications.push({
          id: ++notifId,
          title: isAR ? '🕯️ تأمُّلٌ في المحراب' : '🕯️ Sanctuary Contemplation',
          body: isAR ? quote.ar : quote.en,
          smallIcon: 'ic_stat_icon',
          largeIcon: 'ic_launcher',
          iconColor: '#ff0000',
          schedule: { at: new Date(now + quoteDelay), allowWhileIdle: true }
        });
      }
    }

    // ===================================================================
    // SEQUENCE 2B: كل 3 ساعات — إشعار إحصائي شامل (إحصائيات + كتب + رصيد)
    // Comprehensive stats notification every 3 hours (for 12 hours = 4 batches)
    // ===================================================================

    const STATS_INTERVAL_MS = 3 * 60 * 60 * 1000; // 3 ساعات
    const STATS_BATCHES = 4; // 4 دفعات تغطي 12 ساعة

    // تسلسل الإشعارات الإحصائية الدورية
    const statsSequence = ['summary', 'books', 'cumulative', 'motivation'];

    for (let s = 0; s < STATS_BATCHES; s++) {
      const statsDelay = (s + 1) * STATS_INTERVAL_MS;
      const type = statsSequence[s % statsSequence.length];
      let title = '';
      let body = '';
      const totalH = (stats.totalMins / 60).toFixed(1);

      switch (type) {
        case 'summary': {
          // ملخص الأداء + عدد الكتب + دقائق اليوم
          title = isAR ? '📊 تقرير المحراب الشامل' : '📊 Sanctuary Comprehensive Report';
          body = isAR
            ? `📖 دقائق اليوم: ${stats.todayMins} دقيقة\n📚 عدد الكتب في مكتبتك: ${stats.totalBooks} مجلد\n⭐ النجوم المكتسبة: ${stats.totalStars}\n🔥 سلسلة الالتزام: ${stats.streak} يوم متواصل`
            : `📖 Today: ${stats.todayMins} min\n📚 Library: ${stats.totalBooks} volumes\n⭐ Stars: ${stats.totalStars}\n🔥 Streak: ${stats.streak} days`;
          break;
        }
        case 'books': {
          // نداء الكتب مع الإحصائيات
          if (stats.bookBreakdown.length > 0) {
            const randomBook = stats.bookBreakdown[Math.floor(Math.random() * stats.bookBreakdown.length)];
            title = isAR ? '📚 نداء المخطوطات — مكتبتك بانتظارك' : '📚 Your Library Awaits';
            body = isAR
              ? `كتاب "${randomBook.title}" ينتظرك (${randomBook.mins} دقيقة سابقة).\n📚 محرابك يحتوي على ${stats.totalBooks} مجلد | ⭐ ${stats.totalStars} نجمة | 🏛️ ${totalH} ساعة تراكمية.`
              : `"${randomBook.title}" awaits (${randomBook.mins} min read).\n📚 Library: ${stats.totalBooks} | ⭐ ${stats.totalStars} stars | 🏛️ ${totalH}h total.`;
          } else {
            title = isAR ? '📚 ابدأ رحلتك الفكرية' : '📚 Begin Your Journey';
            body = isAR
              ? `محرابك يحتوي على ${stats.totalBooks} مجلد ينتظر عقلك. كل قراءة هي لبنة في صرح وعيك المتين.`
              : `Your sanctuary holds ${stats.totalBooks} volumes awaiting your mind. Every reading session builds your intellectual monument.`;
          }
          break;
        }
        case 'cumulative': {
          // الرصيد التراكمي الكامل
          title = isAR ? '🏛️ رصيدك المعرفي التراكمي' : '🏛️ Your Cumulative Knowledge Capital';
          body = isAR
            ? `🏛️ الرصيد التراكمي: ${totalH} ساعة من التأمل والمعرفة\n⭐ النجوم: ${stats.totalStars} | 📚 الكتب: ${stats.totalBooks}\n🔥 يوم ${stats.streak} من رحلتك المعرفية — أنت من الـ 3% الذين يصنعون الفرق.`
            : `🏛️ Capital: ${totalH}h | ⭐ Stars: ${stats.totalStars} | 📚 Books: ${stats.totalBooks}\n🔥 Day ${stats.streak} of your journey — you are among the 3% who make the difference.`;
          break;
        }
        case 'motivation': {
          // تحفيز مع إحصائيات
          title = isAR ? '🔥 لحظة النخبة المعرفية' : '🔥 Elite Knowledge Moment';
          body = isAR
            ? `القراءة ليست هواية — هي تمرين يومي لعضلة الحكمة.\n📖 اليوم: ${stats.todayMins} دقيقة | 📚 ${stats.totalBooks} كتاب | 🏛️ ${totalH} ساعة تراكمية.\nالعالَمُ بحاجة إلى عقلك المستنير — عُد الآن.`
            : `Reading is not a hobby — it is daily exercise for the wisdom muscle.\n📖 Today: ${stats.todayMins} min | 📚 ${stats.totalBooks} books | 🏛️ ${totalH}h total.\nThe world needs your enlightened mind — return now.`;
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
        schedule: { at: new Date(now + statsDelay), allowWhileIdle: true }
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
// ===================================================================
// SMART RE-ENGAGEMENT SYSTEM (8+ Hours Inactivity Detection)
// منظومة إعادة التفاعل الذكية — تُكثّف الإشعارات عند الغياب لأكثر من 8 ساعات
// ===================================================================
export const scheduleReengagementNotifications = async (
  lang: 'ar' | 'en',
  stats: NotificationStats,
  inactiveHours: number
) => {
  // Only activate if inactive for 8+ consecutive hours
  if (inactiveHours < 8) return;

  try {
    const hasPermission = await LocalNotifications.checkPermissions();
    if (hasPermission.display !== 'granted') return;

    const isAR = lang === 'ar';
    const now = Date.now();
    const notifications: any[] = [];
    const quotes = getQuotesForLanguage(lang);
    let notifId = 8000;

    // Determine escalation tier based on inactivity duration
    const tier = inactiveHours >= 48 ? 'critical' 
               : inactiveHours >= 24 ? 'high' 
               : 'moderate'; // 8-24h

    // Notification intervals (minutes) — tighter for longer absence
    const intervalMins = tier === 'critical' ? 15 : tier === 'high' ? 20 : 30;
    const totalSlots = tier === 'critical' ? 12 : tier === 'high' ? 8 : 5;

    // ── IMMEDIATE RE-ENGAGEMENT ALERT ──
    const inactiveHoursRounded = Math.floor(inactiveHours);
    notifications.push({
      id: ++notifId,
      title: isAR ? '🏛️ المحراب يتذكرك' : '🏛️ The Sanctuary Remembers You',
      body: isAR
        ? `مضى ${inactiveHoursRounded} ساعة منذ آخر جلسة قراءة. مخطوطاتك تنتظرك — دقيقتان فقط تكفي لإشعال شعلة الحكمة من جديد.`
        : `${inactiveHoursRounded} hours since your last session. Your manuscripts await — just 2 minutes can reignite the flame of wisdom.`,
      smallIcon: 'ic_stat_icon',
      largeIcon: 'ic_launcher',
      iconColor: '#ff0000',
      schedule: { at: new Date(now + 30 * 1000), allowWhileIdle: true }
    });

    // ── STREAK URGENCY (if streak exists) ──
    if (stats.streak > 0) {
      notifications.push({
        id: ++notifId,
        title: isAR ? '🚨 سلسلة الالتزام في خطر!' : '🚨 Your Streak is at Risk!',
        body: isAR
          ? `سلسلة ${stats.streak} يوماً من القراءة المتواصلة مهددة بالانكسار. عُد الآن قبل فوات الأوان — حافظ على إرثك الفكري.`
          : `Your ${stats.streak}-day reading streak is in danger. Return now before it's too late — protect your intellectual legacy.`,
        smallIcon: 'ic_stat_icon',
        largeIcon: 'ic_launcher',
        iconColor: '#ff0000',
        schedule: { at: new Date(now + 2 * 60 * 1000), allowWhileIdle: true }
      });
    }

    // ── INTENSIFIED SCHOLARLY REFERENCES SEQUENCE ──
    const usedIndices: number[] = [];
    const getUniqueQuote = (): typeof quotes[0] => {
      let index: number;
      do {
        index = Math.floor(Math.random() * quotes.length);
      } while (usedIndices.includes(index) && usedIndices.length < quotes.length);
      usedIndices.push(index);
      return quotes[index];
    };

    const reengagementTypes = tier === 'critical'
      ? ['quote', 'motivation', 'quote', 'summary', 'quote', 'motivation', 'quote', 'urgency', 'quote', 'motivation', 'quote', 'summary']
      : tier === 'high'
      ? ['quote', 'motivation', 'quote', 'summary', 'quote', 'motivation', 'quote', 'urgency']
      : ['quote', 'motivation', 'quote', 'summary', 'quote'];

    for (let i = 0; i < Math.min(reengagementTypes.length, totalSlots); i++) {
      const type = reengagementTypes[i];
      const delay = (i + 1) * intervalMins * 60 * 1000;
      let title = '';
      let body = '';

      switch (type) {
        case 'quote': {
          const quote = getUniqueQuote();
          title = isAR ? '📜 من حدائق الحكمة' : '📜 From the Gardens of Wisdom';
          body = isAR ? quote.ar : quote.en;
          break;
        }
        case 'motivation': {
          title = isAR ? '🔥 نداء العودة للمعرفة' : '🔥 The Call to Return';
          body = isAR
            ? `القراءة ليست مجرد عادة — إنها صلاة العقل. عقلك يحتاج غذاءه اليومي. عُد إلى محرابك الفكري ولو لدقائق معدودة.`
            : `Reading is not just a habit — it is the prayer of the mind. Your intellect needs its daily nourishment. Return to your sanctuary, even for just a few minutes.`;
          break;
        }
        case 'summary': {
          const totalH = (stats.totalMins / 60).toFixed(1);
          title = isAR ? '📊 رصيدك المعرفي ينتظرك' : '📊 Your Knowledge Awaits';
          body = isAR
            ? `رصيدك التراكمي: ${totalH} ساعة | ${stats.totalStars} نجمة | ${stats.totalBooks} كتاب. لا تدع هذا الإرث يتوقف عند هذا الحد.`
            : `Cumulative capital: ${totalH}h | ${stats.totalStars} stars | ${stats.totalBooks} books. Don't let this legacy stall here.`;
          break;
        }
        case 'urgency': {
          title = isAR ? '⚡ لحظة الحقيقة' : '⚡ Moment of Truth';
          body = isAR
            ? `كل ساعة بدون قراءة تُضعف الوصلات العصبية التي بنيتها. الدماغ لا ينتظر — عُد الآن وأعد تنشيط مسارات التعلم.`
            : `Every hour without reading weakens the neural pathways you built. The brain doesn't wait — return now and reactivate your learning circuits.`;
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
    console.error("Re-engagement notifications scheduling failed:", e);
  }
};

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
