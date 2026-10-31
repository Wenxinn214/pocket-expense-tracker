// Demo data lives only in this tab's memory and never reaches the cloud repository.
export const isDemo = typeof location !== 'undefined' && new URLSearchParams(location.search).get('demo') === '1';
export function createDemoRepository(categories) {
 let state;
 return {
  async load() {
   if(state)return structuredClone(state);
   const now=new Date(),month=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
   const samples=[['Coffee & a slow morning','Food & Drinks',14.5,'coffee'],['Botanical garden afternoon','Entertainment',25,'garden'],['Weekend market flowers','Shopping',38,'flowers'],['Train into the city','Transport',6.4],['Dinner with friends','Food & Drinks',48],['A book for the weekend','Shopping',32]];
   const expenses=await Promise.all(samples.map(async([remark,category,amount,scene],i)=>{
    const date=`${month}-${String(Math.max(1,now.getDate()-i*3)).padStart(2,'0')}`,stamp=date+'T09:00:00.000Z';
    const photos=[];
    if(scene){const canvas=document.createElement('canvas');canvas.width=960;canvas.height=720;const c=canvas.getContext('2d');c.fillStyle=['#ead8c2','#d4e2cc','#f4d7dc'][i];c.fillRect(0,0,960,720);c.font='180px serif';c.textAlign='center';c.fillText(['☕','🌿','🌷'][i],480,390);c.fillStyle='#405746';c.font='32px sans-serif';c.fillText(['A slow morning','An afternoon outside','Little market finds'][i],480,540);const blob=await new Promise(r=>canvas.toBlob(r,'image/jpeg',.9));photos.push({id:'demo_photo_'+i,name:scene+'.jpg',width:960,height:720,createdAt:stamp,caption:'Fictional demo keepsake',blob});}
    return {id:'demo_'+i,remark,category,amount,date,createdAt:stamp,updatedAt:stamp,photos,coverPhotoId:photos[0]?.id||''};
   }));
   const stamp=new Date().toISOString();state={version:2,revision:0,categories:structuredClone(categories),expenses,albums:[{id:'demo_album',name:'Little weekend joys',note:'A fictional collection to explore Pocket.',color:'mint',createdAt:stamp,updatedAt:stamp,expenseIds:['demo_0','demo_1','demo_2']}]};return structuredClone(state);
  },
  async save(next){state=structuredClone({...next,revision:next.revision+1});return structuredClone(state);}
 };
}

