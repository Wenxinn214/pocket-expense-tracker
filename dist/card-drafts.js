export function validateCardDrafts(input={}){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Invalid monthly card drafts.');
 const result={};for(const [month,d] of Object.entries(input)){if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)||!d||typeof d.title!=='string'||d.title.length>80||typeof d.note!=='string'||d.note.length>160||typeof d.hideAmounts!=='boolean'||!Array.isArray(d.photoIds)||d.photoIds.length>4||new Set(d.photoIds).size!==d.photoIds.length||d.photoIds.some(id=>typeof id!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(id)))throw new Error('Invalid monthly card draft.');result[month]={title:d.title,note:d.note,hideAmounts:d.hideAmounts,photoIds:[...d.photoIds]};}return result;
}

