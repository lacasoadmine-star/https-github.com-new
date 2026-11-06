// Overlap the existing clip's faded tail and head instead of replaying their silence.
// The middle of every channel is copied unchanged; no new sound is synthesized.
export function overlapLoop(channels,sampleRate,crossfadeSeconds=.035){
 const length=channels[0]?.length||0,overlap=Math.min(Math.floor(length/4),Math.round(sampleRate*crossfadeSeconds));
 if(overlap<2)return channels.map(channel=>Float32Array.from(channel));
 const outputLength=length-overlap;
 return channels.map(channel=>{
  const out=new Float32Array(outputLength);out.set(channel.subarray(overlap,length-overlap));
  for(let i=0;i<overlap;i++){const angle=i/(overlap-1)*Math.PI/2;out[length-2*overlap+i]=channel[length-overlap+i]*Math.cos(angle)+channel[i]*Math.sin(angle);}
  return out;
 });
}
export function seamlessBuffer(context,source){
 if(!source?.length||!source.numberOfChannels||!source.sampleRate||!source.getChannelData||!context.createBuffer)return source;
 const channels=Array.from({length:source.numberOfChannels},(_,i)=>source.getChannelData(i)),data=overlapLoop(channels,source.sampleRate),buffer=context.createBuffer(source.numberOfChannels,data[0].length,source.sampleRate);
 for(let i=0;i<data.length;i++)buffer.getChannelData(i).set(data[i]);return buffer;
}
