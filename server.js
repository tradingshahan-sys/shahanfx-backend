const express=require('express');
const cors=require('cors');
const app=express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.post('/api/chat',async(req,res)=>{
try{
const{message}=req.body;
if(!message){return res.status(400).json({reply:'تکایە پەیامێک بنووسە.'});}
const apiKey=process.env.GEMINI_API_KEY;
if(!apiKey){return res.status(500).json({reply:'کڵیدی API نەدۆزراوەتەوە.'});}
const apiRes=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,{
method:'POST',
headers:{'Content-Type':'application/json'},
body:JSON.stringify({contents:[{parts:[{text:message}]}]})
});
const data=await apiRes.json();
let reply="وەڵامێک نەگەڕایەوە.";
if(data.candidates&&data.candidates[0]?.content?.parts?.[0]?.text){
reply=data.candidates[0].content.parts[0].text;
}
return res.status(200).json({reply});
}catch(error){
return res.status(500).json({reply:'هەڵەی سێرڤەر ڕووی دا.'});
}
});
module.exports=app;
