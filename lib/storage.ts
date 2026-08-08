import type {AppDB} from "@/types";
export const STORAGE_KEY="mbp-expert-ai-v2";
export const emptyDB:AppDB={empresas:{},empresaAtualId:null,visitas:[],ncs:[]};
export function loadDB():AppDB{if(typeof window==="undefined")return emptyDB;try{const raw=localStorage.getItem(STORAGE_KEY);return raw?JSON.parse(raw):emptyDB}catch{return emptyDB}}
export function saveDB(db:AppDB){if(typeof window!=="undefined")localStorage.setItem(STORAGE_KEY,JSON.stringify(db))}