import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {packContentDirectory} from '../server/content-library.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
export async function buildContentExamples() {
  const directory=path.join(root,'dist/content-packs');fs.mkdirSync(directory,{recursive:true});
  for(const name of ['basic','interactive']) {
    const output=path.join(directory,name+'.h5deck');
    if(fs.existsSync(output)) fs.unlinkSync(output);
    await packContentDirectory(path.join(root,'content-templates',name),output);
  }
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){await buildContentExamples();console.log('两套标准内容包已生成。');}
