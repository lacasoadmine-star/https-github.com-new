// Keep the authoritative historical receipt intact. A settled prior model is
// history, not the current model's reel board. Active rounds still recover.
export function presentationViewState(state){
 const round=state?.round,game=state?.game;
 if(state?.authenticated!==true||state.connected!==true||round?.status!=='settled'||typeof game?.version!=='string')return state;
 const versions=[round.model_version,round.modelVersion].filter(value=>value!==undefined);
 const ids=[round.game_id,round.gameId].filter(value=>value!==undefined);
 if(versions.length&&versions.every(value=>typeof value==='string'&&value===versions[0])&&versions[0]!==game.version&&ids.length&&ids.every(id=>id===game.id))return {...state,round:null};
 return state;
}
