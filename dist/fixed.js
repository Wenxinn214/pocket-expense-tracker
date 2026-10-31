export const fixedCategory={id:'fixed_expenses',name:'Fixed Expenses',icon:'bills',custom:false,hidden:false};
export function withFixedCategory(state){return state.categories.some(c=>c.id===fixedCategory.id)?state:{...state,categories:[...state.categories,{...fixedCategory}]};}
export function fixedDate(month){if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw new Error('Choose a valid month.');return month+'-01';}

