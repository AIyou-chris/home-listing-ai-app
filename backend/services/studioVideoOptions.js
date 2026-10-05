'use strict';
const DEFAULTS={narration:'none',voice:'nova',voiceSpeed:'1',music:'none',musicVolume:'low',captionSize:'normal',videoStyle:'blue',motion:'gentle',transition:'fade',endCard:'wow'};
const CHOICES={narration:['none','saved'],voice:['nova','alloy','onyx'],voiceSpeed:['0.9','1','1.1'],music:['none','calm','upbeat','upload'],musicVolume:['low','medium'],captionSize:['normal','large'],videoStyle:['blue','dark'],motion:['gentle','still'],transition:['fade','cut'],endCard:['wow','none']};
function videoOptions(raw={}) {
  const out={};
  for(const key of Object.keys(DEFAULTS)) {
    out[key]=raw[key]??DEFAULTS[key];
    if(!CHOICES[key].includes(out[key]))throw Error('Choose valid voice, music and caption settings.');
  }
  return out;
}
module.exports={videoOptions,DEFAULTS};
