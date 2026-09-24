(function(){
"use strict";
var STORAGE="exam_v3";
var state=JSON.parse(localStorage.getItem(STORAGE)||"null")||{
 user:null,attempts:[],
 exams:[
  {id:"ENG-001",title:"Production Basics",category:"Engineering",duration:30,pass:60,description:"Production engineering fundamentals and KPI concepts.",questions:[
   {text:"What does MTBF measure?",options:["Repair duration","Average time between failures","Production quantity","Inspection time"],answer:1,topic:"Maintenance"},
   {text:"What does MTTR primarily measure?",options:["Mean time to repair","Mean time to failure","Yield","Cycle time"],answer:0,topic:"Maintenance"},
   {text:"Which chart monitors count of defects per unit?",options:["X-bar R","C chart","Histogram","Pareto"],answer:1,topic:"Quality"},
   {text:"What is a bottleneck?",options:["Fastest process","Process limiting system output","Inspection station","Storage area"],answer:1,topic:"Production"},
   {text:"COPQ means:",options:["Cost of Production Quality","Cost of Poor Quality","Control of Process Quality","Cost per Output Quantity"],answer:1,topic:"Quality"},
   {text:"What does OEE combine?",options:["Availability, Performance, Quality","Cost, Labor, Scrap","Safety, Cost, Delivery","MTBF, MTTR, COPQ"],answer:0,topic:"KPI"}
  ]},
  {id:"QC-001",title:"Quality Control",category:"Quality",duration:20,pass:60,description:"Quality tools, variation, inspection and process control.",questions:[
   {text:"What is the primary purpose of a control chart?",options:["Track process stability","Calculate profit","Schedule shifts","Count operators"],answer:0,topic:"SPC"},
   {text:"Which tool ranks causes from largest to smallest?",options:["Scatter plot","Pareto chart","Histogram","Flowchart"],answer:1,topic:"7 Tools"},
   {text:"A histogram shows:",options:["Process sequence","Frequency distribution","Root cause hierarchy","Project schedule"],answer:1,topic:"7 Tools"},
   {text:"Special-cause variation is:",options:["Expected random noise","Assignable process variation","Always acceptable","A customer complaint"],answer:1,topic:"SPC"}
  ]},
  {id:"MT-001",title:"Maintenance Fundamentals",category:"Maintenance",duration:40,pass:60,description:"Reliability, preventive maintenance and equipment performance.",questions:[
   {text:"What is preventive maintenance designed to do?",options:["Wait for failure","Reduce likelihood of failure","Increase defects","Remove inspections"],answer:1,topic:"PM"},
   {text:"MTBF is generally associated with:",options:["Repair speed","Reliability","Quality cost","Inventory"],answer:1,topic:"Reliability"},
   {text:"MTTR is generally associated with:",options:["Maintainability","Demand","Yield","Takt"],answer:0,topic:"Reliability"}
  ]},
  {id:"SAFE-001",title:"Safety Procedures",category:"Safety",duration:15,pass:70,description:"Factory safety procedures and emergency response.",questions:[
   {text:"What should you do first after a chemical splash in the eye?",options:["Rub the eye","Flush immediately with clean water","Wait for a supervisor","Close the eye"],answer:1,topic:"Emergency"},
   {text:"PPE stands for:",options:["Personal Protective Equipment","Production Process Evaluation","Plant Protection Engineering","Personal Process Entry"],answer:0,topic:"PPE"},
   {text:"Emergency exits should be:",options:["Locked","Obstructed","Clearly accessible","Used for storage"],answer:2,topic:"Emergency"}
  ]}
 ]};
var app=document.getElementById("app"),timer=null,current=null,attempt=null;
function save(){localStorage.setItem(STORAGE,JSON.stringify(state))}
function esc(v){return String(v==null?"":v).split("&").join("&amp;").split("<").join("&lt;").split(">").join("&gt;").split('"').join("&quot;")}
function fmt(s){s=Math.max(0,s);return Math.floor(s/60)+":"+String(s%60).padStart(2,"0")}
function top(name){return `<header class="topbar"><div class="brand">EXAM<span>.</span></div><div class="top-user">● ${esc(name||"Assessment Platform")}</div></header>`}
function page(title,sub,body){return `<main class="container"><div class="page-head"><div><div class="eyebrow">EXAM PLATFORM</div><h1>${title}</h1><p class="muted">${sub||""}</p></div></div>${body}</main>`}
function stop(){if(timer){clearInterval(timer);timer=null}}
function landingLegacy(){
 stop(); app.innerHTML=`<div class="landing"><div class="login-visual"><div class="visual-badge">SMART ASSESSMENT</div><h2>Evaluate knowledge.<br><span>Measure performance.</span></h2><p>One platform for exams, question banks, student results and analytics.</p></div><div class="login-panel card"><div class="brand">EXAM<span>.</span></div><h1>Student Assessment</h1><p class="muted">Enter your name to start.</p><label class="field"><span>Student name</span><input id="studentName" placeholder="e.g. Ahmed Mohamed"></label><button class="btn primary full" id="continue">Continue</button><button class="text-btn" id="admin">Admin login →</button><p class="login-note">Demo data is stored in this browser.</p></div></div>`;
 document.getElementById("continue").onclick=function(){var n=document.getElementById("studentName").value.trim();if(!n)return alert("Enter your name.");state.user={name:n,role:"student"};save();studentHome()};
 document.getElementById("admin").onclick=adminLogin;
}
function studentNav(){return `<div class="student-nav"><button class="nav-pill active" id="navExams">Available Exams</button><button class="nav-pill" id="navHistory">My History</button><button class="nav-pill" id="navProfile">Profile</button><button class="nav-pill admin-mini" id="navAdmin">Admin</button></div>`}
function bindStudent(){document.getElementById("navExams").onclick=studentHome;document.getElementById("navHistory").onclick=historyPage;document.getElementById("navProfile").onclick=profilePage;document.getElementById("navAdmin").onclick=adminLogin}
function studentHome(){
 stop();var cards=state.exams.map(function(e){return `<article class="exam-card card"><div class="exam-icon">${e.category==="Safety"?"⚠":e.category==="Quality"?"✓":e.category==="Maintenance"?"⚙":"◉"}</div><div class="exam-card-main"><span class="category">${esc(e.category)}</span><h3>${esc(e.title)}</h3><p>${esc(e.description)}</p><div class="exam-meta"><span>${e.questions.length} Questions</span><span>•</span><span>${e.duration} Minutes</span><span>•</span><span>Pass ${e.pass}%</span></div></div><button class="btn primary" data-start="${e.id}">Start</button></article>`}).join("");
 app.innerHTML=top(state.user.name)+studentNav()+page("Choose an assessment","Select an exam and complete it before the timer expires.",`<div class="exam-list">${cards}</div>`);
 bindStudent();document.querySelectorAll("[data-start]").forEach(function(b){b.onclick=function(){instructions(b.dataset.start)}})
}
function instructions(id){current=state.exams.find(function(e){return e.id===id});app.innerHTML=top(state.user.name)+page("Exam Instructions","Review the rules before starting.",`<div class="instruction-card card"><div class="instruction-hero"><div class="big-doc">▤</div><h2>${esc(current.title)}</h2><p>${current.questions.length} Questions • ${current.duration} Minutes</p></div><div class="instruction-grid"><div>◉ <b>Multiple choice</b><small>Choose one answer.</small></div><div>◷ <b>Timer</b><small>The timer cannot be paused.</small></div><div>↔ <b>Navigate freely</b><small>Review before submitting.</small></div><div>✓ <b>Automatic scoring</b><small>Your result is calculated instantly.</small></div></div><div class="center"><button class="btn primary big-btn" id="begin">Start Exam</button><button class="btn ghost" id="back">Back to Exams</button></div></div>`);document.getElementById("begin").onclick=function(){startExam(current.id)};document.getElementById("back").onclick=studentHome}
function startExam(id){current=state.exams.find(function(e){return e.id===id});attempt={answers:Array(current.questions.length).fill(null),index:0,left:current.duration*60,started:Date.now()};renderQuestion()}
function renderQuestion(){
 stop();var q=current.questions[attempt.index],answered=attempt.answers.filter(function(x){return x!==null}).length;
 app.innerHTML=top(state.user.name)+page(current.title,"Question "+(attempt.index+1)+" of "+current.questions.length,`<div class="exam-grid"><section class="question-panel card"><div class="q-top"><span>Question ${attempt.index+1} of ${current.questions.length}</span><span>${esc(q.topic)}</span></div>${q.image?'<div class="exam-question-image"><img src="'+q.image+'" alt="Question"></div>':""}${q.text?'<h2>'+esc(q.text)+'</h2>':""}<div class="options">${q.options.map(function(o,i){return `<button class="answer ${attempt.answers[attempt.index]===i?"selected":""}" data-answer="${i}"><span class="letter">${String.fromCharCode(65+i)}</span><span>${esc(o)}</span></button>`}).join("")}</div><div class="exam-actions"><button class="btn ghost" id="prev" ${attempt.index===0?"disabled":""}>Previous</button><button class="btn primary" id="next">${attempt.index===current.questions.length-1?"Finish Exam":"Next"}</button></div></section><aside class="question-nav card"><h3>Question Navigation</h3><div class="q-grid">${current.questions.map(function(_,i){return `<button class="${attempt.answers[i]!==null?"answered ":""}${i===attempt.index?"current":""}" data-q="${i}">${i+1}</button>`}).join("")}</div><div class="legend"><span>● Answered</span><span>● Current</span><span>● Not answered</span></div><div class="timer"><span>◷</span> <b id="clock">${fmt(attempt.left)}</b></div><button class="btn primary full" id="finish">Finish Exam</button></aside></div>`);
 document.querySelectorAll("[data-answer]").forEach(function(b){b.onclick=function(){attempt.answers[attempt.index]=Number(b.dataset.answer);renderQuestion()}});
 document.querySelectorAll("[data-q]").forEach(function(b){b.onclick=function(){attempt.index=Number(b.dataset.q);renderQuestion()}});
 document.getElementById("prev").onclick=function(){if(attempt.index>0){attempt.index--;renderQuestion()}};
 document.getElementById("next").onclick=function(){if(attempt.index===current.questions.length-1)confirmSubmit();else{attempt.index++;renderQuestion()}};
 document.getElementById("finish").onclick=confirmSubmit;
 timer=setInterval(function(){attempt.left--;var c=document.getElementById("clock");if(c)c.textContent=fmt(attempt.left);if(attempt.left<=0){stop();submitExam()}},1000)
}
function confirmSubmit(){if(confirm("Submit this exam now? Unanswered questions will be incorrect."))submitExam()}
function submitExam(){stop();var score=0;current.questions.forEach(function(q,i){if(attempt.answers[i]===q.answer)score++});var pct=Math.round(score/current.questions.length*100);var a={id:Date.now(),examId:current.id,exam:current.title,student:state.user.name,score:score,total:current.questions.length,pct:pct,passed:pct>=current.pass,date:new Date().toISOString(),timeTaken:Math.round((Date.now()-attempt.started)/1000),answers:attempt.answers.slice()};state.attempts.push(a);save();resultPage(a)}
function resultPage(a){app.innerHTML=top(state.user.name)+page(a.passed?"Congratulations!":"Good Try!",a.passed?"You Passed":"You Did Not Pass",`<div class="result-card card ${a.passed?"result-pass":"result-fail"}"><div class="result-icon">${a.passed?"✓":"×"}</div><h2>${a.passed?"You Passed":"You Did Not Pass"}</h2><div class="result-score">${a.pct}%</div><div class="result-stats"><div><span>Your Score</span><b>${a.score} / ${a.total}</b></div><div><span>Passing Score</span><b>${current.pass}%</b></div></div><div class="result-meta"><span>Exam <b>${esc(a.exam)}</b></span><span>Time Taken <b>${fmt(a.timeTaken)}</b></span><span>Date <b>${new Date(a.date).toLocaleDateString()}</b></span></div><div class="center"><button class="btn ghost" id="review">View Answers</button><button class="btn primary" id="home">Back to Exams</button></div></div>`);document.getElementById("review").onclick=function(){reviewPage(a)};document.getElementById("home").onclick=studentHome}
function reviewPage(a){var e=state.exams.find(function(x){return x.id===a.examId});var rows=e.questions.map(function(q,i){var ok=a.answers[i]===q.answer;return `<div class="review-row"><div class="review-status ${ok?"ok":"bad"}">${ok?"✓":"×"}</div><div><b>Question ${i+1}</b><p>${esc(q.text)}</p><small>Your answer: ${a.answers[i]===null?"Not answered":esc(q.options[a.answers[i]])}</small></div><span class="badge ${ok?"pass":"fail"}">${ok?"Correct":"Incorrect"}</span></div>`}).join("");app.innerHTML=top(state.user.name)+page("Answers Review","Review your answers.",`<div class="card review-list">${rows}</div><div class="center"><button class="btn primary" id="reviewBack">Back to Results</button></div>`);document.getElementById("reviewBack").onclick=function(){resultPage(a)}}
function historyPage(){var mine=state.attempts.filter(function(a){return a.student===state.user.name}).slice().reverse();var rows=mine.map(function(a){return `<tr><td>${new Date(a.date).toLocaleDateString()}</td><td>${esc(a.exam)}</td><td><b>${a.pct}%</b></td><td><span class="badge ${a.passed?"pass":"fail"}">${a.passed?"Pass":"Fail"}</span></td><td>${fmt(a.timeTaken||0)}</td></tr>`}).join("");app.innerHTML=top(state.user.name)+studentNav()+page("My Exam History","Your completed assessments.",`<div class="table-wrap card"><table class="table"><thead><tr><th>Date</th><th>Exam</th><th>Score</th><th>Result</th><th>Time</th></tr></thead><tbody>${rows||"<tr><td colspan='5' class='muted'>No exams yet.</td></tr>"}</tbody></table></div>`);bindStudent()}
function profilePage(){var mine=state.attempts.filter(function(a){return a.student===state.user.name});var avg=mine.length?Math.round(mine.reduce(function(s,a){return s+a.pct},0)/mine.length):0;app.innerHTML=top(state.user.name)+studentNav()+page("My Profile","Student account information.",`<div class="profile-card card"><div class="avatar">${esc(state.user.name.charAt(0).toUpperCase())}</div><h2>${esc(state.user.name)}</h2><p class="muted">Student</p><div class="profile-stats"><div><b>${mine.length}</b><span>Attempts</span></div><div><b>${avg}%</b><span>Average</span></div></div></div>`);bindStudent()}
function adminLoginLegacy(){stop();app.innerHTML=`<div class="admin-login"><div class="admin-login-card card"><div class="brand">EXAM<span>.</span></div><div class="admin-mark">⚙</div><h1>Admin Panel</h1><p class="muted">Demo administrator access.</p><label class="field"><span>Email</span><input id="ae" value="admin@exam.com"></label><label class="field"><span>Password</span><input id="ap" type="password" value="admin"></label><button class="btn primary full" id="sign">Sign In</button><button class="text-btn" id="student">← Student view</button></div></div>`;document.getElementById("sign").onclick=function(){state.user={name:"Admin",role:"admin"};save();dashboard()};document.getElementById("student").onclick=landing}
function side(active){var items=[["dashboard","▣","Dashboard"],["exams","▤","Exams"],["questions","☷","Questions"],["students","♙","Students"],["results","◔","Results"],["settings","⚙","Settings"]];return `<aside class="sidebar"><div class="side-brand">EXAM<span>.</span></div>${items.map(function(i){return `<button class="side-link ${active===i[0]?"active":""}" data-route="${i[0]}">${i[1]} ${i[2]}</button>`}).join("")}<button class="side-link logout" id="studentView">↩ Student view</button></aside>`}
function adminShell(active,body){return `<div class="admin-layout">${side(active)}<section class="admin-main">${top("Admin")}${body}</section></div>`}
function bindAdmin(){document.querySelectorAll("[data-route]").forEach(function(b){b.onclick=function(){route(b.dataset.route)}});document.getElementById("studentView").onclick=landing}
function route(r){if(r==="dashboard")dashboard();else if(r==="exams")examsPage();else if(r==="questions")questionsPage();else if(r==="students")studentsPage();else if(r==="results")resultsPage();else settingsPage()}
function dashboard(){var n=state.attempts.length,avg=n?Math.round(state.attempts.reduce(function(s,a){return s+a.pct},0)/n):0,pass=n?Math.round(state.attempts.filter(function(a){return a.passed}).length/n*100):0;app.innerHTML=adminShell("dashboard",page("Dashboard","Overview of exams, attempts and student performance.",`<div class="kpi-grid"><div class="kpi card"><span>👥 Total Students</span><b>${new Set(state.attempts.map(function(a){return a.student})).size}</b><em>Live</em></div><div class="kpi card"><span>▤ Total Exams</span><b>${state.exams.length}</b><em>Active</em></div><div class="kpi card"><span>♧ Total Attempts</span><b>${n}</b><em>Live</em></div><div class="kpi card"><span>◉ Average Score</span><b>${avg}%</b><em>Overall</em></div></div><div class="analytics-grid"><div class="card chart-card"><h3>Performance Overview</h3><div class="big-chart"><div style="height:35%"></div><div style="height:55%"></div><div style="height:45%"></div><div style="height:70%"></div><div style="height:62%"></div><div style="height:82%"></div><div style="height:76%"></div><div style="height:92%"></div></div></div><div class="card donut-card"><h3>Results Overview</h3><div class="donut" style="--p:${pass}"><span>${pass}%<small>Pass Rate</small></span></div></div></div><div class="card table-card"><h3>Recent Attempts</h3><div class="table-wrap"><table class="table"><thead><tr><th>Student</th><th>Exam</th><th>Score</th><th>Status</th></tr></thead><tbody>${state.attempts.slice().reverse().slice(0,6).map(function(a){return `<tr><td>${esc(a.student)}</td><td>${esc(a.exam)}</td><td>${a.pct}%</td><td><span class="badge ${a.passed?"pass":"fail"}">${a.passed?"PASS":"FAIL"}</span></td></tr>`}).join("")||"<tr><td colspan='4' class='muted'>No attempts yet.</td></tr>"}</tbody></table></div></div>`));bindAdmin()}
function examEditor(id){
 var e=id?state.exams.find(function(x){return x.id===id}):{id:"EX-"+Date.now(),title:"",category:"Engineering",duration:30,pass:60,description:"",questions:[]};
 app.innerHTML=adminShell("exams",page(id?"Edit Exam":"Create New Exam","Configure assessment settings.",`<div class="form-card card"><div class="form-grid"><label class="field"><span>Exam Title</span><input id="et" value="${esc(e.title)}" placeholder="e.g. Production Basics"></label><label class="field"><span>Category</span><input id="ec" value="${esc(e.category)}"></label><label class="field wide-field"><span>Description</span><textarea id="ed" rows="3">${esc(e.description)}</textarea></label><label class="field"><span>Duration (minutes)</span><input id="emin" type="number" value="${e.duration}"></label><label class="field"><span>Passing Score (%)</span><input id="epass" type="number" value="${e.pass}"></label></div><div class="center"><button class="btn ghost" id="cancelE">Cancel</button><button class="btn primary" id="saveE">${id?"Save Changes":"Create Exam"}</button></div></div>`));
 bindAdmin();
 document.getElementById("cancelE").onclick=examsPage;
 document.getElementById("saveE").onclick=function(){
  var title=document.getElementById("et").value.trim();if(!title)return alert("Enter an exam title.");
  e.title=title;e.category=document.getElementById("ec").value.trim()||"General";e.description=document.getElementById("ed").value.trim();e.duration=Math.max(1,Number(document.getElementById("emin").value)||30);e.pass=Math.min(100,Math.max(0,Number(document.getElementById("epass").value)||60));
  if(!id)state.exams.push(e);save();examsPage();
 };
}
function examsPage(){var rows=state.exams.map(function(e){return `<tr><td><b>${esc(e.title)}</b><small>${esc(e.category)}</small></td><td>${e.questions.length}</td><td>${e.duration} min</td><td>${e.pass}%</td><td><button class="mini-btn" data-edit="${e.id}">Edit</button><button class="mini-btn danger-mini" data-del="${e.id}">Delete</button></td></tr>`}).join("");app.innerHTML=adminShell("exams",page("Manage Exams","Create and organize assessments.",`<div class="card table-card"><div class="row"><h3>All Exams</h3><button class="btn primary" id="newExam">+ Create Exam</button></div><div class="table-wrap"><table class="table"><thead><tr><th>Exam</th><th>Questions</th><th>Duration</th><th>Pass</th><th>Actions</th></tr></thead><tbody>${rows||"<tr><td colspan='5' class='muted'>No exams yet.</td></tr>"}</tbody></table></div></div>`));bindAdmin();document.getElementById("newExam").onclick=function(){examEditor()};document.querySelectorAll("[data-edit]").forEach(function(b){b.onclick=function(){examEditor(b.dataset.edit)}});document.querySelectorAll("[data-del]").forEach(function(b){b.onclick=function(){if(confirm("Delete this exam?")){state.exams=state.exams.filter(function(e){return e.id!==b.dataset.del});save();examsPage()}}})}
function questionEditor(examId){
 var e=state.exams.find(function(x){return x.id===examId});if(!e)return examsPage();
 var options=state.exams.map(function(x){return '<option value="'+x.id+'" '+(x.id===examId?'selected':'')+'>'+esc(x.title)+'</option>';}).join('');
 app.innerHTML=adminShell('questions',page('Add Question','Questions can be text, image-based, or both.','<div class="form-card card"><label class="field"><span>Exam</span><select id="qexam">'+options+'</select></label><div class="upload-question"><label class="field"><span>Question Image (optional)</span><input id="qimage" type="file" accept="image/*"><small>Upload JPG, PNG or WebP. The image can contain the complete question.</small></label><div id="qpreview" class="question-upload-preview"><span>No image selected</span></div></div><label class="field"><span>Question Text (optional)</span><textarea id="qt" rows="3" placeholder="Enter question text, or leave empty if the image contains the question."></textarea></label><div class="form-grid"><label class="field"><span>Option A</span><input id="qa"></label><label class="field"><span>Option B</span><input id="qb"></label><label class="field"><span>Option C</span><input id="qc"></label><label class="field"><span>Option D</span><input id="qd"></label><label class="field"><span>Correct Option</span><select id="qans"><option value="0">A</option><option value="1">B</option><option value="2">C</option><option value="3">D</option></select></label><label class="field"><span>Topic</span><input id="qtopic" value="General"></label></div><div class="center"><button class="btn ghost" id="cancelQ">Cancel</button><button class="btn primary" id="saveQ">Add Question</button></div></div>'));
 bindAdmin();
 document.getElementById('cancelQ').onclick=questionsPage;
 document.getElementById('qexam').onchange=function(){examId=this.value};
 document.getElementById('qimage').onchange=function(){var file=this.files&&this.files[0];if(!file)return;if(file.size>4*1024*1024)return alert('Image must be 4 MB or smaller.');var r=new FileReader();r.onload=function(){document.getElementById('qpreview').innerHTML='<img src="'+r.result+'" alt="Question preview">';document.getElementById('qpreview').dataset.image=r.result};r.readAsDataURL(file)};
 document.getElementById('saveQ').onclick=function(){var target=state.exams.find(function(x){return x.id===examId});var opts=[document.getElementById('qa').value,document.getElementById('qb').value,document.getElementById('qc').value,document.getElementById('qd').value];var textq=document.getElementById('qt').value.trim();var img=document.getElementById('qpreview').dataset.image||'';if(!target||(!textq&&!img)||opts.some(function(x){return !x.trim()}))return alert('Add a question image or text, and complete all four options.');target.questions.push({text:textq,image:img,options:opts,answer:Number(document.getElementById('qans').value),topic:document.getElementById('qtopic').value.trim()||'General'});save();questionsPage()};
}
function questionsPage(){var rows=[];state.exams.forEach(function(e){e.questions.forEach(function(q,i){rows.push(`<tr><td>${q.image?'<span class="image-chip">🖼 Image</span> ':""}<b>${esc(q.text||"Image-based question")}</b><small>${esc(q.topic)}</small></td><td>${esc(e.title)}</td><td><button class="mini-btn" data-add="${e.id}">Add Question</button></td></tr>`)})});app.innerHTML=adminShell("questions",page("Question Bank","Central library of questions across all exams.",`<div class="card table-card"><div class="row"><h3>Questions</h3><button class="btn primary" id="addQuestion">+ Add Question</button></div><div class="table-wrap"><table class="table"><thead><tr><th>Question</th><th>Exam</th><th>Action</th></tr></thead><tbody>${rows.join("")||"<tr><td colspan='3' class='muted'>No questions yet.</td></tr>"}</tbody></table></div></div>`));bindAdmin();document.getElementById("addQuestion").onclick=function(){questionEditor(state.exams[0]&&state.exams[0].id)};document.querySelectorAll("[data-add]").forEach(function(b){b.onclick=function(){questionEditor(b.dataset.add)}})}
function studentsPage(){var names={};state.attempts.forEach(function(a){names[a.student]=(names[a.student]||[]).concat(a)});var rows=Object.keys(names).map(function(n){var a=names[n],avg=Math.round(a.reduce(function(s,x){return s+x.pct},0)/a.length);return `<tr><td><b>${esc(n)}</b></td><td>${a.length}</td><td>${avg}%</td><td>Student</td></tr>`}).join("");app.innerHTML=adminShell("students",page("Students","Monitor student participation and performance.",`<div class="card table-card"><h3>Students</h3><div class="table-wrap"><table class="table"><thead><tr><th>Name</th><th>Attempts</th><th>Average</th><th>Role</th></tr></thead><tbody>${rows||"<tr><td colspan='4' class='muted'>No students yet.</td></tr>"}</tbody></table></div></div>`));bindAdmin()}
function resultsPage(){var n=state.attempts.length,pass=n?Math.round(state.attempts.filter(function(a){return a.passed}).length/n*100):0,avg=n?Math.round(state.attempts.reduce(function(s,a){return s+a.pct},0)/n):0;app.innerHTML=adminShell("results",page("Results Analytics","Performance trends across all assessments.",`<div class="kpi-grid"><div class="kpi card"><span>Total Attempts</span><b>${n}</b></div><div class="kpi card"><span>Pass Rate</span><b>${pass}%</b></div><div class="kpi card"><span>Average Score</span><b>${avg}%</b></div></div><div class="card table-card"><h3>All Results</h3><div class="table-wrap"><table class="table"><thead><tr><th>Student</th><th>Exam</th><th>Score</th><th>Status</th></tr></thead><tbody>${state.attempts.slice().reverse().map(function(a){return `<tr><td>${esc(a.student)}</td><td>${esc(a.exam)}</td><td>${a.pct}%</td><td><span class="badge ${a.passed?"pass":"fail"}">${a.passed?"PASS":"FAIL"}</span></td></tr>`}).join("")}</tbody></table></div></div>`));bindAdmin()}
function settingsPage(){app.innerHTML=adminShell("settings",page("Settings","Application preferences and access controls.",`<div class="settings-grid"><div class="card"><h3>General</h3><label class="field"><span>Platform Name</span><input value="EXAM." disabled></label><label class="field"><span>Default Passing Score</span><input value="60%" disabled></label></div><div class="card"><h3>Data</h3><p class="muted">Demo data is stored locally in this browser.</p><button class="btn danger" id="reset">Reset Demo Data</button></div></div>`));bindAdmin();document.getElementById("reset").onclick=function(){state.attempts=[];save();settingsPage()}}
var supabaseClient = null;
try {
  if (window.supabase && window.EXAM_SUPABASE_CONFIG && window.EXAM_SUPABASE_CONFIG.url && window.EXAM_SUPABASE_CONFIG.anonKey) {
    supabaseClient = window.supabase.createClient(
      window.EXAM_SUPABASE_CONFIG.url,
      window.EXAM_SUPABASE_CONFIG.anonKey,
      { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
    );
  }
} catch (e) {
  console.warn("Supabase initialization failed; demo mode remains available.", e);
}

async function cloudProfile(user){
  if(!supabaseClient || !user) return null;
  var r=await supabaseClient.from("profiles").select("id,full_name,role").eq("id",user.id).maybeSingle();
  return r.data||null;
}

async function cloudLoadExams(){
  if(!supabaseClient) return false;
  var r=await supabaseClient.from("exams").select("id,title,category,duration_minutes,pass_percentage,questions(id,question_text,image_path,points,sort_order,question_options(id,option_text,sort_order))").eq("is_published",true).order("created_at",{ascending:true});
  if(r.error){
    console.warn("Cloud exams unavailable:",r.error);
    return false;
  }
  if(!r.data || !r.data.length) return false;
  state.exams=r.data.map(function(e){
    return {
      id:e.id,title:e.title,category:e.category,duration:Number(e.duration_minutes),
      pass:Number(e.pass_percentage),description:"",
      questions:(e.questions||[]).sort(function(a,b){return a.sort_order-b.sort_order}).map(function(q){
        var opts=(q.question_options||[]).sort(function(a,b){return a.sort_order-b.sort_order});
        var image="";
        if(q.image_path && supabaseClient){
          image=supabaseClient.storage.from("question-images").getPublicUrl(q.image_path).data.publicUrl;
        }
        return {id:q.id,text:q.question_text||"",image:image,options:opts.map(function(o){return o.option_text}),optionIds:opts.map(function(o){return o.id}),answer:null,topic:"General",points:Number(q.points||1)};
      })
    };
  });
  return true;
}

async function enterCloudApp(user){
  var profile=await cloudProfile(user);
  if(!profile){
    var full=(user.user_metadata&&user.user_metadata.full_name)||user.email.split("@")[0];
    var ins=await supabaseClient.from("profiles").insert({id:user.id,full_name:full,role:"student"}).select("id,full_name,role").single();
    profile=ins.data||{id:user.id,full_name:full,role:"student"};
  }
  state.user={id:user.id,email:user.email,name:profile.full_name||user.email,role:profile.role||"student"};
  save();
  await cloudLoadExams();
  if(state.user.role==="admin") dashboard(); else studentHome();
}

function authLanding(){
  stop();
  app.innerHTML=`<div class="landing">
    <div class="login-visual">
      <div class="visual-badge">SMART ASSESSMENT</div>
      <h2>Evaluate knowledge.<br><span>Measure performance.</span></h2>
      <p>Secure exams, question banks, student results and analytics powered by Supabase.</p>
    </div>
    <div class="login-panel card">
      <div class="brand">EXAM<span>.</span></div>
      <h1 id="authTitle">Student Login</h1>
      <p class="muted" id="authSub">Sign in to continue to your assessments.</p>
      <label class="field signup-only" style="display:none"><span>Full name</span><input id="authName" placeholder="e.g. Ahmed Mohamed"></label>
      <label class="field"><span>Email</span><input id="authEmail" type="email" placeholder="student@example.com"></label>
      <label class="field"><span>Password</span><input id="authPassword" type="password" placeholder="••••••••"></label>
      <button class="btn primary full" id="authSubmit">Sign In</button>
      <button class="text-btn" id="toggleSignup">Create student account</button>
      <button class="text-btn" id="authAdmin">Admin login →</button>
      <p class="login-note">Authentication and exam data are stored in Supabase.</p>
    </div>
  </div>`;
  var signup=false;
  function renderMode(){
    document.getElementById("authTitle").textContent=signup?"Create Student Account":"Student Login";
    document.getElementById("authSub").textContent=signup?"Create your account to access exams.":"Sign in to continue to your assessments.";
    document.querySelector(".signup-only").style.display=signup?"block":"none";
    document.getElementById("authSubmit").textContent=signup?"Create Account":"Sign In";
    document.getElementById("toggleSignup").textContent=signup?"Already have an account? Sign in":"Create student account";
  }
  document.getElementById("toggleSignup").onclick=function(){signup=!signup;renderMode()};
  document.getElementById("authAdmin").onclick=adminLogin;
  document.getElementById("authSubmit").onclick=async function(){
    var email=document.getElementById("authEmail").value.trim();
    var password=document.getElementById("authPassword").value;
    var name=document.getElementById("authName").value.trim();
    if(!email||!password)return alert("Enter email and password.");
    if(password.length<6)return alert("Password must be at least 6 characters.");
    var r;
    if(signup){
      if(!name)return alert("Enter your full name.");
      r=await supabaseClient.auth.signUp({email:email,password:password,options:{data:{full_name:name}}});
      if(r.error)return alert(r.error.message);
      if(r.data.session && r.data.user) await enterCloudApp(r.data.user);
      else alert("Account created. Check your email to confirm the account, then sign in.");
    }else{
      r=await supabaseClient.auth.signInWithPassword({email:email,password:password});
      if(r.error)return alert(r.error.message);
      if(r.data.user) await enterCloudApp(r.data.user);
    }
  };
}

function landing(){ authLanding(); }

function adminLogin(){
  stop();
  app.innerHTML=`<div class="admin-login"><div class="admin-login-card card">
    <div class="brand">EXAM<span>.</span></div><div class="admin-mark">⚙</div>
    <h1>Admin Panel</h1><p class="muted">Sign in with an authorized admin account.</p>
    <label class="field"><span>Email</span><input id="ae" type="email" placeholder="admin@example.com"></label>
    <label class="field"><span>Password</span><input id="ap" type="password" placeholder="••••••••"></label>
    <button class="btn primary full" id="sign">Sign In</button>
    <button class="text-btn" id="student">← Student login</button>
  </div></div>`;
  document.getElementById("sign").onclick=async function(){
    var email=document.getElementById("ae").value.trim(),password=document.getElementById("ap").value;
    if(!email||!password)return alert("Enter admin email and password.");
    var r=await supabaseClient.auth.signInWithPassword({email:email,password:password});
    if(r.error)return alert(r.error.message);
    var profile=await cloudProfile(r.data.user);
    if(!profile || profile.role!=="admin"){
      await supabaseClient.auth.signOut();
      return alert("This account is not authorized as an admin.");
    }
    await enterCloudApp(r.data.user);
  };
  document.getElementById("student").onclick=landing;
}

async function boot(){
  if(!supabaseClient){ landing(); return; }
  var r=await supabaseClient.auth.getSession();
  if(r.data && r.data.session && r.data.session.user){
    await enterCloudApp(r.data.session.user);
  }else{
    landing();
  }
  supabaseClient.auth.onAuthStateChange(function(event,session){
    if(event==="SIGNED_OUT") landing();
  });
}

boot();
})();