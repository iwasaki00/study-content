/* v0.5.1の追加ブラウザ監査だけを実行する入口。 */
const {chromium,webkit}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {runQualityTests}=require('./verify-quality-browser.cjs');
const server=http.createServer((req,res)=>{
  let name;try{name=decodeURIComponent(req.url.split('?')[0]);}catch{res.writeHead(400).end();return;}
  const file=path.resolve(__dirname,`.${name==='/'?'/index.html':name}`);
  if(!file.startsWith(__dirname+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(error,content)=>{if(error){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'})[path.extname(file)]||'application/octet-stream');res.end(content);});
});
server.listen(0,'127.0.0.1',async()=>{
  let failed=false;const url=`http://127.0.0.1:${server.address().port}/`;
  for(const [engine,name] of [[chromium,'chromium'],[webkit,'webkit']]){
    const browser=await engine.launch({headless:true});
    try{await runQualityTests(browser,url,name);}catch(error){failed=true;console.error(`${name}: FAIL`,error);}finally{await browser.close();}
  }
  server.close();process.exitCode=failed?1:0;
});
