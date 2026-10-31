import {currency,monthLabel} from './data.js';

export const CARD_WIDTH=1080, CARD_HEIGHT=1440;
function roundRect(ctx,x,y,width,height,radius,fill,stroke) {
 ctx.beginPath();ctx.roundRect(x,y,width,height,radius);ctx.fillStyle=fill;ctx.fill();
 if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}
}
function text(ctx,value,x,y,maxWidth,size=40,color='#70475f',weight=800,align='left') {
 ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='alphabetic';
 let fit=size;ctx.font=`${weight} ${fit}px Nunito, sans-serif`;
 while(ctx.measureText(value).width>maxWidth&&fit>18){fit-=1;ctx.font=`${weight} ${fit}px Nunito, sans-serif`;}
 ctx.fillText(value,x,y,maxWidth);
}
function wrap(ctx,value,maxWidth,maxLines=2) {
 const lines=[];let line='';
 for(const character of Array.from(value)) {
  if(ctx.measureText(line+character).width>maxWidth&&line){lines.push(line);line='';if(lines.length===maxLines)break;}
  line+=character;
 }
 if(lines.length<maxLines&&line)lines.push(line);
 if(lines.length===maxLines&&lines.join('').length<value.length){let last=lines.at(-1);while(ctx.measureText(last+'…').width>maxWidth)last=last.slice(0,-1);lines[lines.length-1]=last+'…';}
 return lines;
}
function drawCover(ctx,bitmap,x,y,width,height) {
 const scale=Math.max(width/bitmap.width,height/bitmap.height),sw=width/scale,sh=height/scale;
 ctx.drawImage(bitmap,(bitmap.width-sw)/2,(bitmap.height-sh)/2,sw,sh,x,y,width,height);
}
export async function renderRecapCard(recap,{hideAmounts=false}={}) {
 const canvas=document.createElement('canvas');canvas.width=CARD_WIDTH;canvas.height=CARD_HEIGHT;
 const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Your browser could not create the card.');
 await document.fonts?.ready;
 ctx.fillStyle='#fff8f2';ctx.fillRect(0,0,CARD_WIDTH,CARD_HEIGHT);
 ctx.fillStyle='#efdee5';for(let x=30;x<CARD_WIDTH;x+=34)for(let y=30;y<CARD_HEIGHT;y+=34){ctx.beginPath();ctx.arc(x,y,1.1,0,Math.PI*2);ctx.fill();}
 roundRect(ctx,48,40,984,1360,34,'#fffdfb','#ecd8e2');
 roundRect(ctx,410,24,260,48,5,'#f9e5ad');
 text(ctx,'pocket.',94,118,400,35,'#a24f75',900);
 text(ctx,monthLabel(recap.month),986,118,500,30,'#a7879b',700,'right');
 text(ctx,recap.title||'A month of little moments',540,195,900,53,'#75475f',900,'center');
 roundRect(ctx,88,230,904,210,26,'#fff0bf');
 text(ctx,hideAmounts?'A LITTLE PRIVACY, A LOT OF MEMORIES':'MY MONTHLY SPENDING',540,281,820,24,'#96734b',800,'center');
 text(ctx,hideAmounts?'Kept just for me':currency(recap.amount),540,369,820,hideAmounts?62:78,'#876044',900,'center');
 roundRect(ctx,88,463,438,116,20,'#f9e4ef');roundRect(ctx,548,463,444,116,20,'#eee5fa');
 text(ctx,String(recap.count)+' expense'+(recap.count===1?'':'s'),307,517,390,35,'#a46585',850,'center');
 text(ctx,'little entries in my diary',307,551,390,23,'#a78497',600,'center');
 text(ctx,recap.favourite?.category||'A fresh little page',770,517,390,32,'#9680ad',850,'center');
 text(ctx,'most often this month',770,551,390,23,'#a38caf',600,'center');
 if(recap.photos.length) {
  const positions=recap.photos.length===1?[[88,620,904,680]]:recap.photos.length===2?[[88,620,438,680],[554,620,438,680]]:[[88,620,438,324],[554,620,438,324],[88,976,438,324],[554,976,438,324]];
  for(const [index,entry] of recap.photos.entries()) {
   const [x,y,width,height]=positions[index],imageHeight=height===680?570:230;roundRect(ctx,x,y,width,height,9,'#ffffff','#ecdde4');
   let bitmap;try{bitmap=await createImageBitmap(entry.photo.blob);drawCover(ctx,bitmap,x+12,y+12,width-24,imageHeight);}finally{bitmap?.close();}
   ctx.font='800 25px Nunito, sans-serif';ctx.fillStyle='#8a5d76';ctx.textAlign='left';ctx.textBaseline='alphabetic';
   const caption=entry.photo.caption||entry.expense.remark||entry.expense.category;
   wrap(ctx,caption,width-48,2).forEach((line,n)=>ctx.fillText(line,x+23,y+imageHeight+45+n*29));
  }
 } else {
  roundRect(ctx,88,622,904,665,25,'#fbf0f5','#ecd9e3');
  text(ctx,'Everyday things, lovingly kept.',540,920,800,40,'#b5809c',800,'center');
  text(ctx,'No photo memories this month',540,978,790,29,'#ab8b9f',600,'center');
 }
 text(ctx,recap.note||'A little diary. A month to remember.',540,1372,900,25,'#ae8b9e',700,'center');
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('The card could not be downloaded. Please try again.')),'image/png'));
}


