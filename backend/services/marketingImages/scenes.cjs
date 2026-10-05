'use strict';
const { FORBIDDEN } = require('./direction.cjs');
const FORMATS = {
  blog: { label: 'Blog hero', width:1536, height:1024, native:'1536x1024', web:true },
  og: { label:'Blog share cover', width:1200, height:630, native:'1536x1024', web:true },
  linkedin_header: { label:'LinkedIn header', width:1584, height:396, native:'1536x1024', web:false },
  linkedin: { label:'LinkedIn square', width:1200, height:1200, native:'1024x1024', web:false },
  linkedin_wide: { label:'LinkedIn wide', width:1200, height:627, native:'1536x1024', web:false },
  feed: { label:'Instagram / Facebook portrait', width:1080, height:1350, native:'1024x1536', web:false },
  square: { label:'Instagram / Facebook square', width:1080, height:1080, native:'1024x1024', web:false },
  story: { label:'Story / Reel cover', width:1080, height:1920, native:'1024x1536', web:false },
  email: { label:'Email header', width:1200, height:600, native:'1536x1024', web:true },
  landing: { label:'Landing hero', width:1536, height:1024, native:'1536x1024', web:true }
};
const subjects = [
 ['blog','referrals','An empty chair opposite a loan officer in a quiet coffee shop at dawn','quiet disappointment'],
 ['blog','referrals','Two professionals exchanging keys on a shaded front porch','earned trust'],
 ['blog','referrals','A loan officer setting down two coffees beside an unopened laptop','hopeful reconnection'],
 ['blog','warm leads','An adult looking at a softly lit phone on a kitchen counter late Sunday evening','quiet anticipation'],
 ['blog','warm leads','A lone buyer pausing at the doorway of a softly lit open house','curiosity'],
 ['blog','warm leads','A loan officer reaching for a ringing phone beside a cup of coffee at sunrise','relief'],
 ['blog','LO marketing','A professional arranging a notebook and phone at a modest home office','calm focus'],
 ['blog','LO marketing','An agent and loan officer discussing a laptop in a neighborhood coffee shop','shared momentum'],
 ['blog','LO marketing','A professional closing a laptop and looking toward a warm lit window','breathing room'],
 ['blog','AI','A phone softly lighting up on a kitchen counter while its owner cooks dinner','quiet help'],
 ['blog','AI','An adult resting beside an open notebook after an evening of work','time reclaimed'],
 ['blog','AI','A buyer holding a phone outside a home at golden hour','an answer within reach'],
 ['blog','agent partners','Two professionals standing side by side at a front gate','partnership'],
 ['blog','agent partners','An agent greeting a loan officer on a porch before an open house','warm welcome'],
 ['blog','agent partners','Two adults leaning over a closed folder in a bright coffee shop','aligned goals'],
 ['social','warm leads','A softly lit phone resting beside a mug in a dark kitchen','anticipation'],
 ['social','referrals','An empty coffee cup opposite an occupied chair in a cafe','missed connection'],
 ['social','agent partners','Two working adults laughing naturally while walking toward a porch','trust'],
 ['social','LO marketing','A professional putting away a phone before family dinner','balance'],
 ['social','AI','Warm window light illuminating a quiet house at dusk','always welcoming'],
 ['social','warm leads','A buyer touching a door handle at an open house','first step'],
 ['social','referrals','Keys passing between two adult hands beside a front door','confidence'],
 ['social','agent partners','An agent and loan officer reviewing a laptop with its screen facing away','teamwork'],
 ['social','LO marketing','A loan officer taking a call by a window overlooking a quiet street','momentum'],
 ['social','AI','A phone face down beside a cup of tea in an evening home office','less noise'],
 ['email','referrals','Two untouched cups of coffee on a small cafe table','an invitation'],
 ['email','warm leads','A softly lit desk with a notebook and phone seen from the side','quiet readiness'],
 ['email','agent partners','An open front door with warm light falling on the porch','welcome'],
 ['email','LO marketing','A pen resting on a blank notebook beside a window','a fresh start'],
 ['email','AI','An adult putting keys beside a silent phone after work','calm'],
 ['landing','Talk to the House','A buyer holding a phone while approaching a warmly lit home','curiosity and welcome'],
 ['landing','agent partner','Two professionals meeting on the porch of a modest home','trusted partnership'],
 ['landing','pricing','A simple desk with a closed notebook and warm cup of coffee','clarity'],
 ['landing','FAQ','An adult listening thoughtfully to another professional at a cafe','reassurance'],
 ['landing','final CTA','An open door with warm light beyond a shaded porch','possibility'],
 ['landing','trial','A loan officer opening a laptop at a sunny desk with its screen away','a confident beginning'],
 ['paid_ad','warm leads','A phone softly lighting an adult hand against evening shadows','sudden possibility'],
 ['paid_ad','referrals','Two professionals greeting each other beside a sunlit doorway','recognition'],
 ['paid_ad','agent partners','A buyer standing in a warmly lit doorway with keys in hand','a meaningful step'],
 ['paid_ad','AI','A warmly lit home seen through a quiet front gate at dusk','welcome']
];
const SCENES = subjects.map(([use,pillar,subject,mood], i) => ({ id:`scene-${String(i+1).padStart(2,'0')}`, use,pillar, subject, mood, aspect_ratio:use==='social'?'1:1':'3:2', size:use==='social'?'1024x1024':'1536x1024', text_zone:i%2?'right':'left', forbidden:FORBIDDEN, prompt_template:'{format}. {subject}. {setting}. {emotion}. {camera}. {light}. {color}. {composition}.' }));
function estimate(format, quality='medium', count=3) { const square=FORMATS[format]?.native==='1024x1024'; return +(count * ({ low:square?.005:.006, medium:square?.011:.015, high:square?.036:.052 }[quality])).toFixed(3); }
module.exports = { SCENES, FORMATS, estimate };
