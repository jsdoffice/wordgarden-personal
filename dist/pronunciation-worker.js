import {loadEngine,analyzeAudio} from './pronunciation-core.js';
self.onmessage=async({data})=>{
  const {id,type}=data||{};
  try{
    if(type==='load'){await loadEngine();self.postMessage({id,ok:true,result:{ready:true,engine:'hama-js 1.7.0'}});}
    else if(type==='analyze'){const result=await analyzeAudio(data);self.postMessage({id,ok:true,result});}
    else throw Object.assign(new Error('지원하지 않는 분석 요청이에요.'),{code:'invalid_request'});
  }catch(error){self.postMessage({id,ok:false,error:{message:error.message||'분석하지 못했어요.',code:error.code||'model_error',quality:error.quality}});}
};
