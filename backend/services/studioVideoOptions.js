'use strict';
const { sceneNames } = require('./explainerVideo');
const DEFAULTS={narration:'none',voice:'nova',voiceSpeed:'1',music:'none',musicVolume:'low',captionSize:'normal',videoStyle:'blue',motion:'gentle',transition:'fade',endCard:'wow',layout:'cards',explainer:'',explainerVoice:'off'};
const CHOICES={narration:['none','saved'],voice:['nova','alloy','onyx'],voiceSpeed:['0.9','1','1.1'],music:['none','calm','upbeat','upload'],musicVolume:['low','medium'],captionSize:['normal','large'],videoStyle:['blue','dark'],motion:['gentle','still'],transition:['fade','cut'],endCard:['wow','none'],layout:['cards','picture','explainer'],explainer:['',...sceneNames()],explainerVoice:['off','on']};
function videoOptions(raw={}) {
  const out={};
  for(const key of Object.keys(DEFAULTS)) {
    out[key]=raw[key]??DEFAULTS[key];
    if(!CHOICES[key].includes(out[key]))throw Error('Choose valid voice, music and caption settings.');
  }
  if(out.layout==='explainer'&&!out.explainer)throw Error('Choose which animated explainer video to use.');
  return out;
}
module.exports={videoOptions,DEFAULTS};
