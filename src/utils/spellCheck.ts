// Offline Spell Check Engine
// Dictionary-based, deterministic, exam-safe

import { SegmentedText, Word } from './textSegmentation';

export interface SpellError {
  word: string;
  charStart: number;
  charEnd: number;
  wordIndex: number;
  suggestions: string[];
}

export interface SpellCheckResult {
  errors: SpellError[];
}

// Comprehensive English dictionary (10,000+ common words)
const COMMON_WORDS = new Set([
  // Articles, pronouns, and determiners
  'a', 'an', 'the', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
  'my', 'your', 'his', 'its', 'our', 'their', 'mine', 'yours', 'hers', 'ours', 'theirs',
  'this', 'that', 'these', 'those', 'who', 'whom', 'whose', 'which', 'what', 'whatever',
  'whoever', 'whomever', 'whichever', 'myself', 'yourself', 'himself', 'herself', 'itself',
  'ourselves', 'yourselves', 'themselves', 'each', 'every', 'either', 'neither', 'both',
  'all', 'any', 'some', 'no', 'none', 'one', 'ones', 'other', 'another', 'such', 'same',
  
  // Common verbs (all tenses)
  'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having',
  'do', 'does', 'did', 'doing', 'done', 'will', 'would', 'shall', 'should', 'may', 'might',
  'must', 'can', 'could', 'go', 'goes', 'went', 'gone', 'going', 'come', 'comes', 'came',
  'coming', 'get', 'gets', 'got', 'gotten', 'getting', 'make', 'makes', 'made', 'making',
  'say', 'says', 'said', 'saying', 'see', 'sees', 'saw', 'seen', 'seeing',
  'take', 'takes', 'took', 'taken', 'taking', 'know', 'knows', 'knew', 'known', 'knowing',
  'think', 'thinks', 'thought', 'thinking', 'give', 'gives', 'gave', 'given', 'giving',
  'find', 'finds', 'found', 'finding', 'tell', 'tells', 'told', 'telling',
  'want', 'wants', 'wanted', 'wanting', 'use', 'uses', 'used', 'using',
  'try', 'tries', 'tried', 'trying', 'need', 'needs', 'needed', 'needing',
  'feel', 'feels', 'felt', 'feeling', 'become', 'becomes', 'became', 'becoming',
  'leave', 'leaves', 'left', 'leaving', 'put', 'puts', 'putting',
  'mean', 'means', 'meant', 'meaning', 'keep', 'keeps', 'kept', 'keeping',
  'let', 'lets', 'letting', 'begin', 'begins', 'began', 'begun', 'beginning',
  'seem', 'seems', 'seemed', 'seeming', 'help', 'helps', 'helped', 'helping',
  'show', 'shows', 'showed', 'shown', 'showing', 'hear', 'hears', 'heard', 'hearing',
  'play', 'plays', 'played', 'playing', 'run', 'runs', 'ran', 'running',
  'move', 'moves', 'moved', 'moving', 'live', 'lives', 'lived', 'living',
  'believe', 'believes', 'believed', 'believing', 'hold', 'holds', 'held', 'holding',
  'bring', 'brings', 'brought', 'bringing', 'happen', 'happens', 'happened', 'happening',
  'write', 'writes', 'wrote', 'written', 'writing', 'read', 'reads', 'reading',
  'learn', 'learns', 'learned', 'learnt', 'learning', 'change', 'changes', 'changed', 'changing',
  'follow', 'follows', 'followed', 'following', 'stop', 'stops', 'stopped', 'stopping',
  'create', 'creates', 'created', 'creating', 'speak', 'speaks', 'spoke', 'spoken', 'speaking',
  'allow', 'allows', 'allowed', 'allowing', 'add', 'adds', 'added', 'adding',
  'grow', 'grows', 'grew', 'grown', 'growing', 'open', 'opens', 'opened', 'opening',
  'walk', 'walks', 'walked', 'walking', 'win', 'wins', 'won', 'winning',
  'offer', 'offers', 'offered', 'offering', 'remember', 'remembers', 'remembered', 'remembering',
  'love', 'loves', 'loved', 'loving', 'consider', 'considers', 'considered', 'considering',
  'appear', 'appears', 'appeared', 'appearing', 'buy', 'buys', 'bought', 'buying',
  'wait', 'waits', 'waited', 'waiting', 'serve', 'serves', 'served', 'serving',
  'die', 'dies', 'died', 'dying', 'send', 'sends', 'sent', 'sending',
  'expect', 'expects', 'expected', 'expecting', 'build', 'builds', 'built', 'building',
  'stay', 'stays', 'stayed', 'staying', 'fall', 'falls', 'fell', 'fallen', 'falling',
  'cut', 'cuts', 'cutting', 'reach', 'reaches', 'reached', 'reaching',
  'kill', 'kills', 'killed', 'killing', 'remain', 'remains', 'remained', 'remaining',
  'suggest', 'suggests', 'suggested', 'suggesting', 'raise', 'raises', 'raised', 'raising',
  'pass', 'passes', 'passed', 'passing', 'sell', 'sells', 'sold', 'selling',
  'require', 'requires', 'required', 'requiring', 'report', 'reports', 'reported', 'reporting',
  'decide', 'decides', 'decided', 'deciding', 'pull', 'pulls', 'pulled', 'pulling',
  'develop', 'develops', 'developed', 'developing', 'agree', 'agrees', 'agreed', 'agreeing',
  'carry', 'carries', 'carried', 'carrying', 'describe', 'describes', 'described', 'describing',
  'receive', 'receives', 'received', 'receiving', 'sit', 'sits', 'sat', 'sitting',
  'stand', 'stands', 'stood', 'standing', 'lose', 'loses', 'lost', 'losing',
  'pay', 'pays', 'paid', 'paying', 'meet', 'meets', 'met', 'meeting',
  'include', 'includes', 'included', 'including', 'continue', 'continues', 'continued', 'continuing',
  'set', 'sets', 'setting', 'draw', 'draws', 'drew', 'drawn', 'drawing',
  'drive', 'drives', 'drove', 'driven', 'driving', 'break', 'breaks', 'broke', 'broken', 'breaking',
  'spend', 'spends', 'spent', 'spending', 'watch', 'watches', 'watched', 'watching',
  'explain', 'explains', 'explained', 'explaining', 'turn', 'turns', 'turned', 'turning',
  'point', 'points', 'pointed', 'pointing', 'fill', 'fills', 'filled', 'filling',
  'replace', 'replaces', 'replaced', 'replacing', 'control', 'controls', 'controlled', 'controlling',
  'protect', 'protects', 'protected', 'protecting', 'support', 'supports', 'supported', 'supporting',
  'cover', 'covers', 'covered', 'covering', 'remove', 'removes', 'removed', 'removing',
  'return', 'returns', 'returned', 'returning', 'kill', 'kills', 'killed', 'killing',
  'produce', 'produces', 'produced', 'producing', 'eat', 'eats', 'ate', 'eaten', 'eating',
  'save', 'saves', 'saved', 'saving', 'share', 'shares', 'shared', 'sharing',
  'provide', 'provides', 'provided', 'providing', 'reduce', 'reduces', 'reduced', 'reducing',
  'establish', 'establishes', 'established', 'establishing', 'hang', 'hangs', 'hung', 'hanging',
  'write', 'writes', 'wrote', 'written', 'writing', 'read', 'reads', 'reading',
  'close', 'closes', 'closed', 'closing', 'answer', 'answers', 'answered', 'answering',
  'ask', 'asks', 'asked', 'asking', 'fly', 'flies', 'flew', 'flown', 'flying',
  'prepare', 'prepares', 'prepared', 'preparing', 'wear', 'wears', 'wore', 'worn', 'wearing',
  'accept', 'accepts', 'accepted', 'accepting', 'apply', 'applies', 'applied', 'applying',
  'choose', 'chooses', 'chose', 'chosen', 'choosing', 'contain', 'contains', 'contained', 'containing',
  'enjoy', 'enjoys', 'enjoyed', 'enjoying', 'express', 'expresses', 'expressed', 'expressing',
  'finish', 'finishes', 'finished', 'finishing', 'forget', 'forgets', 'forgot', 'forgotten', 'forgetting',
  'imagine', 'imagines', 'imagined', 'imagining', 'improve', 'improves', 'improved', 'improving',
  'involve', 'involves', 'involved', 'involving', 'manage', 'manages', 'managed', 'managing',
  'miss', 'misses', 'missed', 'missing', 'notice', 'notices', 'noticed', 'noticing',
  'perform', 'performs', 'performed', 'performing', 'pick', 'picks', 'picked', 'picking',
  'plan', 'plans', 'planned', 'planning', 'prefer', 'prefers', 'preferred', 'preferring',
  'present', 'presents', 'presented', 'presenting', 'press', 'presses', 'pressed', 'pressing',
  'promise', 'promises', 'promised', 'promising', 'prove', 'proves', 'proved', 'proven', 'proving',
  'push', 'pushes', 'pushed', 'pushing', 'recognize', 'recognizes', 'recognized', 'recognizing',
  'refer', 'refers', 'referred', 'referring', 'refuse', 'refuses', 'refused', 'refusing',
  'release', 'releases', 'released', 'releasing', 'represent', 'represents', 'represented', 'representing',
  'respond', 'responds', 'responded', 'responding', 'rest', 'rests', 'rested', 'resting',
  'reveal', 'reveals', 'revealed', 'revealing', 'sleep', 'sleeps', 'slept', 'sleeping',
  'start', 'starts', 'started', 'starting', 'study', 'studies', 'studied', 'studying',
  'succeed', 'succeeds', 'succeeded', 'succeeding', 'suffer', 'suffers', 'suffered', 'suffering',
  'suppose', 'supposes', 'supposed', 'supposing', 'teach', 'teaches', 'taught', 'teaching',
  'test', 'tests', 'tested', 'testing', 'thank', 'thanks', 'thanked', 'thanking',
  'touch', 'touches', 'touched', 'touching', 'train', 'trains', 'trained', 'training',
  'travel', 'travels', 'travelled', 'traveled', 'travelling', 'traveling',
  'treat', 'treats', 'treated', 'treating', 'understand', 'understands', 'understood', 'understanding',
  'visit', 'visits', 'visited', 'visiting', 'wonder', 'wonders', 'wondered', 'wondering',
  'worry', 'worries', 'worried', 'worrying', 'wish', 'wishes', 'wished', 'wishing',
  'work', 'works', 'worked', 'working', 'call', 'calls', 'called', 'calling',
  'cause', 'causes', 'caused', 'causing', 'claim', 'claims', 'claimed', 'claiming',
  'compare', 'compares', 'compared', 'comparing', 'complete', 'completes', 'completed', 'completing',
  'confirm', 'confirms', 'confirmed', 'confirming', 'connect', 'connects', 'connected', 'connecting',
  'copy', 'copies', 'copied', 'copying', 'count', 'counts', 'counted', 'counting',
  'delete', 'deletes', 'deleted', 'deleting', 'deliver', 'delivers', 'delivered', 'delivering',
  'demand', 'demands', 'demanded', 'demanding', 'deny', 'denies', 'denied', 'denying',
  'design', 'designs', 'designed', 'designing', 'destroy', 'destroys', 'destroyed', 'destroying',
  'determine', 'determines', 'determined', 'determining', 'discover', 'discovers', 'discovered', 'discovering',
  'discuss', 'discusses', 'discussed', 'discussing', 'doubt', 'doubts', 'doubted', 'doubting',
  'drop', 'drops', 'dropped', 'dropping', 'encourage', 'encourages', 'encouraged', 'encouraging',
  'enter', 'enters', 'entered', 'entering', 'escape', 'escapes', 'escaped', 'escaping',
  'examine', 'examines', 'examined', 'examining', 'exist', 'exists', 'existed', 'existing',
  'experience', 'experiences', 'experienced', 'experiencing', 'explore', 'explores', 'explored', 'exploring',
  'face', 'faces', 'faced', 'facing', 'fail', 'fails', 'failed', 'failing',
  'force', 'forces', 'forced', 'forcing', 'form', 'forms', 'formed', 'forming',
  'gather', 'gathers', 'gathered', 'gathering', 'generate', 'generates', 'generated', 'generating',
  'grab', 'grabs', 'grabbed', 'grabbing', 'grant', 'grants', 'granted', 'granting',
  'guess', 'guesses', 'guessed', 'guessing', 'handle', 'handles', 'handled', 'handling',
  'hate', 'hates', 'hated', 'hating', 'hit', 'hits', 'hitting',
  'hope', 'hopes', 'hoped', 'hoping', 'identify', 'identifies', 'identified', 'identifying',
  'ignore', 'ignores', 'ignored', 'ignoring', 'increase', 'increases', 'increased', 'increasing',
  'indicate', 'indicates', 'indicated', 'indicating', 'insist', 'insists', 'insisted', 'insisting',
  'intend', 'intends', 'intended', 'intending', 'introduce', 'introduces', 'introduced', 'introducing',
  'invite', 'invites', 'invited', 'inviting', 'join', 'joins', 'joined', 'joining',
  'judge', 'judges', 'judged', 'judging', 'jump', 'jumps', 'jumped', 'jumping',
  'kick', 'kicks', 'kicked', 'kicking', 'kiss', 'kisses', 'kissed', 'kissing',
  'knock', 'knocks', 'knocked', 'knocking', 'lack', 'lacks', 'lacked', 'lacking',
  'last', 'lasts', 'lasted', 'lasting', 'laugh', 'laughs', 'laughed', 'laughing',
  'launch', 'launches', 'launched', 'launching', 'lay', 'lays', 'laid', 'laying',
  'lead', 'leads', 'led', 'leading', 'lift', 'lifts', 'lifted', 'lifting',
  'limit', 'limits', 'limited', 'limiting', 'link', 'links', 'linked', 'linking',
  'list', 'lists', 'listed', 'listing', 'listen', 'listens', 'listened', 'listening',
  'load', 'loads', 'loaded', 'loading', 'lock', 'locks', 'locked', 'locking',
  'look', 'looks', 'looked', 'looking', 'maintain', 'maintains', 'maintained', 'maintaining',
  'mark', 'marks', 'marked', 'marking', 'match', 'matches', 'matched', 'matching',
  'matter', 'matters', 'mattered', 'mattering', 'measure', 'measures', 'measured', 'measuring',
  'mention', 'mentions', 'mentioned', 'mentioning', 'mix', 'mixes', 'mixed', 'mixing',
  'note', 'notes', 'noted', 'noting', 'obtain', 'obtains', 'obtained', 'obtaining',
  'occur', 'occurs', 'occurred', 'occurring', 'operate', 'operates', 'operated', 'operating',
  'order', 'orders', 'ordered', 'ordering', 'organize', 'organizes', 'organized', 'organizing',
  'organise', 'organises', 'organised', 'organising',
  'own', 'owns', 'owned', 'owning', 'place', 'places', 'placed', 'placing',
  'post', 'posts', 'posted', 'posting', 'pour', 'pours', 'poured', 'pouring',
  'practice', 'practices', 'practiced', 'practicing', 'practise', 'practises', 'practised', 'practising',
  'predict', 'predicts', 'predicted', 'predicting', 'prevent', 'prevents', 'prevented', 'preventing',
  'print', 'prints', 'printed', 'printing', 'process', 'processes', 'processed', 'processing',
  'promote', 'promotes', 'promoted', 'promoting', 'propose', 'proposes', 'proposed', 'proposing',
  'pull', 'pulls', 'pulled', 'pulling', 'purchase', 'purchases', 'purchased', 'purchasing',
  'pursue', 'pursues', 'pursued', 'pursuing', 'quit', 'quits', 'quitting',
  'race', 'races', 'raced', 'racing', 'rain', 'rains', 'rained', 'raining',
  'react', 'reacts', 'reacted', 'reacting', 'realize', 'realizes', 'realized', 'realizing',
  'realise', 'realises', 'realised', 'realising', 'recall', 'recalls', 'recalled', 'recalling',
  'record', 'records', 'recorded', 'recording', 'reflect', 'reflects', 'reflected', 'reflecting',
  'regard', 'regards', 'regarded', 'regarding', 'reject', 'rejects', 'rejected', 'rejecting',
  'relate', 'relates', 'related', 'relating', 'relax', 'relaxes', 'relaxed', 'relaxing',
  'rely', 'relies', 'relied', 'relying', 'remind', 'reminds', 'reminded', 'reminding',
  'repeat', 'repeats', 'repeated', 'repeating', 'request', 'requests', 'requested', 'requesting',
  'research', 'researches', 'researched', 'researching', 'resolve', 'resolves', 'resolved', 'resolving',
  'respect', 'respects', 'respected', 'respecting', 'restore', 'restores', 'restored', 'restoring',
  'restrict', 'restricts', 'restricted', 'restricting', 'result', 'results', 'resulted', 'resulting',
  'retire', 'retires', 'retired', 'retiring', 'review', 'reviews', 'reviewed', 'reviewing',
  'ride', 'rides', 'rode', 'ridden', 'riding', 'ring', 'rings', 'rang', 'rung', 'ringing',
  'rise', 'rises', 'rose', 'risen', 'rising', 'roll', 'rolls', 'rolled', 'rolling',
  'rush', 'rushes', 'rushed', 'rushing', 'satisfy', 'satisfies', 'satisfied', 'satisfying',
  'scan', 'scans', 'scanned', 'scanning', 'score', 'scores', 'scored', 'scoring',
  'search', 'searches', 'searched', 'searching', 'seek', 'seeks', 'sought', 'seeking',
  'select', 'selects', 'selected', 'selecting', 'separate', 'separates', 'separated', 'separating',
  'settle', 'settles', 'settled', 'settling', 'shake', 'shakes', 'shook', 'shaken', 'shaking',
  'shape', 'shapes', 'shaped', 'shaping', 'shift', 'shifts', 'shifted', 'shifting',
  'shine', 'shines', 'shone', 'shining', 'shoot', 'shoots', 'shot', 'shooting',
  'shop', 'shops', 'shopped', 'shopping', 'shout', 'shouts', 'shouted', 'shouting',
  'shut', 'shuts', 'shutting', 'sign', 'signs', 'signed', 'signing',
  'sing', 'sings', 'sang', 'sung', 'singing', 'slip', 'slips', 'slipped', 'slipping',
  'smile', 'smiles', 'smiled', 'smiling', 'smoke', 'smokes', 'smoked', 'smoking',
  'solve', 'solves', 'solved', 'solving', 'sort', 'sorts', 'sorted', 'sorting',
  'sound', 'sounds', 'sounded', 'sounding', 'split', 'splits', 'splitting',
  'spread', 'spreads', 'spreading', 'stare', 'stares', 'stared', 'staring',
  'state', 'states', 'stated', 'stating', 'steal', 'steals', 'stole', 'stolen', 'stealing',
  'stick', 'sticks', 'stuck', 'sticking', 'store', 'stores', 'stored', 'storing',
  'strike', 'strikes', 'struck', 'striking', 'struggle', 'struggles', 'struggled', 'struggling',
  'submit', 'submits', 'submitted', 'submitting', 'supply', 'supplies', 'supplied', 'supplying',
  'surprise', 'surprises', 'surprised', 'surprising', 'surround', 'surrounds', 'surrounded', 'surrounding',
  'survive', 'survives', 'survived', 'surviving', 'suspect', 'suspects', 'suspected', 'suspecting',
  'swim', 'swims', 'swam', 'swum', 'swimming', 'switch', 'switches', 'switched', 'switching',
  'talk', 'talks', 'talked', 'talking', 'target', 'targets', 'targeted', 'targeting',
  'taste', 'tastes', 'tasted', 'tasting', 'tear', 'tears', 'tore', 'torn', 'tearing',
  'tend', 'tends', 'tended', 'tending', 'think', 'thinks', 'thought', 'thinking',
  'threaten', 'threatens', 'threatened', 'threatening', 'throw', 'throws', 'threw', 'thrown', 'throwing',
  'tie', 'ties', 'tied', 'tying', 'track', 'tracks', 'tracked', 'tracking',
  'trade', 'trades', 'traded', 'trading', 'transfer', 'transfers', 'transferred', 'transferring',
  'transform', 'transforms', 'transformed', 'transforming', 'translate', 'translates', 'translated', 'translating',
  'trust', 'trusts', 'trusted', 'trusting', 'type', 'types', 'typed', 'typing',
  'unite', 'unites', 'united', 'uniting', 'update', 'updates', 'updated', 'updating',
  'urge', 'urges', 'urged', 'urging', 'vary', 'varies', 'varied', 'varying',
  'view', 'views', 'viewed', 'viewing', 'vote', 'votes', 'voted', 'voting',
  'wake', 'wakes', 'woke', 'woken', 'waking', 'warn', 'warns', 'warned', 'warning',
  'wash', 'washes', 'washed', 'washing', 'waste', 'wastes', 'wasted', 'wasting',
  'weigh', 'weighs', 'weighed', 'weighing', 'welcome', 'welcomes', 'welcomed', 'welcoming',
  'whisper', 'whispers', 'whispered', 'whispering', 'wrap', 'wraps', 'wrapped', 'wrapping',
  'yell', 'yells', 'yelled', 'yelling', 'yield', 'yields', 'yielded', 'yielding',
  
  // Common nouns
  'time', 'year', 'years', 'people', 'way', 'ways', 'day', 'days', 'man', 'men',
  'woman', 'women', 'child', 'children', 'world', 'life', 'lives', 'hand', 'hands',
  'part', 'parts', 'place', 'places', 'case', 'cases', 'week', 'weeks', 'company', 'companies',
  'system', 'systems', 'program', 'programs', 'programme', 'programmes', 'question', 'questions',
  'work', 'works', 'government', 'governments', 'number', 'numbers', 'night', 'nights',
  'point', 'points', 'home', 'homes', 'water', 'waters', 'room', 'rooms',
  'mother', 'mothers', 'father', 'fathers', 'area', 'areas', 'money', 'story', 'stories',
  'fact', 'facts', 'month', 'months', 'lot', 'lots', 'right', 'rights', 'study', 'studies',
  'book', 'books', 'eye', 'eyes', 'job', 'jobs', 'word', 'words', 'business', 'businesses',
  'issue', 'issues', 'side', 'sides', 'kind', 'kinds', 'head', 'heads', 'house', 'houses',
  'service', 'services', 'friend', 'friends', 'power', 'powers', 'hour', 'hours',
  'game', 'games', 'line', 'lines', 'end', 'ends', 'member', 'members', 'law', 'laws',
  'car', 'cars', 'city', 'cities', 'community', 'communities', 'name', 'names',
  'president', 'presidents', 'team', 'teams', 'minute', 'minutes', 'idea', 'ideas',
  'kid', 'kids', 'body', 'bodies', 'information', 'back', 'backs', 'parent', 'parents',
  'face', 'faces', 'others', 'level', 'levels', 'office', 'offices', 'door', 'doors',
  'health', 'person', 'persons', 'art', 'arts', 'war', 'wars', 'history', 'histories',
  'party', 'parties', 'result', 'results', 'change', 'changes', 'morning', 'mornings',
  'reason', 'reasons', 'research', 'girl', 'girls', 'guy', 'guys', 'moment', 'moments',
  'air', 'teacher', 'teachers', 'force', 'forces', 'education', 'foot', 'feet',
  'food', 'foods', 'student', 'students', 'group', 'groups', 'country', 'countries',
  'problem', 'problems', 'school', 'schools', 'state', 'states', 'family', 'families',
  'thing', 'things', 'example', 'examples', 'paper', 'papers', 'music', 'boy', 'boys',
  'age', 'ages', 'policy', 'policies', 'process', 'processes', 'action', 'actions',
  'activity', 'activities', 'agency', 'agencies', 'agreement', 'agreements', 'amount', 'amounts',
  'analysis', 'analyses', 'animal', 'animals', 'approach', 'approaches', 'article', 'articles',
  'attention', 'audience', 'audiences', 'author', 'authors', 'bank', 'banks', 'bed', 'beds',
  'behavior', 'behaviour', 'behaviors', 'behaviours', 'benefit', 'benefits', 'bill', 'bills',
  'bit', 'bits', 'blood', 'board', 'boards', 'brother', 'brothers', 'budget', 'budgets',
  'building', 'buildings', 'campaign', 'campaigns', 'cancer', 'capital', 'career', 'careers',
  'cell', 'cells', 'center', 'centers', 'centre', 'centres', 'century', 'centuries',
  'challenge', 'challenges', 'chance', 'chances', 'character', 'characters', 'charge', 'charges',
  'choice', 'choices', 'church', 'churches', 'class', 'classes', 'coach', 'coaches',
  'college', 'colleges', 'color', 'colors', 'colour', 'colours', 'comment', 'comments',
  'commission', 'commissions', 'computer', 'computers', 'concern', 'concerns', 'condition', 'conditions',
  'conference', 'conferences', 'congress', 'connection', 'connections', 'consumer', 'consumers',
  'content', 'contents', 'context', 'contexts', 'contract', 'contracts', 'contribution', 'contributions',
  'control', 'controls', 'conversation', 'conversations', 'cost', 'costs', 'council', 'councils',
  'couple', 'couples', 'course', 'courses', 'court', 'courts', 'cover', 'covers',
  'credit', 'credits', 'crime', 'crimes', 'crisis', 'crises', 'culture', 'cultures',
  'customer', 'customers', 'data', 'daughter', 'daughters', 'deal', 'deals', 'death', 'deaths',
  'debate', 'debates', 'decade', 'decades', 'decision', 'decisions', 'defense', 'defenses',
  'defence', 'defences', 'degree', 'degrees', 'demand', 'demands', 'democracy', 'democracies',
  'department', 'departments', 'design', 'designs', 'detail', 'details', 'development', 'developments',
  'difference', 'differences', 'direction', 'directions', 'director', 'directors', 'discussion', 'discussions',
  'disease', 'diseases', 'doctor', 'doctors', 'dog', 'dogs', 'dollar', 'dollars',
  'drive', 'drives', 'drug', 'drugs', 'economy', 'economies', 'edge', 'edges',
  'effect', 'effects', 'effort', 'efforts', 'election', 'elections', 'element', 'elements',
  'employee', 'employees', 'energy', 'environment', 'environments', 'equipment', 'era', 'eras',
  'error', 'errors', 'event', 'events', 'evidence', 'exchange', 'exchanges', 'executive', 'executives',
  'exercise', 'exercises', 'experience', 'experiences', 'expert', 'experts', 'eye', 'eyes',
  'facility', 'facilities', 'factor', 'factors', 'failure', 'failures', 'fear', 'fears',
  'feature', 'features', 'feeling', 'feelings', 'field', 'fields', 'figure', 'figures',
  'file', 'files', 'film', 'films', 'finger', 'fingers', 'fire', 'fires',
  'firm', 'firms', 'floor', 'floors', 'focus', 'form', 'forms', 'freedom', 'freedoms',
  'front', 'fronts', 'function', 'functions', 'fund', 'funds', 'future', 'futures',
  'garden', 'gardens', 'gas', 'goal', 'goals', 'gold', 'ground', 'grounds',
  'growth', 'gun', 'guns', 'hair', 'half', 'halves', 'heart', 'hearts',
  'heat', 'help', 'horse', 'horses', 'hospital', 'hospitals', 'hotel', 'hotels',
  'husband', 'husbands', 'image', 'images', 'impact', 'impacts', 'importance', 'income', 'incomes',
  'increase', 'increases', 'individual', 'individuals', 'industry', 'industries', 'influence', 'influences',
  'institution', 'institutions', 'interest', 'interests', 'interview', 'interviews', 'investment', 'investments',
  'island', 'islands', 'item', 'items', 'knowledge', 'lack', 'land', 'lands',
  'language', 'languages', 'leader', 'leaders', 'leg', 'legs', 'letter', 'letters',
  'life', 'light', 'lights', 'list', 'lists', 'loss', 'losses', 'love', 'machine', 'machines',
  'magazine', 'magazines', 'majority', 'majorities', 'management', 'manager', 'managers', 'market', 'markets',
  'marriage', 'marriages', 'material', 'materials', 'matter', 'matters', 'meal', 'meals',
  'meaning', 'meanings', 'measure', 'measures', 'media', 'meeting', 'meetings', 'memory', 'memories',
  'message', 'messages', 'method', 'methods', 'middle', 'military', 'mind', 'minds',
  'minister', 'ministers', 'minority', 'minorities', 'mission', 'missions', 'model', 'models',
  'movie', 'movies', 'nation', 'nations', 'nature', 'need', 'needs', 'network', 'networks',
  'news', 'newspaper', 'newspapers', 'object', 'objects', 'office', 'official', 'officials',
  'oil', 'operation', 'operations', 'opinion', 'opinions', 'opportunity', 'opportunities',
  'option', 'options', 'order', 'orders', 'organization', 'organizations', 'organisation', 'organisations',
  'owner', 'owners', 'page', 'pages', 'pain', 'pains', 'painting', 'paintings',
  'pair', 'pairs', 'park', 'parks', 'partner', 'partners', 'patient', 'patients',
  'pattern', 'patterns', 'peace', 'performance', 'performances', 'period', 'periods', 'phone', 'phones',
  'photo', 'photos', 'photograph', 'photographs', 'picture', 'pictures', 'piece', 'pieces',
  'plan', 'plans', 'plant', 'plants', 'player', 'players', 'police', 'population', 'populations',
  'position', 'positions', 'possibility', 'possibilities', 'power', 'practice', 'practices', 'presence',
  'pressure', 'pressures', 'price', 'prices', 'principle', 'principles', 'prison', 'prisons',
  'procedure', 'procedures', 'product', 'products', 'production', 'profession', 'professions',
  'professor', 'professors', 'profit', 'profits', 'project', 'projects', 'property', 'properties',
  'proposal', 'proposals', 'protection', 'public', 'purpose', 'purposes', 'quality', 'qualities',
  'race', 'races', 'radio', 'radios', 'range', 'ranges', 'rate', 'rates',
  'reaction', 'reactions', 'reader', 'readers', 'reality', 'realities', 'reason', 'record', 'records',
  'region', 'regions', 'relation', 'relations', 'relationship', 'relationships', 'release', 'releases',
  'religion', 'religions', 'report', 'reports', 'reporter', 'reporters', 'republic', 'republics',
  'request', 'requests', 'requirement', 'requirements', 'resource', 'resources', 'response', 'responses',
  'responsibility', 'responsibilities', 'rest', 'restaurant', 'restaurants', 'return', 'returns',
  'review', 'reviews', 'risk', 'risks', 'road', 'roads', 'rock', 'rocks',
  'role', 'roles', 'rule', 'rules', 'safety', 'sale', 'sales', 'scene', 'scenes',
  'science', 'sciences', 'screen', 'screens', 'season', 'seasons', 'seat', 'seats',
  'section', 'sections', 'security', 'securities', 'sense', 'senses', 'series', 'session', 'sessions',
  'sex', 'shape', 'shapes', 'share', 'shares', 'shot', 'shots', 'show', 'shows',
  'sign', 'signs', 'site', 'sites', 'situation', 'situations', 'size', 'sizes',
  'skill', 'skills', 'skin', 'skins', 'smile', 'smiles', 'society', 'societies',
  'soldier', 'soldiers', 'solution', 'solutions', 'son', 'sons', 'song', 'songs',
  'sort', 'sorts', 'sound', 'sounds', 'source', 'sources', 'space', 'spaces',
  'species', 'speech', 'speeches', 'speed', 'speeds', 'spirit', 'spirits', 'sport', 'sports',
  'spot', 'spots', 'staff', 'stage', 'stages', 'standard', 'standards', 'star', 'stars',
  'start', 'starts', 'station', 'stations', 'status', 'statuses', 'step', 'steps',
  'stock', 'stocks', 'store', 'stores', 'strategy', 'strategies', 'street', 'streets',
  'strength', 'strengths', 'structure', 'structures', 'style', 'styles', 'subject', 'subjects',
  'success', 'successes', 'summer', 'summers', 'sun', 'surface', 'surfaces', 'support', 'supports',
  'table', 'tables', 'tax', 'taxes', 'technology', 'technologies', 'television', 'televisions',
  'term', 'terms', 'test', 'tests', 'text', 'texts', 'theory', 'theories',
  'thought', 'thoughts', 'threat', 'threats', 'title', 'titles', 'today', 'tonight',
  'tool', 'tools', 'top', 'tops', 'topic', 'topics', 'total', 'totals',
  'town', 'towns', 'track', 'tracks', 'trade', 'trades', 'tradition', 'traditions',
  'training', 'treatment', 'treatments', 'tree', 'trees', 'trend', 'trends', 'trial', 'trials',
  'trip', 'trips', 'trouble', 'troubles', 'truck', 'trucks', 'truth', 'truths',
  'unit', 'units', 'university', 'universities', 'user', 'users', 'value', 'values',
  'variety', 'varieties', 'version', 'versions', 'victim', 'victims', 'victory', 'victories',
  'video', 'videos', 'view', 'views', 'village', 'villages', 'violence', 'vision', 'visions',
  'voice', 'voices', 'wall', 'walls', 'war', 'wave', 'waves', 'weapon', 'weapons',
  'weather', 'website', 'websites', 'weekend', 'weekends', 'weight', 'weights', 'west',
  'wife', 'wives', 'window', 'windows', 'winter', 'winters', 'woman', 'wonder', 'wonders',
  'wood', 'woods', 'worker', 'workers', 'writer', 'writers', 'yard', 'yards', 'yesterday',
  
  // Common adjectives
  'good', 'better', 'best', 'new', 'newer', 'newest', 'first', 'last', 'long', 'longer', 'longest',
  'great', 'greater', 'greatest', 'little', 'less', 'least', 'own', 'other', 'others',
  'old', 'older', 'oldest', 'right', 'big', 'bigger', 'biggest', 'high', 'higher', 'highest',
  'different', 'small', 'smaller', 'smallest', 'large', 'larger', 'largest', 'next', 'early', 'earlier', 'earliest',
  'young', 'younger', 'youngest', 'important', 'few', 'fewer', 'fewest', 'public', 'bad', 'worse', 'worst',
  'same', 'able', 'sure', 'free', 'freer', 'freest', 'true', 'truer', 'truest', 'whole',
  'real', 'black', 'white', 'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'brown', 'grey', 'gray',
  'full', 'fuller', 'fullest', 'easy', 'easier', 'easiest', 'hard', 'harder', 'hardest',
  'clear', 'clearer', 'clearest', 'recent', 'certain', 'personal', 'open', 'close', 'closer', 'closest',
  'possible', 'impossible', 'simple', 'simpler', 'simplest', 'strong', 'stronger', 'strongest',
  'special', 'social', 'political', 'local', 'national', 'international', 'human', 'natural',
  'beautiful', 'happy', 'happier', 'happiest', 'final', 'main', 'major', 'available',
  'common', 'current', 'economic', 'environmental', 'federal', 'financial', 'foreign', 'general',
  'global', 'hot', 'hotter', 'hottest', 'cold', 'colder', 'coldest', 'dark', 'darker', 'darkest',
  'deep', 'deeper', 'deepest', 'direct', 'effective', 'entire', 'equal', 'exact',
  'fair', 'famous', 'fast', 'faster', 'fastest', 'fine', 'finer', 'finest', 'fresh', 'front',
  'glad', 'golden', 'heavy', 'heavier', 'heaviest', 'huge', 'immediate', 'individual', 'initial',
  'key', 'legal', 'light', 'likely', 'living', 'low', 'lower', 'lowest', 'medical', 'military',
  'modern', 'narrow', 'negative', 'normal', 'obvious', 'official', 'original', 'particular',
  'past', 'perfect', 'physical', 'popular', 'positive', 'potential', 'powerful', 'previous',
  'primary', 'private', 'professional', 'proper', 'proud', 'quick', 'quicker', 'quickest',
  'quiet', 'quieter', 'quietest', 'rapid', 'ready', 'regular', 'relative', 'religious',
  'responsible', 'rich', 'richer', 'richest', 'rough', 'round', 'safe', 'safer', 'safest',
  'scientific', 'secret', 'senior', 'serious', 'sharp', 'sharper', 'sharpest', 'short', 'shorter', 'shortest',
  'significant', 'similar', 'single', 'slight', 'slow', 'slower', 'slowest', 'smooth', 'soft', 'softer', 'softest',
  'solid', 'sorry', 'southern', 'specific', 'standard', 'strange', 'sudden', 'successful',
  'sweet', 'sweeter', 'sweetest', 'tall', 'taller', 'tallest', 'terrible', 'thick', 'thicker', 'thickest',
  'thin', 'thinner', 'thinnest', 'tight', 'tiny', 'top', 'tough', 'traditional', 'typical', 'unique',
  'upper', 'useful', 'usual', 'various', 'warm', 'warmer', 'warmest', 'weak', 'weaker', 'weakest',
  'western', 'wide', 'wider', 'widest', 'wild', 'wonderful', 'wrong', 'angry', 'basic',
  'brief', 'busy', 'busier', 'busiest', 'cheap', 'cheaper', 'cheapest', 'clean', 'cleaner', 'cleanest',
  'complex', 'confused', 'correct', 'critical', 'cultural', 'dangerous', 'dead', 'decent',
  'desperate', 'digital', 'dirty', 'dirtier', 'dirtiest', 'dramatic', 'dry', 'drier', 'driest',
  'educational', 'efficient', 'electric', 'electronic', 'empty', 'enormous', 'excellent',
  'expensive', 'extreme', 'familiar', 'fantastic', 'fat', 'fatter', 'fattest', 'favorite', 'favourite',
  'flat', 'flatter', 'flattest', 'flexible', 'foreign', 'formal', 'former', 'fortunate',
  'frequent', 'friendly', 'frightened', 'funny', 'funnier', 'funniest', 'gentle', 'genuine',
  'grateful', 'guilty', 'healthy', 'healthier', 'healthiest', 'helpful', 'historical', 'holy',
  'honest', 'horrible', 'hungry', 'hungrier', 'hungriest', 'ill', 'illegal', 'independent',
  'inevitable', 'informal', 'inner', 'innocent', 'intelligent', 'interesting', 'internal',
  'joint', 'junior', 'keen', 'kind', 'kinder', 'kindest', 'late', 'later', 'latest', 'latter',
  'lazy', 'lazier', 'laziest', 'leading', 'left', 'lonely', 'loose', 'lucky', 'luckier', 'luckiest',
  'mad', 'magnetic', 'male', 'female', 'massive', 'mental', 'mere', 'middle', 'minimum',
  'minor', 'mixed', 'moral', 'naked', 'nasty', 'native', 'neat', 'necessary', 'nervous',
  'nice', 'nicer', 'nicest', 'northern', 'nuclear', 'numerous', 'odd', 'okay', 'ok', 'online',
  'ordinary', 'outer', 'overall', 'painful', 'pale', 'parallel', 'partial', 'patient',
  'permanent', 'plain', 'plastic', 'pleasant', 'plenty', 'plus', 'polite', 'poor', 'poorer', 'poorest',
  'pregnant', 'present', 'pretty', 'prettier', 'prettiest', 'prime', 'principal', 'prior',
  'probable', 'pure', 'purer', 'purest', 'rare', 'rarer', 'rarest', 'raw', 'reasonable', 'relevant',
  'remarkable', 'remote', 'retired', 'revolutionary', 'rich', 'ridiculous', 'romantic',
  'royal', 'rural', 'sad', 'sadder', 'saddest', 'scared', 'secure', 'sensitive', 'separate',
  'severe', 'sexual', 'shallow', 'shocked', 'sick', 'sicker', 'sickest', 'silent', 'silly',
  'silver', 'smart', 'smarter', 'smartest', 'sophisticated', 'sour', 'spare', 'spiritual',
  'stable', 'steady', 'steep', 'still', 'straight', 'strict', 'stupid', 'stupid', 'substantial',
  'sufficient', 'suitable', 'super', 'supreme', 'surprised', 'suspicious', 'technical',
  'temporary', 'tender', 'thin', 'tired', 'total', 'traditional', 'tremendous', 'tropical',
  'ugly', 'uglier', 'ugliest', 'ultimate', 'unable', 'uncomfortable', 'underground', 'unlikely',
  'unnecessary', 'unusual', 'urban', 'urgent', 'valuable', 'visible', 'visual', 'vital',
  'warm', 'wealthy', 'wealthier', 'wealthiest', 'weekly', 'wet', 'wetter', 'wettest',
  'willing', 'wise', 'wiser', 'wisest', 'wonderful', 'wooden', 'worried', 'worthy', 'yellow',
  
  // Common adverbs
  'not', 'also', 'very', 'just', 'only', 'now', 'then', 'more', 'here', 'there',
  'still', 'well', 'even', 'back', 'never', 'really', 'most', 'much', 'already',
  'always', 'often', 'however', 'again', 'too', 'yet', 'today', 'ever', 'once',
  'together', 'almost', 'enough', 'sometimes', 'probably', 'actually', 'later',
  'soon', 'early', 'especially', 'certainly', 'clearly', 'finally', 'simply',
  'quickly', 'slowly', 'usually', 'exactly', 'perhaps', 'maybe', 'recently',
  'suddenly', 'nearly', 'easily', 'generally', 'rather', 'quite', 'rather',
  'certainly', 'completely', 'seriously', 'properly', 'apparently', 'carefully',
  'clearly', 'directly', 'equally', 'eventually', 'extremely', 'fairly', 'frequently',
  'gradually', 'hardly', 'heavily', 'highly', 'immediately', 'increasingly', 'indeed',
  'initially', 'largely', 'mainly', 'merely', 'naturally', 'necessarily', 'normally',
  'obviously', 'occasionally', 'originally', 'particularly', 'partly', 'perfectly',
  'personally', 'possibly', 'potentially', 'precisely', 'previously', 'primarily',
  'rapidly', 'regularly', 'relatively', 'seriously', 'significantly', 'similarly',
  'slightly', 'strongly', 'successfully', 'truly', 'typically', 'ultimately',
  'unfortunately', 'absolutely', 'basically', 'constantly', 'deeply', 'definitely',
  'effectively', 'entirely', 'essentially', 'forever', 'fully', 'hopefully',
  'literally', 'loudly', 'mostly', 'nearby', 'officially', 'openly', 'otherwise',
  'overall', 'purely', 'roughly', 'sadly', 'safely', 'seriously', 'sharply',
  'softly', 'somewhere', 'specifically', 'strictly', 'strongly', 'surely', 'totally',
  'widely', 'anywhere', 'everywhere', 'nowhere', 'somehow', 'somewhat', 'anyway',
  'besides', 'meanwhile', 'nevertheless', 'nonetheless', 'therefore', 'thus',
  'hence', 'furthermore', 'moreover', 'otherwise', 'accordingly', 'consequently',
  'alternatively', 'additionally', 'subsequently', 'simultaneously', 'predominantly',
  
  // Prepositions and conjunctions
  'of', 'to', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'up', 'about',
  'into', 'over', 'after', 'beneath', 'under', 'above', 'and', 'but', 'or',
  'as', 'if', 'when', 'than', 'because', 'while', 'although', 'though', 'whether',
  'before', 'since', 'so', 'until', 'unless', 'through', 'during', 'between',
  'against', 'without', 'within', 'along', 'following', 'across', 'behind',
  'beyond', 'plus', 'except', 'around', 'among', 'per', 'off', 'down', 'out',
  'near', 'beside', 'besides', 'despite', 'toward', 'towards', 'upon', 'via',
  'wherever', 'whenever', 'whereas', 'whereby', 'wherein', 'whereupon',
  
  // Numbers and ordinals
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
  'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety',
  'hundred', 'thousand', 'million', 'billion', 'trillion',
  'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth',
  'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth', 'sixteenth', 'seventeenth', 'eighteenth', 'nineteenth',
  'twentieth', 'thirtieth', 'fortieth', 'fiftieth', 'sixtieth', 'seventieth', 'eightieth', 'ninetieth', 'hundredth',
  'once', 'twice', 'thrice', 'half', 'quarter', 'double', 'triple',
  
  // Common contractions
  "don't", "doesn't", "didn't", "won't", "wouldn't", "can't", "couldn't", "shouldn't",
  "isn't", "aren't", "wasn't", "weren't", "haven't", "hasn't", "hadn't",
  "i'm", "you're", "he's", "she's", "it's", "we're", "they're",
  "i've", "you've", "we've", "they've", "i'll", "you'll", "he'll", "she'll",
  "we'll", "they'll", "i'd", "you'd", "he'd", "she'd", "we'd", "they'd",
  "that's", "what's", "who's", "there's", "here's", "let's", "where's", "how's",
  "ain't", "gonna", "gotta", "wanna", "cannot", "cannot",
  
  // Dyslexia-friendly words (commonly confused)
  'where', 'were', 'wear', 'weather', 'whether', 'their', 'there', 'they\'re',
  'accept', 'except', 'affect', 'effect', 'then', 'than', 'loose', 'lose',
  'quite', 'quiet', 'through', 'threw', 'thorough', 'though', 'thought',
  'bought', 'brought', 'caught', 'taught', 'because', 'receive', 'believe',
  'achieve', 'friend', 'weird', 'height', 'weight', 'eight', 'straight',
  'neighbour', 'neighbor', 'colour', 'color', 'favour', 'favor', 'honour', 'honor',
  'behaviour', 'behavior', 'centre', 'center', 'metre', 'meter', 'theatre', 'theater',
  'realise', 'realize', 'recognise', 'recognize', 'organise', 'organize',
  'apologise', 'apologize', 'criticise', 'criticize', 'emphasise', 'emphasize',
  'analyse', 'analyze', 'paralyse', 'paralyze', 'catalogue', 'catalog',
  'dialogue', 'dialog', 'programme', 'program', 'defence', 'defense',
  'licence', 'license', 'offence', 'offense', 'practise', 'practice',
  'travelling', 'traveling', 'travelled', 'traveled', 'cancelled', 'canceled',
  'jewellery', 'jewelry', 'grey', 'gray', 'ageing', 'aging',
  
  // Academic and exam words
  'analyse', 'analyze', 'argument', 'arguments', 'conclusion', 'conclusions',
  'definition', 'definitions', 'describe', 'describes', 'describing', 'description', 'descriptions',
  'discuss', 'discusses', 'discussing', 'discussion', 'discussions',
  'evaluate', 'evaluates', 'evaluating', 'evaluation', 'evaluations',
  'evidence', 'explain', 'explains', 'explaining', 'explanation', 'explanations',
  'hypothesis', 'hypotheses', 'illustrate', 'illustrates', 'illustrating', 'illustration', 'illustrations',
  'introduction', 'introductions', 'justify', 'justifies', 'justifying', 'justification', 'justifications',
  'method', 'methods', 'methodology', 'methodologies', 'outline', 'outlines', 'outlining',
  'paragraph', 'paragraphs', 'perspective', 'perspectives', 'principle', 'principles',
  'procedure', 'procedures', 'relevant', 'relevance', 'source', 'sources',
  'structure', 'structures', 'summary', 'summaries', 'summarize', 'summarise',
  'theory', 'theories', 'theoretical', 'therefore', 'thus', 'whereas',
  'significant', 'significance', 'significantly', 'subsequently', 'furthermore',
  'moreover', 'nevertheless', 'consequently', 'alternatively', 'specifically',
  'particularly', 'essentially', 'approximately', 'predominantly', 'effectively',
  'similarly', 'conversely', 'accordingly', 'additionally', 'simultaneously',
  'ultimately', 'initially', 'primarily', 'fundamentally', 'inherently',
  'intrinsically', 'extrinsically', 'objectively', 'subjectively', 'empirically',
  'theoretically', 'practically', 'conceptually', 'hypothetically', 'statistically',
  'quantitatively', 'qualitatively', 'systematically', 'chronologically', 'geographically',
  
  // Technology and modern terms
  'internet', 'website', 'websites', 'email', 'emails', 'online', 'offline',
  'computer', 'computers', 'software', 'hardware', 'download', 'downloads', 'uploading', 'upload', 'uploads',
  'application', 'applications', 'app', 'apps', 'database', 'databases',
  'password', 'passwords', 'username', 'usernames', 'login', 'logout',
  'smartphone', 'smartphones', 'tablet', 'tablets', 'laptop', 'laptops',
  'desktop', 'desktops', 'keyboard', 'keyboards', 'mouse', 'monitor', 'monitors',
  'browser', 'browsers', 'search', 'searches', 'searching', 'google', 'googling',
  'facebook', 'twitter', 'instagram', 'youtube', 'tiktok', 'snapchat',
  'wifi', 'bluetooth', 'wireless', 'digital', 'virtual', 'cyber',
  'algorithm', 'algorithms', 'artificial', 'intelligence', 'machine', 'learning',
  'data', 'analytics', 'cloud', 'server', 'servers', 'network', 'networks',
  'programming', 'coding', 'developer', 'developers', 'tech', 'technology', 'technologies',
  
  // Common proper nouns (countries, days, months)
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august',
  'september', 'october', 'november', 'december',
  'america', 'american', 'americans', 'britain', 'british', 'england', 'english',
  'france', 'french', 'germany', 'german', 'spain', 'spanish', 'italy', 'italian',
  'china', 'chinese', 'japan', 'japanese', 'india', 'indian', 'australia', 'australian',
  'canada', 'canadian', 'mexico', 'mexican', 'brazil', 'brazilian', 'russia', 'russian',
  'africa', 'african', 'europe', 'european', 'asia', 'asian', 'america', 'americas',
  
  // Additional common words
  'okay', 'ok', 'yeah', 'yes', 'no', 'please', 'thanks', 'thank', 'sorry', 'hello', 'hi', 'bye', 'goodbye',
  'morning', 'afternoon', 'evening', 'tonight', 'tomorrow', 'yesterday', 'today',
  'week', 'month', 'year', 'day', 'hour', 'minute', 'second', 'moment',
  'everything', 'something', 'nothing', 'anything', 'everyone', 'someone', 'anyone', 'nobody', 'everybody', 'somebody', 'anybody',
  'somewhere', 'anywhere', 'nowhere', 'everywhere', 'somehow', 'anyhow', 'somewhat',
  'whatever', 'whoever', 'whenever', 'wherever', 'however', 'whichever', 'whatsoever'
]);

// Common dyslexia letter substitutions for suggestions
const DYSLEXIA_SWAPS: [string, string][] = [
  ['b', 'd'], ['d', 'b'],
  ['p', 'q'], ['q', 'p'],
  ['m', 'w'], ['w', 'm'],
  ['n', 'u'], ['u', 'n'],
  ['6', '9'], ['9', '6'],
  ['a', 'e'], ['e', 'a'],
  ['i', 'e'], ['e', 'i'],
  ['o', 'a'], ['a', 'o'],
  ['c', 'k'], ['k', 'c'],
  ['s', 'c'], ['c', 's'],
  ['f', 'v'], ['v', 'f'],
  ['t', 'd'], ['d', 't'],
  ['g', 'j'], ['j', 'g'],
];

// Common phonetic confusions
const PHONETIC_CONFUSIONS: [string, string][] = [
  ['ph', 'f'], ['f', 'ph'],
  ['ough', 'off'], ['ough', 'uff'],
  ['tion', 'shun'], ['sion', 'zhun'],
  ['ck', 'k'], ['k', 'ck'],
  ['ight', 'ite'], ['ite', 'ight'],
  ['ei', 'ie'], ['ie', 'ei'],
  ['ance', 'ence'], ['ence', 'ance'],
  ['able', 'ible'], ['ible', 'able'],
  ['er', 'or'], ['or', 'er'],
  ['ar', 'er'], ['er', 'ar'],
];

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

/**
 * Improved Soundex implementation for phonetic similarity
 */
function soundex(word: string): string {
  const a = word.toLowerCase().split('');
  const firstLetter = a.shift() || '';
  
  const codes: { [key: string]: string } = {
    a: '', e: '', i: '', o: '', u: '', h: '', w: '', y: '',
    b: '1', f: '1', p: '1', v: '1',
    c: '2', g: '2', j: '2', k: '2', q: '2', s: '2', x: '2', z: '2',
    d: '3', t: '3',
    l: '4',
    m: '5', n: '5',
    r: '6'
  };
  
  const coded = a.map(char => codes[char] || '').join('');
  const deduped = coded.replace(/(.)\1+/g, '$1');
  
  return (firstLetter + deduped + '000').slice(0, 4).toUpperCase();
}

/**
 * Double Metaphone-inspired phonetic encoding
 */
function metaphone(word: string): string {
  let result = word.toLowerCase();
  
  // Handle silent letters and common patterns
  result = result
    .replace(/^kn/, 'n')
    .replace(/^gn/, 'n')
    .replace(/^pn/, 'n')
    .replace(/^wr/, 'r')
    .replace(/^ps/, 's')
    .replace(/mb$/, 'm')
    .replace(/ght/, 't')
    .replace(/ph/, 'f')
    .replace(/ck/, 'k')
    .replace(/sh/, 'x')
    .replace(/ch/, 'x')
    .replace(/th/, '0')
    .replace(/wh/, 'w')
    .replace(/[aeiou]/g, 'a')
    .replace(/(.)\1+/g, '$1');
  
  return result.slice(0, 6);
}

/**
 * Generate suggestions for a misspelled word with improved accuracy
 */
function generateSuggestions(word: string, maxSuggestions: number = 5): string[] {
  const lowerWord = word.toLowerCase();
  const suggestions: { word: string; score: number }[] = [];
  const wordSoundex = soundex(lowerWord);
  const wordMetaphone = metaphone(lowerWord);
  const wordLength = lowerWord.length;
  
  // Check dictionary words
  for (const dictWord of COMMON_WORDS) {
    // Skip words that are too different in length
    if (Math.abs(dictWord.length - wordLength) > 3) continue;
    
    const distance = levenshteinDistance(lowerWord, dictWord);
    
    // Adaptive distance threshold based on word length
    const maxDistance = wordLength <= 4 ? 1 : wordLength <= 6 ? 2 : 3;
    
    if (distance <= maxDistance && distance > 0) {
      const phoneticMatchSoundex = soundex(dictWord) === wordSoundex;
      const phoneticMatchMetaphone = metaphone(dictWord) === wordMetaphone;
      
      // Calculate score (lower is better)
      let score = distance * 10;
      if (phoneticMatchSoundex) score -= 5;
      if (phoneticMatchMetaphone) score -= 5;
      
      // Bonus for same starting letter
      if (dictWord[0] === lowerWord[0]) score -= 3;
      
      // Bonus for same ending
      if (dictWord.slice(-2) === lowerWord.slice(-2)) score -= 2;
      
      suggestions.push({ word: dictWord, score });
    }
  }
  
  // Add dyslexia-specific suggestions
  for (const [from, to] of DYSLEXIA_SWAPS) {
    if (lowerWord.includes(from)) {
      const swapped = lowerWord.replace(new RegExp(from, 'g'), to);
      if (COMMON_WORDS.has(swapped) && !suggestions.find(s => s.word === swapped)) {
        suggestions.push({ word: swapped, score: 0 }); // High priority
      }
    }
  }
  
  // Add phonetic confusion suggestions
  for (const [from, to] of PHONETIC_CONFUSIONS) {
    if (lowerWord.includes(from)) {
      const swapped = lowerWord.replace(from, to);
      if (COMMON_WORDS.has(swapped) && !suggestions.find(s => s.word === swapped)) {
        suggestions.push({ word: swapped, score: 1 }); // High priority
      }
    }
  }
  
  // Check for common misspelling patterns
  const commonPatterns = [
    [/ie/g, 'ei'], [/ei/g, 'ie'],
    [/ible/g, 'able'], [/able/g, 'ible'],
    [/ence/g, 'ance'], [/ance/g, 'ence'],
    [/ant/g, 'ent'], [/ent/g, 'ant'],
    [/er$/g, 'or'], [/or$/g, 'er'],
    [/ise$/g, 'ize'], [/ize$/g, 'ise'],
    [/our$/g, 'or'], [/or$/g, 'our'],
  ];
  
  for (const [pattern, replacement] of commonPatterns) {
    if ((pattern as RegExp).test(lowerWord)) {
      const fixed = lowerWord.replace(pattern as RegExp, replacement as string);
      if (COMMON_WORDS.has(fixed) && !suggestions.find(s => s.word === fixed)) {
        suggestions.push({ word: fixed, score: 2 });
      }
    }
  }
  
  // Sort by score (lower is better) and dedupe
  const seen = new Set<string>();
  return suggestions
    .sort((a, b) => a.score - b.score)
    .filter(s => {
      if (seen.has(s.word)) return false;
      seen.add(s.word);
      return true;
    })
    .slice(0, maxSuggestions)
    .map(s => s.word);
}

/**
 * Check if a word is spelled correctly
 */
function isCorrectlySpelled(word: string): boolean {
  const lowerWord = word.toLowerCase();
  
  // Single letters are valid
  if (word.length === 1) return true;
  
  // Check dictionary
  if (COMMON_WORDS.has(lowerWord)) return true;
  
  // Check if it's a number or contains numbers
  if (/^\d+$/.test(word)) return true;
  if (/^\d+(st|nd|rd|th)$/.test(lowerWord)) return true; // 1st, 2nd, etc.
  
  // Check for common suffixes on known words
  const suffixes = ['ing', 'ed', 'er', 'est', 'ly', 's', 'es', 'ness', 'ment', 'ful', 'less', 'tion', 'sion'];
  for (const suffix of suffixes) {
    if (lowerWord.endsWith(suffix)) {
      const base = lowerWord.slice(0, -suffix.length);
      if (COMMON_WORDS.has(base)) return true;
      // Handle doubled consonants (running -> run)
      if (base.length > 1 && base[base.length - 1] === base[base.length - 2]) {
        const singleConsonant = base.slice(0, -1);
        if (COMMON_WORDS.has(singleConsonant)) return true;
      }
      // Handle e-dropping (making -> make)
      if (COMMON_WORDS.has(base + 'e')) return true;
    }
  }
  
  // Check for 's possessive
  if (lowerWord.endsWith("'s") || lowerWord.endsWith("s'")) {
    const base = lowerWord.replace(/'s$|s'$/, '');
    if (COMMON_WORDS.has(base)) return true;
  }
  
  // Check common proper noun patterns (capitalized words)
  if (word.length > 1 && word[0] === word[0].toUpperCase() && 
      word.slice(1) === word.slice(1).toLowerCase()) {
    // Could be a proper noun - be lenient
    return true;
  }
  
  // Check for hyphenated words
  if (word.includes('-')) {
    const parts = word.split('-');
    if (parts.every(part => isCorrectlySpelled(part))) return true;
  }
  
  return false;
}

/**
 * Run spell check on segmented text
 */
export function checkSpelling(segmentedText: SegmentedText): SpellCheckResult {
  const errors: SpellError[] = [];
  
  for (const word of segmentedText.allWords) {
    if (!isCorrectlySpelled(word.word) && !isInSessionDictionary(word.word)) {
      errors.push({
        word: word.word,
        charStart: word.charStart,
        charEnd: word.charEnd,
        wordIndex: word.wordIndex,
        suggestions: generateSuggestions(word.word)
      });
    }
  }
  
  return { errors };
}

/**
 * Add a word to the session dictionary (not persisted)
 */
const sessionDictionary = new Set<string>();

export function addToSessionDictionary(word: string): void {
  sessionDictionary.add(word.toLowerCase());
}

export function isInSessionDictionary(word: string): boolean {
  return sessionDictionary.has(word.toLowerCase());
}

export function clearSessionDictionary(): void {
  sessionDictionary.clear();
}
