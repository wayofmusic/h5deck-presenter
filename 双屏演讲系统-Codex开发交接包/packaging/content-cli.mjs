import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateContentDirectory,packContentDirectory} from '../server/content-library.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const [command,directory,argument]=process.argv.slice(2);
try {
  if(!directory||!['init','validate','pack'].includes(command)) throw Error('用法：content-cli.mjs init 目录 [basic|interactive]；validate 目录；pack 目录 输出.h5deck');
  if(command==='init') {
    const template=argument||'basic';if(!['basic','interactive'].includes(template))throw Error('模板应为 basic 或 interactive');
    if(fs.existsSync(directory))throw Error('目标目录已存在，不覆盖已有内容');
    fs.cpSync(path.join(root,'content-templates',template),path.resolve(directory),{recursive:true});
    console.log(`已建立 ${template} 内容。请修改 manifest.json、private/notes.json 和 presentation 文件，再校验打包。`);
  } else if(command==='validate') {const result=validateContentDirectory(path.resolve(directory));console.log(`校验通过：${result.manifest.title}，${result.manifest.slides.length} 页，${result.files} 个文件。`);}
  else {if(!argument)throw Error('请指定输出 .h5deck 路径');await packContentDirectory(path.resolve(directory),path.resolve(argument));console.log(`已生成：${path.resolve(argument)}`);}
} catch(error){console.error(error.message);process.exitCode=1;}
