'use strict';
const fs = require('fs');
const path = require('path');
const root = process.argv[2];
if (!root) throw new Error('Missing extracted app directory');
const ipcPath = path.join(root, 'dist', 'ipcHandlers.js');
const preloadPath = path.join(root, 'dist', 'preload.js');

function inject(file, anchor, addition, marker) {
  let source = fs.readFileSync(file, 'utf8');
  if (source.includes(marker)) return;
  if (!source.includes(anchor)) throw new Error(`Unsupported app structure: ${path.basename(file)}`);
  source = source.replace(anchor, anchor + addition);
  fs.writeFileSync(file, source, 'utf8');
}

inject(ipcPath,
  'const fs = __importStar(require("fs/promises"));',
  '\nconst agFileImportPath = __importStar(require("path"));\nconst agFileImportOs = __importStar(require("os"));',
  'agFileImportPath');

inject(ipcPath,
  'function registerIpcHandlers(storageManager) {',
  `
    // AG_LOCAL_DOCUMENT_IMPORT
    electron_1.ipcMain.handle('dialog:import-agent-documents', async () => {
        const result = await electron_1.dialog.showOpenDialog({
            properties: ['openFile', 'multiSelections'],
            title: '选择要导入 Agent 的文件',
            filters: [
                { name: 'Office 与文档', extensions: ['doc','docx','xls','xlsx','csv','pdf','txt','md','rtf','ppt','pptx'] },
                { name: '所有文件', extensions: ['*'] }
            ]
        });
        if (result.canceled || !result.filePaths.length) return [];
        const dir = agFileImportPath.join(agFileImportOs.homedir(), '.gemini', 'antigravity', 'file-inbox');
        await fs.mkdir(dir, { recursive: true });
        const imported = [];
        for (const source of result.filePaths) {
            const parsed = agFileImportPath.parse(source);
            const safe = parsed.name.replace(/[<>:"/\\\\|?*\\x00-\\x1F]/g, '_').slice(0, 120) || 'document';
            const destination = agFileImportPath.join(dir, Date.now() + '-' + safe + parsed.ext);
            await fs.copyFile(source, destination);
            imported.push(destination);
        }
        return imported;
    });
`, 'AG_LOCAL_DOCUMENT_IMPORT');

inject(preloadPath,
  "electron_1.contextBridge.exposeInMainWorld('ide', ideAPI);",
  `

// AG_LOCAL_DOCUMENT_IMPORT_UI
(function () {
  const id = 'ag-local-document-import';
  const composer = () => Array.from(document.querySelectorAll('textarea,[contenteditable="true"]')).reverse().find(e => {
    const r = e.getBoundingClientRect(); return r.width > 180 && r.height > 20 && r.bottom > innerHeight * .45;
  });
  const put = (e, text) => {
    e.focus();
    if (e instanceof HTMLTextAreaElement || e instanceof HTMLInputElement) {
      const p = e instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(p, 'value').set.call(e, (e.value ? e.value + '\\n' : '') + text);
      e.dispatchEvent(new InputEvent('input', { bubbles:true, inputType:'insertText', data:text }));
    } else {
      const s = getSelection(); s.selectAllChildren(e); s.collapseToEnd();
      document.execCommand('insertText', false, (e.textContent.trim() ? '\\n' : '') + text);
      e.dispatchEvent(new InputEvent('input', { bubbles:true, inputType:'insertText', data:text }));
    }
  };
  const add = () => {
    if (!document.body || document.getElementById(id)) return;
    const b = document.createElement('button'); b.id=id; b.type='button'; b.textContent='导入 Word / Excel';
    Object.assign(b.style,{position:'fixed',right:'22px',bottom:'86px',zIndex:'2147483646',border:'1px solid rgba(128,128,128,.45)',borderRadius:'9px',padding:'7px 11px',background:'#1f6feb',color:'#fff',fontSize:'12px',fontWeight:'600',cursor:'pointer',boxShadow:'0 3px 12px rgba(0,0,0,.25)'});
    b.onclick=async()=>{ const old=b.textContent; b.disabled=true; b.textContent='正在导入…'; try { const paths=await electron_1.ipcRenderer.invoke('dialog:import-agent-documents'); if(!paths.length)return; const e=composer(); const text=(paths.length===1?'请读取并处理这个本地文件：\\n':'请读取并处理以下本地文件：\\n')+paths.join('\\n'); if(e)put(e,text); b.textContent=e?'已导入':'已导入，请重试'; } catch(x) { console.error(x); b.textContent='导入失败'; } finally { b.disabled=false; setTimeout(()=>b.textContent=old,2200); }};
    document.body.appendChild(b);
  };
  addEventListener('DOMContentLoaded',()=>{add();new MutationObserver(add).observe(document.documentElement,{childList:true,subtree:true});});
})();
`, 'AG_LOCAL_DOCUMENT_IMPORT_UI');

console.log('Patch applied successfully.');

