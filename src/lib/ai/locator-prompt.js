// Reads a shopper's sentence in the widget's "Search with AI" box into the
// structured intent the locator search already knows how to answer.
//
// WHY THERE IS NO GENERATIVE MODEL BEHIND THIS
// -------------------------------------------
// Same reasoning as src/lib/ai/models.js: this runs for anonymous visitors on a
// merchant's storefront, where a wrong answer is a shopper driving to a shut
// store. Every condition below is a deterministic rule over the merchant's OWN
// data, so the worst this can do is fail to understand a phrase — never invent a
// location, an opening time, or an address that isn't in the database.
//
// MULTI-LANGUAGE WITHOUT LANGUAGE DETECTION
// -----------------------------------------
// Every concept carries its phrasings in all of the locales the widget ships UI
// copy for (see utils/constant/locator-languages.js), and the text is matched
// against ALL of them at once. Nothing has to guess which language was typed, a
// shopper can mix two of them in one sentence, and a locator set to French still
// understands a visitor who types in English.
//
// Matching is substring-based rather than word-boundary based on purpose:
// Japanese, Korean, Chinese and Arabic have no \b to anchor to. Each concept's
// phrases are sorted longest-first so "near me" is consumed before "near".
//
// WHAT IS LEFT OVER IS THE ANSWER TO "WHERE"
// ------------------------------------------
// Once every recognised phrase has been consumed, whatever words remain are the
// shopper's own nouns: a city, a store name, a word they remember from the
// merchant's notes. Those are matched against the locator's real rows rather
// than geocoded first (see lib/ai/locator-search.js), which is what makes
// "manila", "マニラ" and "مانيلا" all work without a translation table.

/* ---------------------------------------------------------------------- *
 * Phrase book
 * ------------------------------------------------------------------- */

/** Longest-first, so a longer phrase is consumed before a prefix of it. */
const byLength = (list) => [...new Set(list)].sort((a, b) => b.length - a.length);

const PHRASES = {
    nearMe: byLength([
        'near me', 'nearby', 'near by', 'around me', 'close to me', 'closest to me', 'closest', 'nearest',
        'my location', 'my current location', 'current location', 'where i am', 'around here', 'near my location',
        'of me', 'from me', 'to me', 'of my location', 'from my location', 'from here', 'of here',
        'près de moi', 'pres de moi', 'à proximité', 'a proximite', 'autour de moi', 'proche de moi', 'le plus proche',
        'cerca de mi', 'cerca de mí', 'cercanas a mi', 'más cercano', 'mas cercano', 'cerca de aquí', 'cerca de aqui',
        'in meiner nähe', 'in meiner nahe', 'in der nähe', 'in der nahe', 'um mich herum', 'am nächsten', 'am nachsten',
        'vicino a me', 'nelle vicinanze', 'più vicino', 'piu vicino', 'qui vicino',
        'perto de mim', 'próximo de mim', 'proximo de mim', 'nas proximidades', 'mais perto',
        'bij mij in de buurt', 'in de buurt', 'dichtbij', 'dichtstbijzijnde',
        '私の近く', '近くの', '近く', '近所', '付近', '最寄り',
        '내 근처', '근처에', '근처', '가까운', '제일 가까운',
        '我附近', '离我最近', '離我最近', '附近的', '附近',
        'بالقرب مني', 'قريب مني', 'القريبة مني', 'الأقرب',
        'malapit sa akin', 'malapit sa aking lokasyon', 'pinakamalapit sa akin', 'pinakamalapit',
        'malapit dito', 'nasa paligid ko', 'kung nasaan ako',
    ]),
    /*
     * The merchant-set TRADING STATE — `location_status` on the location, not a
     * question about opening hours.
     *
     * Consumed before the schedule vocabulary below, because every one of these
     * phrases contains a schedule word that would otherwise swallow it:
     * "temporarily closed" reads as "closed", "opening soon" reads as "opening".
     * Losing the distinction is how "locations with coming soon" came back with
     * the temporarily-closed ones too.
     */
    comingSoon: byLength([
        'coming soon', 'opening soon', 'soon to open', 'not open yet', 'due to open', 'yet to open',
        'about to open', 'new store', 'new branch', 'future location',
        'opens soon', 'opening shortly', 'will open soon',
        'bientôt ouvertes', 'bientôt ouverts', 'bientôt ouverte', 'bientôt ouvert',
        'bientot ouvertes', 'bientot ouverts', 'bientot ouverte', 'bientot ouvert',
        'ouvrent bientôt', 'ouvre bientôt', 'ouverture prochaine', 'prochaine ouverture', 'prochainement',
        'próximamente', 'proximamente', 'próxima apertura', 'proxima apertura', 'apertura próxima',
        'abrirá pronto', 'abrirán pronto', 'abriran pronto', 'abre pronto', 'abren pronto',
        'demnächst', 'demnachst', 'demnächst geöffnet', 'bald geöffnet', 'bald geoffnet', 'eröffnet bald',
        'eröffnen bald', 'öffnet bald', 'öffnen bald', 'neueröffnung',
        'prossima apertura', 'prossimamente', 'in arrivo', 'apertura prossima', 'aprirà presto', 'aprira presto',
        'apriranno presto', 'apre presto',
        'em breve', 'próxima abertura', 'proxima abertura', 'brevemente', 'abre em breve', 'abrirá em breve',
        'abrira em breve', 'abrem em breve',
        'binnenkort open', 'binnenkort', 'opent binnenkort', 'openen binnenkort',
        '近日オープン', 'オープン予定', '近日開店', '開店予定', '新規オープン',
        '곧 오픈', '오픈 예정', '개점 예정', '오픈 준비',
        '即将开业', '即将开幕', '近期开业', '即将开张',
        '即將開業', '即將開幕', '近期開業',
        'قريبا', 'قريباً', 'الافتتاح قريبا', 'افتتاح قريب',
    ]),
    temporarilyClosed: byLength([
        'temporarily closed', 'temporary closed', 'closed temporarily', 'temporarily shut', 'temporarily unavailable',
        'closed for now', 'under renovation', 'closed for renovation',
        'fermés temporairement', 'fermé temporairement', 'fermées temporairement', 'fermée temporairement',
        'fermes temporairement', 'fermees temporairement',
        'temporairement fermés', 'temporairement fermé', 'temporairement fermées', 'temporairement fermée',
        'fermeture temporaire', 'fermé provisoirement', 'fermés provisoirement',
        'cerrados temporalmente', 'cerrado temporalmente', 'cerradas temporalmente', 'cerrada temporalmente',
        'temporalmente cerrados', 'temporalmente cerrado', 'temporalmente cerradas', 'cierre temporal',
        'vorübergehend geschlossen', 'voruebergehend geschlossen', 'temporär geschlossen', 'temporar geschlossen',
        'temporaneamente chiusi', 'temporaneamente chiuso', 'temporaneamente chiuse', 'temporaneamente chiusa',
        'chiusi temporaneamente', 'chiuso temporaneamente', 'chiusura temporanea',
        'temporariamente fechados', 'temporariamente fechado', 'temporariamente fechadas', 'temporariamente fechada',
        'fechados temporariamente', 'fechado temporariamente', 'encerrado temporariamente',
        'tijdelijk gesloten', 'tijdelijk dicht',
        '一時休業', '臨時休業', '一時閉店', '休業中',
        '임시 휴업', '임시 폐점', '잠시 휴업', '휴업 중',
        '暂时关闭', '暂停营业', '暫時關閉', '暫停營業',
        'مغلق مؤقتا', 'مغلق مؤقتاً', 'مغلقة مؤقتا', 'إغلاق مؤقت',
    ]),
    /*
     * The word "status" and its translations — a LABEL for the trading state,
     * never part of the answer.
     *
     * Without this, "show me all locations status coming soon" understood the
     * status perfectly and then returned nothing: "status" was left over as one
     * of the shopper's own words, so every location also had to have the word
     * "status" written on it somewhere. The value phrases below match whether
     * or not the label is there; this just makes sure the label doesn't count
     * as a search term. A colon or an equals sign is a word boundary here, so
     * "status: coming soon" needs no entry of its own.
     */
    statusLabel: byLength([
        'status', 'statuses', 'state of', 'condition',
        'statut', 'statuts', 'état', 'etat',
        'estado', 'estados', 'situación', 'situacion',
        'zustand', 'stato', 'stati', 'situação', 'situacao',
        'toestand', 'status van',
        'ステータス', '状態', '営業状態',
        '상태', '영업 상태',
        '状态', '狀態', '营业状态', '營業狀態',
        'الحالة', 'حالة', 'الوضع',
    ]),
    operational: byLength([
        'open for business', 'operational', 'trading', 'currently trading', 'already open', 'up and running',
        'en activité', 'en activite', 'en service',
        'en funcionamiento', 'operativo', 'operativas', 'ya abiertas',
        'in betrieb', 'in betrieb genommen', 'bereits geöffnet',
        'in attività', 'in attivita', 'operativi', 'già aperti', 'gia aperti',
        'em funcionamento', 'operacional', 'já abertas', 'ja abertas',
        'in bedrijf', 'al geopend',
        'status open', 'status is open', 'status active', 'currently operating',
        '営業中の店舗', '通常営業',
        '정상 영업', '운영 중',
        '正常营业', '正在运营', '正常營業', '正在營運',
        'قيد التشغيل', 'تعمل بالفعل',
    ]),
    openNow: byLength([
        'open now', 'open right now', 'currently open', 'open at the moment', 'open at this time', 'still open',
        'ouverts actuellement', 'ouvert actuellement', 'ouvertes actuellement', 'en ce moment ouvert',
        'abiertas ahora', 'abiertos ahora', 'abierto en este momento', 'ahora abierto',
        'jetzt geöffnet', 'gerade geöffnet', 'aktuell geöffnet', 'momentan geöffnet',
        'aperto adesso', 'aperti adesso', 'aperto ora', 'aperti ora',
        'aberto agora', 'abertos agora', 'nu geopend', 'momenteel geopend',
        '現在営業中', '営業中', '지금 영업 중', '현재 영업 중', '正在营业', '正在營業',
        'مفتوح الآن', 'المفتوحة الآن',
        'bukas ngayon', 'bukas na ngayon', 'kasalukuyang bukas', 'nakabukas ngayon',
        'open today right now', 'that are open now', 'opened now',
        'ouvert maintenant', 'ouverts maintenant', 'actuellement ouvert', 'ouvert en ce moment',
        'abierto ahora', 'abiertos ahora', 'abierto en este momento', 'actualmente abierto',
        'jetzt geöffnet', 'jetzt geoffnet', 'jetzt öffnen', 'jetzt öffnet', 'gerade geöffnet', 'gerade geoffnet', 'aktuell geöffnet',
        'aperto adesso', 'aperti adesso', 'aperto ora', 'attualmente aperto',
        'aberto agora', 'abertos agora', 'aberto neste momento',
        'nu open', 'nu geopend', 'momenteel open',
        '今営業している', '今営業', '今開いて', '現在営業', '営業中',
        '지금 영업 중인', '지금 영업하는', '지금 영업', '지금 열린', '현재 영업', '영업 중인', '영업 중', '영업중',
        '现在营业', '现在开门', '正在营业', '現在營業', '現在開門',
        'مفتوح الآن', 'مفتوحة الآن', 'يعمل الآن',
    ]),
    open: byLength([
        'are open', 'is open', 'that open', 'open', 'opening',
        'bukas', 'nakabukas', 'bukas ba',
        'ouvert', 'ouverts', 'ouvre',
        'abierto', 'abiertos', 'abierta', 'abiertas', 'abre',
        'geöffnet', 'geoffnet', 'offen',
        'aperto', 'aperti', 'aperta', 'aperte',
        'aberto', 'abertos', 'aberta', 'abertas',
        'open zijn', 'geopend',
        '営業している', '開いている', 'している', '営業', '開いて', '開店',
        '영업하는', '영업', '여는', '열린', '문 여는',
        '营业', '开门', '營業', '開門',
        'مفتوح', 'مفتوحة', 'تفتح',
    ]),
    closed: byLength([
        'that are closed right now', 'that are closed now', 'are closed right now', 'are closed now',
        'closed right now', 'closed at the moment', 'closed at this time', 'currently closed', 'closed now',
        'are closed', 'is closed', 'that are closed', 'closed', 'shut', 'not open',
        'sarado', 'nakasara', 'saradong', 'sarado ngayon', 'hindi bukas',
        'fermé', 'ferme', 'fermés', 'fermes', 'fermée', 'fermees',
        'cerrado', 'cerrados', 'cerrada', 'cerradas',
        'geschlossen', 'zu haben', 'nicht geöffnet',
        'chiuso', 'chiusi', 'chiusa', 'chiuse',
        'fechado', 'fechados', 'fechada', 'fechadas',
        'gesloten', 'dicht',
        '閉店', '休業', '閉まって', '営業していない',
        '닫은', '닫힌', '휴무', '영업하지 않는',
        '关门', '休息', '不营业', '關門', '不營業',
        'مغلق', 'مغلقة', 'مقفل',
    ]),
    open24: byLength([
        '24 hours', '24hours', '24-hour', '24 hour', '24/7', '24 7', 'twenty four hours', 'round the clock',
        'all day and night', 'always open', 'open 24',
        '24 heures', '24h/24', 'ouvert 24h', 'en continu',
        '24 horas', 'las 24 horas', 'todo el día', 'todo el dia', 'siempre abierto',
        '24 stunden', 'rund um die uhr', 'durchgehend geöffnet',
        '24 ore', 'sempre aperto', 'aperto 24 ore',
        '24 uur', 'de klok rond', 'altijd open',
        '24時間', '24 時間', '終日',
        '24시간', '24 시간', '연중무휴',
        '24小时', '24 小时', '24小時', '全天',
        '٢٤ ساعة', '24 ساعة', 'طوال اليوم',
    ]),
    daylight: byLength([
        'day light', 'daylight', 'during the day', 'in the daytime', 'daytime', 'day time', 'during daytime',
        'in the morning', 'morning', 'afternoon', 'during office hours', 'office hours', 'business hours',
        'en journée', 'en journee', 'la journée', 'la journee', 'le matin', 'matin', 'après-midi', 'apres-midi',
        'durante el día', 'durante el dia', 'de día', 'de dia', 'por la mañana', 'por la manana', 'mañana', 'tarde',
        'tagsüber', 'tagsuber', 'am tag', 'am morgen', 'morgens', 'vormittag', 'nachmittag',
        'di giorno', 'durante il giorno', 'la mattina', 'mattina', 'pomeriggio',
        'durante o dia', 'de dia', 'pela manhã', 'pela manha', 'manhã', 'manha',
        'overdag', 'in de ochtend', 'ochtend', 'middag',
        '日中', '昼間', '昼', '午前', '朝',
        '낮에', '낮', '주간', '오전', '아침',
        '白天', '日间', '白晝', '日間', '上午', '早上',
        'نهارا', 'في النهار', 'النهار', 'صباحا', 'الصباح',
    ]),
    night: byLength([
        'night time', 'nighttime', 'at night', 'night', 'late night', 'in the evening', 'evening', 'after dark',
        'la nuit', 'de nuit', 'nuit', 'le soir', 'soir', 'en soirée', 'en soiree',
        'de noche', 'por la noche', 'noche', 'nocturno', 'nocturnas',
        'nachts', 'in der nacht', 'nacht', 'abends', 'am abend', 'abend',
        'di notte', 'la notte', 'notte', 'la sera', 'sera',
        'à noite', 'a noite', 'noite', 'noturno', 'de noite',
        "'s nachts", 'nachts', 'nacht', 'avond', "'s avonds",
        '夜間', '深夜', '夜中', '夜', '晩', '夕方',
        '밤에', '밤', '야간', '심야', '저녁',
        '夜间', '晚上', '深夜', '夜裡', '夜間', '傍晚',
        'ليلا', 'في الليل', 'الليل', 'مساء', 'المساء',
    ]),
    today: byLength([
        'today', "today's", 'this day',
        "aujourd'hui", 'aujourd hui', 'ce jour',
        'hoy', 'el día de hoy', 'el dia de hoy',
        'heute',
        'oggi',
        'hoje',
        'vandaag',
        '今日', '本日', 'きょう',
        '오늘',
        '今天', '今日',
        'اليوم',
    ]),
    tomorrow: byLength([
        'tomorrow', 'demain', 'mañana por', 'manana por', 'morgen', 'domani', 'amanhã', 'amanha', 'غدا', '明日', '내일', '明天',
    ]),
    weekend: byLength([
        'weekend', 'weekends', 'week-end', 'fin de semana', 'wochenende', 'fine settimana', 'fim de semana',
        '週末', '주말', '周末', '週末', 'عطلة نهاية الأسبوع',
    ]),
    weekdays: byLength([
        'weekdays', 'week days', 'working days', 'business days', 'jours de semaine', 'jours ouvrables',
        'días laborables', 'dias laborables', 'wochentags', 'werktags', 'giorni feriali', 'dias úteis', 'dias uteis',
        'weekdagen', 'werkdagen', '平日', '평일', '工作日', 'أيام العمل',
    ]),
    named: byLength([
        'named', 'called', 'by the name of', 'the name', 'name is', 'store named', 'location named',
        'nommé', 'nomme', 'appelé', 'appele', 'qui s appelle', 'du nom de',
        'llamado', 'llamada', 'que se llama', 'con el nombre',
        'namens', 'mit dem namen', 'genannt', 'heißt', 'heisst',
        'chiamato', 'chiamata', 'di nome',
        'chamado', 'chamada', 'com o nome',
        'genaamd', 'met de naam',
        'という名前', '名前が', '名前は', '名の',
        '이름이', '이름은', '라는 이름',
        '名为', '名叫', '名為', '叫做',
        'المسمى', 'باسم', 'اسمه',
    ]),
    within: byLength([
        'within', 'inside', 'in a radius of', 'radius of', 'radius', 'range of', 'up to',
        'dans un rayon de', 'rayon de', 'rayon', 'à moins de', 'a moins de',
        'en un radio de', 'radio de', 'radio', 'a menos de', 'dentro de',
        'im umkreis von', 'umkreis', 'radius von', 'innerhalb von',
        'nel raggio di', 'raggio di', 'raggio', 'entro',
        'num raio de', 'raio de', 'raio', 'dentro de',
        'binnen een straal van', 'straal van', 'binnen',
        '以内', '圏内', '半径',
        '이내', '반경',
        '范围内', '半径', '以内', '範圍內',
        'في نطاق', 'ضمن', 'نصف قطر',
    ]),
    /*
     * MAP COMMANDS — an instruction to the VIEW, not a question about the data.
     *
     * "move the map to bayambang" and "show me the map of bayambang" are not
     * asking which stores are there; they are asking to be shown the place. The
     * distinction matters because it changes what "nothing found" means: a
     * search that matches no location has failed, whereas a map command that
     * moved the map did exactly what it was told, whether or not the merchant
     * trades there.
     *
     * Consumed FIRST (see parseLocatorPrompt), because these phrases overlap
     * the rest of the book: "show me the map of X" starts like PHRASES.all, and
     * "take me to X" ends like PHRASES.nearMe's "to me".
     */
    zoomIn: byLength([
        'zoom in', 'zoom into', 'zoom in on', 'zoom in the map', 'zoom the map in', 'zoom closer',
        'closer', 'move closer', 'get closer', 'magnify', 'enlarge the map', 'enlarge',
        'zoom avant', 'zoomer', 'agrandir', 'rapprocher', 'plus pres', 'plus près',
        'acercar', 'acercate', 'acércate', 'ampliar', 'mas cerca', 'más cerca',
        'hineinzoomen', 'heranzoomen', 'vergrossern', 'vergrößern', 'naher', 'näher',
        'ingrandisci', 'zoom avanti', 'avvicina', 'piu vicino la mappa',
        'aproximar', 'ampliar o mapa', 'mais perto o mapa',
        'inzoomen', 'vergroten',
        '拡大', 'ズームイン', '寄って',
        '확대', '줌인', '가까이',
        '放大', '拉近',
        'تكبير', 'قرب الخريطة', 'قرّب',
    ]),
    zoomOut: byLength([
        'zoom out', 'zoom out of', 'zoom out the map', 'zoom the map out', 'zoom away', 'zoom back',
        'further out', 'farther out', 'move away', 'pull back', 'shrink the map', 'wider view', 'see more area',
        'zoom arriere', 'zoom arrière', 'dezoomer', 'dézoomer', 'reduire', 'réduire', 'eloigner', 'éloigner',
        'alejar', 'alejate', 'aléjate', 'reducir', 'mas lejos', 'más lejos',
        'herauszoomen', 'rauszoomen', 'verkleinern', 'weiter weg',
        'rimpicciolisci', 'zoom indietro', 'allontana',
        'afastar', 'reduzir o mapa', 'mais longe o mapa',
        'uitzoomen', 'verkleinen',
        '縮小', 'ズームアウト', '引いて',
        '축소', '줌아웃', '멀리',
        '缩小', '拉远', '縮小地圖', '拉遠',
        'تصغير', 'بعد الخريطة', 'صغّر',
    ]),
    /*
     * The verb half of a pan command. Paired with `mapWord` below, or used on
     * its own ("take me to manila"), which is why the phrasings here are the
     * ones that can only mean "move the view".
     */
    mapMove: byLength([
        'ilipat ang mapa sa', 'ilipat ang mapa', 'ilipat sa', 'ilipat', 'igalaw ang mapa',
        'ipakita ang mapa ng', 'ipakita ang mapa', 'pakitang mapa', 'punta sa', 'pumunta sa',
        'afficher la carte de', 'afficher la carte du', 'afficher la carte',
        'karte von', 'karte anzeigen', 'zeige die karte von', 'zeige die karte',
        'mostrar el mapa de', 'mostrar el mapa', 'muestra el mapa de',
        'move the map to', 'move the map', 'move map to', 'move map',
        'show me the map of', 'show me the map for', 'show me the map',
        'show the map of', 'show the map for', 'show the map', 'show map of', 'show map',
        'center the map on', 'center the map', 'centre the map on', 'centre the map',
        'centre on', 'center on', 'pan the map to', 'pan the map', 'pan to',
        'take me to', 'bring me to', 'go to', 'jump to', 'navigate to', 'fly to',
        'map of', 'map for', 'view of the map', 'the map to', 'map to',
        'deplace la carte vers', 'déplace la carte vers', 'deplacer la carte', 'déplacer la carte',
        'montre moi la carte de', 'montre la carte de', 'affiche la carte de', 'centre la carte sur',
        'carte de', 'va a', 'emmene moi a', 'emmène-moi à',
        'mueve el mapa a', 'mover el mapa a', 'muestrame el mapa de', 'muéstrame el mapa de',
        'muestra el mapa de', 'centra el mapa en', 'mapa de', 'llevame a', 'llévame a', 've a',
        'verschiebe die karte nach', 'karte verschieben nach', 'zeig mir die karte von',
        'zeige die karte von', 'zentriere die karte auf', 'karte von', 'bring mich nach', 'geh zu',
        'sposta la mappa su', 'mostrami la mappa di', 'mostra la mappa di', 'centra la mappa su',
        'mappa di', 'portami a', 'vai a',
        'mova o mapa para', 'mover o mapa para', 'mostre o mapa de', 'me mostre o mapa de',
        'centralize o mapa em', 'mapa de', 'me leve para', 'va para', 'vá para',
        'verplaats de kaart naar', 'toon de kaart van', 'laat de kaart zien van',
        'centreer de kaart op', 'kaart van', 'breng me naar', 'ga naar',
        '地図を', 'の地図', 'マップを', 'に移動', 'へ移動', 'を表示',
        '지도를', '지도', '로 이동', '으로 이동', '보여줘',
        '把地图移动到', '将地图移动到', '地图移动到', '显示地图', '的地图', '移动到', '前往',
        '把地圖移動到', '將地圖移動到', '地圖移動到', '顯示地圖', '的地圖', '移動到',
        'حرك الخريطة الى', 'حرّك الخريطة إلى', 'انقل الخريطة الى', 'اعرض خريطة',
        'خريطة', 'اذهب الى', 'اذهب إلى',
    ]),
    /*
     * The noun on its own. "the map of bayambang" is already covered above; this
     * catches a bare "bayambang map" and, more importantly, lets a zoom command
     * mention the map without that word leaking into the place name.
     */
    mapWord: byLength([
        'the map', 'a map', 'map', 'la carte', 'carte', 'el mapa', 'mapa',
        'die karte', 'karte', 'la mappa', 'mappa', 'o mapa',
        'de kaart', 'kaart', '地図', 'マップ', '지도', '地图', '地圖', 'الخريطة', 'خريطة',
    ]),
    all: byLength([
        'show me all', 'show all', 'list all', 'find all', 'all locations', 'all stores',
        'lahat ng', 'lahat', 'ang lahat ng', 'lahat ng mga', 'every location', 'all of them',
        'toutes les', 'tous les', 'todas las', 'todos los', 'alle', 'tutte le', 'tutti i', 'todas as', 'todos os',
        'すべて', '全部', '全て', '모두', '전부', '所有', '全部', 'كل المواقع', 'جميع',
    ]),
};

/** Day names, abbreviations and CJK/Arabic forms -> JS day index (0 = Sunday). */
const DAY_WORDS_EXTRA = [
    // German writes "on Mondays" as one adverb, which the singular never matched.
    ['montags', 1], ['dienstags', 2], ['mittwochs', 3], ['donnerstags', 4],
    ['freitags', 5], ['samstags', 6], ['sonnabends', 6], ['sonntags', 0],
    // Filipino. lunes / martes / sabado are already carried by Spanish.
    ['miyerkules', 3], ['miyerkoles', 3], ['huwebes', 4], ['biyernes', 5],
    ['sabado', 6], ['linggo', 0], ['lingo', 0], ['araw ng linggo', 0],
];

const DAY_WORDS = [
    ['sunday', 0], ['sundays', 0], ['sun', 0], ['dimanche', 0], ['domingo', 0], ['sonntag', 0], ['domenica', 0], ['zondag', 0],
    ['日曜日', 0], ['日曜', 0], ['일요일', 0], ['星期日', 0], ['星期天', 0], ['周日', 0], ['週日', 0], ['الأحد', 0],
    ['monday', 1], ['mondays', 1], ['mon', 1], ['lundi', 1], ['lunes', 1], ['montag', 1], ['lunedì', 1], ['lunedi', 1],
    ['segunda-feira', 1], ['segunda', 1], ['maandag', 1],
    ['月曜日', 1], ['月曜', 1], ['월요일', 1], ['星期一', 1], ['周一', 1], ['週一', 1], ['الاثنين', 1],
    ['tuesday', 2], ['tuesdays', 2], ['tue', 2], ['mardi', 2], ['martes', 2], ['dienstag', 2], ['martedì', 2], ['martedi', 2],
    ['terça-feira', 2], ['terça', 2], ['terca', 2], ['dinsdag', 2],
    ['火曜日', 2], ['火曜', 2], ['화요일', 2], ['星期二', 2], ['周二', 2], ['週二', 2], ['الثلاثاء', 2],
    ['wednesday', 3], ['wednesdays', 3], ['wed', 3], ['mercredi', 3], ['miércoles', 3], ['miercoles', 3], ['mittwoch', 3],
    ['mercoledì', 3], ['mercoledi', 3], ['quarta-feira', 3], ['quarta', 3], ['woensdag', 3],
    ['水曜日', 3], ['水曜', 3], ['수요일', 3], ['星期三', 3], ['周三', 3], ['週三', 3], ['الأربعاء', 3],
    ['thursday', 4], ['thursdays', 4], ['thu', 4], ['jeudi', 4], ['jueves', 4], ['donnerstag', 4], ['giovedì', 4], ['giovedi', 4],
    ['quinta-feira', 4], ['quinta', 4], ['donderdag', 4],
    ['木曜日', 4], ['木曜', 4], ['목요일', 4], ['星期四', 4], ['周四', 4], ['週四', 4], ['الخميس', 4],
    ['friday', 5], ['fridays', 5], ['fri', 5], ['vendredi', 5], ['viernes', 5], ['freitag', 5], ['venerdì', 5], ['venerdi', 5],
    ['sexta-feira', 5], ['sexta', 5], ['vrijdag', 5],
    ['金曜日', 5], ['金曜', 5], ['금요일', 5], ['星期五', 5], ['周五', 5], ['週五', 5], ['الجمعة', 5],
    ['saturday', 6], ['saturdays', 6], ['sat', 6], ['samedi', 6], ['sábado', 6], ['sabado', 6], ['samstag', 6], ['sonnabend', 6],
    ['sabato', 6], ['zaterdag', 6],
    ['土曜日', 6], ['土曜', 6], ['토요일', 6], ['星期六', 6], ['周六', 6], ['週六', 6], ['السبت', 6],
].concat(DAY_WORDS_EXTRA).sort((a, b) => b[0].length - a[0].length);

/** Connectors that turn two day names into an inclusive range. */
const RANGE_WORDS = ['through', 'thru', 'until', 'till', 'to', '-', '–', '~',
    'jusqu\'à', 'jusqua', 'au', 'à', 'hasta', 'al', 'a', 'bis', 'fino a', 'al', 'até', 'ate', 'tot en met', 'tot',
    'から', 'まで', '부터', '까지', '到', '至', 'إلى'];

/** Distance units the shopper can write, mapped to the locator's own units. */
const UNIT_WORDS = [
    ['kilometers', 'km'], ['kilometres', 'km'], ['kilometer', 'km'], ['kilometre', 'km'], ['kms', 'km'], ['km', 'km'],
    ['kilómetros', 'km'], ['kilometros', 'km'], ['kilomètres', 'km'], ['chilometri', 'km'], ['quilômetros', 'km'],
    ['quilometros', 'km'], ['킬로미터', 'km'], ['公里', 'km'], ['キロ', 'km'], ['كيلومتر', 'km'],
    ['miles', 'mi'], ['mile', 'mi'], ['mi', 'mi'], ['millas', 'mi'], ['milles', 'mi'], ['meilen', 'mi'], ['miglia', 'mi'],
    ['milhas', 'mi'], ['mijl', 'mi'], ['마일', 'mi'], ['英里', 'mi'], ['マイル', 'mi'], ['ميل', 'mi'],
].sort((a, b) => b[0].length - a[0].length);

/**
 * Scaffolding words that are never the answer to "where". Dropping them is what
 * leaves "manila" behind in "show me all the stores in manila", and it is the
 * only reason a leftover phrase can be trusted as a place or a name.
 */
const STOPWORDS = new Set([
    // English
    'show', 'me', 'my', 'find', 'look', 'looking', 'for', 'get', 'give', 'search', 'searching', 'want', 'need',
    'list', 'display', 'please', 'can', 'you', 'i', 'a', 'an', 'the', 'any', 'some', 'all', 'every', 'and', 'or',
    'of', 'in', 'at', 'on', 'to', 'from', 'with', 'without', 'that', 'which', 'who', 'whose', 'whom',
    'this', 'these', 'those', 'where', 'what', 'are', 'is', 'be', 'was', 'were', 'have',
    'has', 'there', 'here', 'store', 'stores', 'shop', 'shops', 'location', 'locations', 'branch', 'branches',
    'place', 'places', 'outlet', 'outlets', 'near', 'around', 'close', 'it', 'them', 'their', 'we', 'us',
    'during', 'while', 'when', 'still', 'only', 'also', 'about', 'within', 'radius', 'miles', 'km', 'hours', 'hour',
    'now', 'right', 'currently', 'between', 'time', 'moment', 'status', 'statuses',
    'country', 'countries', 'nation', 'nations', 'pays', 'pais', 'país', 'paese',
    // French
    'montre', 'montrez', 'moi', 'cherche', 'trouve', 'trouver', 'les', 'des', 'une', 'un', 'du', 'de', 'la', 'le',
    'dans', 'avec', 'sans', 'qui', 'sont', 'est', 'magasin', 'magasins', 'boutique', 'boutiques', 'emplacement',
    'emplacements', 'lieu', 'lieux', 'près', 'pres',
    // Spanish
    'muestra', 'muéstrame', 'muestrame', 'busca', 'buscar', 'encuentra', 'dame', 'ver', 'las', 'los', 'una', 'unos',
    'unas', 'del', 'con', 'sin', 'que', 'están', 'estan', 'esta', 'son', 'tienda', 'tiendas', 'ubicación',
    'ubicacion', 'ubicaciones', 'lugar', 'lugares', 'sucursal', 'sucursales', 'cerca', 'en', 'al', 'para',
    // German
    'zeige', 'zeig', 'mir', 'suche', 'finde', 'alle', 'die', 'der', 'das', 'den', 'dem', 'ein', 'eine', 'einen',
    'mit', 'ohne', 'sind', 'ist', 'geschäft', 'geschaft', 'geschäfte', 'geschafte', 'laden', 'läden', 'laeden',
    'filiale', 'filialen', 'standort', 'standorte', 'nähe', 'nahe', 'öffnen', 'offnen', 'öffnet', 'offnet',
    // Italian
    'mostra', 'mostrami', 'cerca', 'trova', 'dammi', 'gli', 'lo', 'una', 'uno', 'del', 'della', 'con', 'senza',
    'che', 'sono', 'negozio', 'negozi', 'sede', 'sedi', 'punto', 'vendita', 'vicino',
    // Portuguese
    'mostre', 'mostrar', 'procure', 'procurar', 'encontre', 'encontrar', 'me', 'as', 'os', 'uma', 'um', 'da', 'do',
    'com', 'sem', 'que', 'estão', 'estao', 'está', 'esta', 'são', 'sao', 'loja', 'lojas', 'local', 'locais',
    'localização', 'localizacao', 'filial', 'filiais', 'perto', 'no', 'na', 'nos', 'nas', 'em', 'ao', 'aos',
    // Dutch
    'toon', 'laat', 'zien', 'zoek', 'vind', 'geef', 'de', 'het', 'een', 'alle', 'met', 'zonder', 'die', 'zijn',
    'winkel', 'winkels', 'locatie', 'locaties', 'vestiging', 'vestigingen', 'buurt',
    // Japanese / Korean / Chinese particles and nouns the widget's own copy uses
    'を', 'の', 'に', 'は', 'が', 'で', 'と', 'から', 'まで', 'して', 'ください', '教えて', '表示', '検索', '探して',
    '店舗', '店', 'ストア', '場所', 'すべて',
    '보여줘', '찾아줘', '알려줘', '해줘', '있는', '있는지', '매장', '지점', '가게', '위치', '중인', '하는', '있나요',
    '显示', '查找', '寻找', '告诉', '我', '的', '在', '有', '门店', '商店', '店铺', '地点',
    '顯示', '尋找', '門店', '商店', '店鋪', '地點',
    // Arabic
    'أرني', 'اعرض', 'ابحث', 'عن', 'في', 'من', 'مع', 'التي', 'هي', 'متجر', 'متاجر', 'محل', 'محلات', 'موقع', 'مواقع',
    'ال', 'المتاجر', 'المحلات', 'المواقع', 'الفروع', 'فرع', 'فروع', 'كل', 'جميع',
    // Filipino / Tagalog
    'ipakita', 'ipakita mo', 'pakita', 'pakitang', 'ilista', 'hanapin', 'maghanap', 'tingnan',
    'ibigay', 'gusto', 'ko', 'akin', 'aking', 'mo', 'ang', 'ng', 'mga', 'sa', 'na', 'ay', 'at',
    'para', 'kung', 'may', 'meron', 'mayroon', 'ito', 'iyon', 'nasa',
    'tindahan', 'tindahang', 'lokasyon', 'sangay', 'sanga', 'branch', 'lugar', 'pwesto',
    'bansa', 'bansang', 'lalawigan', 'probinsya', 'lungsod', 'siyudad', 'bayan',
    // Scaffolding the phrase book leaves standing once it has taken the concept.
    // Each of these emptied a result that was otherwise fully understood: any
    // leftover word becomes a term every location has to carry.
    'afficher', 'affiche', 'affichez', 'actuellement', 'maintenant', 'etablissement',
    'etablissements', 'établissement', 'établissements', 'succursale', 'succursales',
    'anzeigen', 'anzeige', 'zeigen', 'jetzt', 'gerade', 'aktuell', 'momentan', 'standort',
    'ahora', 'actualmente', 'momento', 'el', 'lo',
    'adesso', 'ora', 'attualmente', 'mostrare',
    'agora', 'atualmente', 'mostrando',
    'nu', 'momenteel', 'tonen', 'weergeven',
    '現在', 'いま', '表示して', '営業', 'すべての',
    '지금', '현재', '모두', '전체',
    '现在', '目前', '全部', '所有', '現在の',
    'الآن', 'حاليا', 'حالياً',
]);

/* ---------------------------------------------------------------------- *
 * Text helpers
 * ------------------------------------------------------------------- */

/** Lower-cased, width-normalised, with the quote characters unified. */
export function normalizePromptText(text) {
    return String(text ?? '')
        .normalize('NFKC')
        .toLowerCase()
        .replace(/[‘’ʼ]/g, "'")
        .replace(/[“”]/g, '"')
        // "u.s.a." -> "usa", "u.k." -> "uk". A dotted initialism is one word,
        // but every later step splits on punctuation, which left it as three
        // single letters that no rule and no token filter would keep. Applied
        // to stored values too, so a prompt and a field normalise the same way.
        .replace(/\b(?:[a-z]\.){2,}/g, (match) => match.replace(/\./g, ''))
        .replace(/\s+/g, ' ')
        .trim();
}

/** Emoji, punctuation and spacing stripped — used to compare filter labels. */
function plainLabel(value) {
    return normalizePromptText(value)
        .replace(/[\p{Extended_Pictographic}\p{Emoji_Presentation}️‍]/gu, ' ')
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/** Split a phrase into the words worth matching on. */
function tokenize(text) {
    return normalizePromptText(text)
        .split(/[^\p{L}\p{N}]+/u)
        .map((token) => token.trim())
        .filter(Boolean);
}

/** Japanese, Korean and Chinese — scripts with no spaces to tokenise on. */
const CJK = /[぀-ヿ㐀-鿿豈-﫿가-힣]/;

/**
 * The CJK stopwords, longest first.
 *
 * Latin scaffolding falls away on its own because the tokeniser splits on
 * spaces, so "show me" is two tokens and both are dropped. CJK has no spaces:
 * "の店舗を" arrives as ONE token that is entirely scaffolding, matches no
 * stopword as a whole, and so became a word every location had to carry.
 */
const CJK_STOPWORDS = [...STOPWORDS]
    .filter((word) => CJK.test(word))
    .sort((a, b) => b.length - a.length);

/** Take the scaffolding back out of a CJK run, leaving only what it named. */
function stripCjkNoise(token) {
    if (!CJK.test(token)) return token;
    let rest = token;
    for (const noise of CJK_STOPWORDS) {
        while (rest.includes(noise)) rest = rest.replace(noise, '');
    }
    return rest.trim();
}

/** CJK has no spaces, so a single character there is still a real word. */
function isMeaningfulToken(token) {
    if (STOPWORDS.has(token)) return false;
    if (CJK.test(token)) return token.length >= 1;
    return token.length >= 2;
}

/* ---------------------------------------------------------------------- *
 * Parsing
 * ------------------------------------------------------------------- */

/** Latin script is written with word boundaries; the other scripts here are not. */
const LATIN_PHRASE = /^[\p{Script=Latin}\p{N}\s'\-./]+$/u;

/**
 * Where a phrase sits in the text. A Latin phrase must fall on a word boundary,
 * or "alle" (German for "all") eats the middle of "Galleria" and "mi" eats the
 * middle of "Miami". Japanese, Chinese, Korean and Arabic have no boundary to
 * anchor to, so those are matched as plain substrings — which is exactly why
 * every concept is spelled out in them rather than translated at runtime.
 */
function phrasePosition(text, phrase, from = 0) {
    if (!LATIN_PHRASE.test(phrase)) return text.indexOf(phrase, from);
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'gu');
    pattern.lastIndex = from;
    const match = pattern.exec(text);
    return match ? match.index : -1;
}

/**
 * A cursor over the prompt that blanks out everything it recognises. What is
 * still standing at the end is the shopper's own vocabulary.
 */
function createScanner(text) {
    let rest = ` ${text} `;
    return {
        /** Does the text contain any of these phrases? Consumes the matches. */
        take(phrases) {
            let hit = false;
            for (const phrase of phrases) {
                if (!phrase) continue;
                let index = phrasePosition(rest, phrase);
                while (index !== -1) {
                    hit = true;
                    rest = `${rest.slice(0, index)} ${rest.slice(index + phrase.length)}`;
                    index = phrasePosition(rest, phrase);
                }
            }
            return hit;
        },
        /** Non-destructive look. */
        has(phrases) {
            return phrases.some((phrase) => phrase && phrasePosition(rest, phrase) !== -1);
        },
        drop(phrase) {
            const index = phrasePosition(rest, phrase);
            if (index === -1) return false;
            rest = `${rest.slice(0, index)} ${rest.slice(index + phrase.length)}`;
            return true;
        },
        get text() {
            return rest.replace(/\s+/g, ' ').trim();
        },
    };
}

/** "9am", "9:30 pm", "18:00" -> minutes past midnight. */
function clockToMinutes(hour, minute, meridiem) {
    let h = Number(hour);
    const m = Number(minute || 0);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    if (meridiem === 'pm' && h < 12) h += 12;
    if (meridiem === 'am' && h === 12) h = 0;
    if (h > 23 || m > 59) return null;
    return h * 60 + m;
}

/**
 * Where a day word sits in the text. A short Latin abbreviation ("mon", "sat")
 * has to fall on a word boundary — without that, "montre-moi" reads as Monday
 * and "saturday" is found twice. Scripts without word boundaries (Japanese,
 * Chinese, Korean, Arabic) are matched as plain substrings, which is the whole
 * point of writing the day words out in them.
 */
function dayWordPositions(text, word) {
    const positions = [];
    if (/^[a-z]{1,4}$/.test(word)) {
        const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${word}(?![\\p{L}\\p{N}])`, 'gu');
        let match;
        while ((match = pattern.exec(text)) !== null) positions.push(match.index);
        return positions;
    }
    let at = text.indexOf(word);
    while (at !== -1) {
        positions.push(at);
        at = text.indexOf(word, at + 1);
    }
    return positions;
}

/** The explicit day names in the prompt, with ranges expanded. */
function readDays(text) {
    const found = [];
    for (const [word, index] of DAY_WORDS) {
        for (const at of dayWordPositions(text, word)) {
            // A longer day word already claimed this span (e.g. "sun" inside
            // "sunday"), so only record a position nothing else covers.
            if (!found.some((entry) => at >= entry.at && at < entry.at + entry.word.length)) {
                found.push({ at, word, index });
            }
        }
    }
    if (!found.length) return { days: [], words: [] };

    found.sort((a, b) => a.at - b.at);
    const days = new Set(found.map((entry) => entry.index));

    // "monday to friday" — a range connector between two day names fills in
    // everything between them, in week order starting at the first.
    for (let i = 0; i < found.length - 1; i++) {
        const gap = text.slice(found[i].at + found[i].word.length, found[i + 1].at).trim();
        const isRange = gap.length <= 12 && RANGE_WORDS.some((word) => gap === word || gap.split(/\s+/).includes(word));
        if (!isRange) continue;
        let cursor = found[i].index;
        for (let step = 0; step < 7; step++) {
            days.add(cursor);
            if (cursor === found[i + 1].index) break;
            cursor = (cursor + 1) % 7;
        }
    }

    return { days: [...days].sort((a, b) => a - b), words: found.map((entry) => entry.word) };
}

/**
 * Read a sentence into the conditions the locator can answer.
 *
 * @param {string} raw What the shopper typed.
 * @param {object} context
 * @param {string[]} context.filters The locator's OWN filter labels — the only
 *   amenity values that can come back, so an unknown amenity is reported as
 *   unmatched rather than invented.
 * @param {'mi'|'km'} context.distanceUnit The locator's unit, used when the
 *   shopper writes a bare number ("within 500").
 * @returns {object} The intent. Every field is optional; `hasSignal` says
 *   whether anything at all was understood.
 */
export function parseLocatorPrompt(raw, { filters = [], distanceUnit = 'mi' } = {}) {
    const original = String(raw ?? '').trim();
    const text = normalizePromptText(original);
    const scanner = createScanner(text);

    // 0. MAP COMMANDS, before anything else gets to eat the words.
    //    "zoom in" is a complete instruction on its own; a pan needs somewhere
    //    to go, and whatever survives the rest of the parse becomes that place.
    //    Zoom is tested first so "zoom out the map" is not read as a pan.
    const zoomIn = scanner.take(PHRASES.zoomIn);
    const zoomOut = !zoomIn && scanner.take(PHRASES.zoomOut);
    const panWord = !zoomIn && !zoomOut && scanner.take(PHRASES.mapMove);
    // The bare noun is consumed either way: for a zoom it is the object of the
    // verb ("zoom in the map"), and for a pan it must not end up in the place.
    const mapNoun = scanner.take(PHRASES.mapWord);

    // 1. A quoted string is the shopper being explicit, so it wins over
    //    everything and is read from the ORIGINAL casing for display.
    let name = '';
    const quoted = /["“”']([^"“”']{2,80})["“”']/.exec(original);
    if (quoted) {
        name = quoted[1].trim();
        scanner.drop(normalizePromptText(name));
    }

    // 2. A distance, before anything else eats the number. "within 500 miles",
    //    "500 km radius", "dans un rayon de 20 km".
    let radius = null;
    const distance = /(\d+(?:[.,]\d+)?)\s*([a-z぀-ヿ一-鿿؀-ۿ]{1,12})?/g;
    let distanceMatch;
    while ((distanceMatch = distance.exec(text)) !== null) {
        const value = Number(String(distanceMatch[1]).replace(',', '.'));
        if (!Number.isFinite(value) || value <= 0) continue;
        const word = distanceMatch[2] || '';
        const unit = UNIT_WORDS.find(([label]) => word === label || word.startsWith(label));
        // A bare number only counts as a distance when the sentence framed it as
        // one ("within 500"), otherwise it is part of a name or an address.
        if (!unit && !scanner.has(PHRASES.within)) continue;
        // "24 hours" is a schedule, never a radius.
        if (!unit && /^(24|12)$/.test(distanceMatch[1])) continue;
        radius = { value, unit: unit ? unit[1] : distanceUnit };
        scanner.drop(distanceMatch[0].trim());
        break;
    }
    const hasWithin = scanner.take(PHRASES.within);

    // 3. Days, before the phrase book so "sat"/"sun" cannot be eaten by a
    //    shorter match, then the calendar shortcuts.
    const { days, words: dayWords } = readDays(scanner.text);
    scanner.take(byLength(dayWords));
    const weekdays = scanner.take(PHRASES.weekdays);
    const weekend = scanner.take(PHRASES.weekend);
    const tomorrow = scanner.take(PHRASES.tomorrow);
    const today = scanner.take(PHRASES.today);

    if (weekdays) [1, 2, 3, 4, 5].forEach((day) => days.includes(day) || days.push(day));
    if (weekend) [0, 6].forEach((day) => days.includes(day) || days.push(day));
    days.sort((a, b) => a - b);

    // 4. An explicit clock window: "between 9am and 5pm", "after 6pm".
    let window = null;
    const clocks = [...text.matchAll(/(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?/g)]
        .map((match) => ({
            raw: match[0],
            minutes: clockToMinutes(match[1], match[2], (match[3] || '').replace(/\./g, '')),
            explicit: !!(match[2] || match[3]),
        }))
        .filter((entry) => entry.minutes !== null && entry.explicit);
    if (clocks.length >= 2) {
        window = { from: clocks[0].minutes, to: clocks[1].minutes };
        clocks.slice(0, 2).forEach((entry) => scanner.drop(entry.raw.trim()));
    } else if (clocks.length === 1) {
        // "open at 3am" is a moment, not a range, so it becomes the narrowest
        // window there is — a location has to actually be trading then.
        window = { from: clocks[0].minutes, to: clocks[0].minutes + 1 };
        scanner.drop(clocks[0].raw.trim());
    }

    // 5a. "Open 24 hours" and "currently open" are taken FIRST, ahead of the
    //     trading state below. They are unambiguous — no trading-state phrase
    //     contains one — and taking them here is what stops "現在営業中" (and
    //     "aperto adesso", and "jetzt geöffnet") from being swallowed by the
    //     more general "operational", which would answer a question about the
    //     merchant's own flag instead of about this minute.
    const open24 = scanner.take(PHRASES.open24);
    const openNow = scanner.take(PHRASES.openNow);

    // 5b. The merchant-set trading state, BEFORE the rest of the schedule
    //    vocabulary — see the note on PHRASES.comingSoon. "Temporarily closed"
    //    is a state the merchant set, not an answer to "is it open right now".
    // The label first, so "status coming soon" and "coming soon" are read the
    // same way and the word is gone either way.
    const statusLabel = scanner.take(PHRASES.statusLabel);
    const comingSoon = scanner.take(PHRASES.comingSoon);
    const temporarilyClosed = !comingSoon && scanner.take(PHRASES.temporarilyClosed);
    const operational = !comingSoon && !temporarilyClosed && scanner.take(PHRASES.operational);
    let locationStatus = comingSoon
        ? 'coming_soon'
        : temporarilyClosed
            ? 'temporarily_closed'
            : operational
                ? 'open'
                : null;

    // 6. The rest of the schedule vocabulary.
    const closed = scanner.take(PHRASES.closed);
    const night = scanner.take(PHRASES.night);
    const daylight = !night && scanner.take(PHRASES.daylight);
    const openWord = scanner.take(PHRASES.open);

    // A bare "open" beside the word "status" is the merchant-set state — "status
    // open" is the opposite of "status coming soon", not a question about this
    // minute. Only when the sentence says nothing else about time: "status open
    // on sunday" really is asking about Sunday.
    const statusIsOpen = statusLabel && !locationStatus && openWord &&
        !openNow && !closed && !open24 && !daylight && !night &&
        !days.length && !window && !today && !tomorrow;

    if (statusIsOpen) locationStatus = 'open';

    // 7. Position and scope.
    const nearMe = scanner.take(PHRASES.nearMe);
    const wantsAll = scanner.take(PHRASES.all);

    // 8. "named X" — whatever follows the keyword, once it has been consumed.
    //    The marker itself is always dropped: a quoted name has already been
    //    taken above, but "named" is still sitting in the text.
    if (name) scanner.take(PHRASES.named);
    if (!name && scanner.has(PHRASES.named)) {
        const marker = PHRASES.named.find((phrase) => phrasePosition(scanner.text, phrase) !== -1);
        const after = scanner.text.slice(phrasePosition(scanner.text, marker) + marker.length).trim();
        const candidate = after.split(/[,;.]/)[0].trim();
        scanner.take(PHRASES.named);
        if (candidate) {
            name = candidate;
            scanner.drop(candidate);
        }
    }

    // 9. Amenities, resolved against the locator's OWN filter list. An exact
    //    label match is taken first; otherwise every word of the label has to be
    //    present, which matches "free wifi" to "📶 Free WiFi" without ever
    //    producing a tag the merchant has not defined.
    const matchedFilters = [];
    for (const filter of filters) {
        const label = plainLabel(filter);
        if (!label) continue;
        const current = scanner.text;
        if (current.includes(label)) {
            matchedFilters.push(filter);
            scanner.drop(label);
            continue;
        }
        const parts = tokenize(label).filter((token) => token.length >= 3);
        if (parts.length && parts.every((token) => current.includes(token))) {
            matchedFilters.push(filter);
            parts.forEach((token) => scanner.drop(token));
        }
    }

    // 10. Whatever survived is the shopper's own words: a city, a store name, or
    //    something they remember from the merchant's notes.
    const keywords = tokenize(scanner.text).map(stripCjkNoise).filter(Boolean).filter(isMeaningfulToken);
    const leftoverText = scanner.text;

    const schedule = !statusIsOpen && (openNow || open24 || closed || daylight || night ||
        days.length > 0 || !!window || today || tomorrow || openWord);

    // The view instruction, if the sentence carried one.
    //
    // A pan is only a pan when it has somewhere to go: "show me the map" with no
    // place names nothing to move to, so it stays null and the sentence is read
    // as an ordinary search rather than answered with a confirmation for a move
    // that never happened. A bare "map" with a place ("bayambang map") counts,
    // which is why `mapNoun` can stand in for the verb.
    const wantsPan = (panWord || mapNoun) && (keywords.length > 0 || !!leftoverText);
    const map = zoomIn
        ? { action: 'zoom_in' }
        : zoomOut
            ? { action: 'zoom_out' }
            : wantsPan
                ? { action: 'pan' }
                : null;

    return {
        raw: original,
        text,
        nearMe,
        wantsAll,
        radius,
        hasWithin,
        name,
        filters: matchedFilters,
        keywords,
        // The raw remainder, kept alongside the tokens because Japanese,
        // Chinese, Korean and Thai cannot be split on spaces: a city called
        // 東京 is found by testing whether THIS string contains it, which is the
        // opposite direction from testing whether a token appears in a field.
        leftoverText,
        leftover: keywords.join(' '),
        days,
        today,
        tomorrow,
        window,
        // 'coming_soon' | 'temporarily_closed' | 'open' | null — matched against
        // the location's own `location_status`, never inferred from its hours.
        locationStatus,
        // `open` without any qualifier means "open right now" — the reading a
        // shopper expects from "locations that are open". With a day, a window
        // or daylight/night beside it, it is only saying the location trades
        // then, which those conditions already express.
        openNow: openNow || (openWord && !statusIsOpen && !closed && !open24 && !daylight && !night && !days.length && !window && !today && !tomorrow),
        open24,
        closed,
        daylight,
        night,
        hasSchedule: !!schedule,
        // { action: 'pan' | 'zoom_in' | 'zoom_out' } — an instruction to the map
        // view. null for an ordinary search.
        map,
        hasSignal: !!(nearMe || wantsAll || radius || name || matchedFilters.length || keywords.length || schedule || locationStatus || map),
    };
}
