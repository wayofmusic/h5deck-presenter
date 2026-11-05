import fs from 'node:fs';
import path from 'node:path';
import {validateDeck} from '../core/state.mjs';
export function loadBuiltins(root) {
  const definitions=JSON.parse(fs.readFileSync(path.join(root,'decks/catalog.json'),'utf8'));
  const decks=[];
  for(const item of definitions) {
    if(item.optional&&!fs.existsSync(path.join(root,item.manifest))) continue;
    const manifest=JSON.parse(fs.readFileSync(path.join(root,item.manifest),'utf8'));
    const script=JSON.parse(fs.readFileSync(path.join(root,item.script),'utf8'));
    validateDeck(manifest,script);
    decks.push({key:item.id,kind:'builtin',manifest,script,display:path.join(root,item.display),files:item.files||{},assets:item.assets||{}});
  }
  return decks;
}
