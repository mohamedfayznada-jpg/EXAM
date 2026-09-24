(function () {
  "use strict";

  var STORAGE = "exam_v2";
  var defaultState = {
    user: null,
    attempts: [],
    exams: [
      {id:"ENG-001", title:"Production Basics", category:"Engineering", duration:30, pass:60, description:"Production engineering fundamentals and KPI concepts.", questions:[
        {text:"What does MTBF measure?", options:["Repair duration","Average time between failures","Production quantity","Inspection time"], answer:1, topic:"Maintenance"},
        {text:"What does MTTR primarily measure?", options:["Mean time to repair","Mean time to failure","Yield","Cycle time"], answer:0, topic:"Maintenance"},
        {text:"Which chart monitors count of defects per unit?", options:["X̄-R","C chart","Histogram","Pareto"], answer:1, topic:"Quality"},
        {text:"What is a bottleneck?", options:["Fastest process","Process limiting system output","Inspection station","Storage area"], answer:1, topic:"Production"},
        {text:"COPQ means:", options:["Cost of Production Quality","Cost of Poor Quality","Control of Process Quality","Cost per Output Quantity"], answer:1, topic:"Quality"},
        {text:"What is yield?", options:["Good output relative to input","Downtime only","Defect count","Labor hours"], answer:0, topic:"Quality"},
        {text:"What does OEE combine?", options:["Availability, Performance, Quality","Cost, Labor, Scrap","Safety, Cost, Delivery","MTBF, MTTR, COPQ"], answer:0, topic:"KPI"},
        {text:"A Pareto chart is mainly used to:", options:["Show distribution","Prioritize major contributors","Calculate MTBF","Set takt time"], answer:1, topic:"Quality"}
      ]},
      {id:"QC-001", title:"Quality Control", category:"Quality", duration:20, pass:60, description:"Quality tools, variation, inspection and process control.", questions:[
        {text:"What is the primary purpose of a control chart?", options:["Track process stability","Calculate profit","Schedule shifts","Count operators"], answer:0, topic:"SPC"},
        {text:"Which tool ranks causes from largest to smallest?", options:["Scatter plot","Pareto chart","Histogram","Flowchart"], answer:1, topic:"7 Tools"},
        {text:"A histogram shows:", options:["Process sequence","Frequency distribution","Root cause hierarchy","Project schedule"], answer:1, topic:"7 Tools"},
        {text:"Special-cause variation is:", options:["Expected random noise","Assignable process variation","Always acceptable","A customer complaint"], answer:1, topic:"SPC"},
        {text:"The fishbone diagram is also called:", options:["Ishikawa diagram","Run chart","Box plot","Check sheet"], answer:0, topic:"7 Tools"}
      ]},
      {id:"MT-001", title:"Maintenance Fundamentals", category:"Maintenance", duration:40, pass:60, description:"Reliability, preventive maintenance and equipment performance.", questions:[
        {text:"What is preventive maintenance designed to do?", options:["Wait for failure","Reduce likelihood of failure","Increase defects","Remove inspections"], answer:1, topic:"PM"},
        {text:"MTBF is generally associated with:", options:["Repair speed","Reliability","Quality cost","Inventory"], answer:1, topic:"Reliability"},
        {text:"MTTR is generally associated with:", options:["Maintainability","Demand","Yield","Takt"], answer:0, topic:"Reliability"},
        {text:"TPM stands for:", options:["Total Productive Maintenance","Technical Production Method","Total Process Measurement","Time Performance Management"], answer:0, topic:"TPM"}
      ]},
      {id:"SAFE-001", title:"Safety Procedures", category:"Safety", duration:15, pass:70, description:"Factory safety procedures and emergency response.", questions:[
        {text:"What should you do first after a chemical splash in the eye?", options:["Rub the eye","Flush immediately with clean water","Wait for a supervisor","Close the eye"], answer:1, topic:"Emergency"},
        {text:"PPE stands for:", options:["Personal Protective Equipment","Production Process Evaluation","Plant Protection Engineering","Personal Process Entry"], answer:0, topic:"PPE"},
        {text:"Emergency exits should be:", options:["Locked","Obstructed","Clearly accessible","Used for storage"], answer:2, topic:"Emergency"},
        {text:"A near miss should be:", options:["Ignored","Reported and analyzed","Deleted","Hidden"], answer:1, topic:"Reporting"}
      ]}
    ]
  };

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE);
      return raw ? JSON.parse(raw) : defaultState;
    } catch (e) { return defaultState; }
  }
  var state = loadState();
  var app = document.getElementById("app");
  var timerId = null;
  var currentExam = null;
  var currentAttempt = null;

  function save() { localStorage.setItem(STORAGE, JSON.stringify(state)); }
  function esc(s) { var v=String(s == null ? "" : s); return v.split("&").join("&amp;").split("<").join("&lt;").split(">").join("&gt;").split('"').join("&quot;").split("\'").join("&#39;"); }
  function icon(x) { return '<span class="ico">'+x+'</span>'; }
  function renderTop(userLabel) {
    return '<header class="topbar"><div class="brand">EXAM<span>.</span></div><div class="top-user">'+icon("●")+' '+esc(userLabel || "Assessment Platform")+'</div></header>';
  }
  function page(title, subtitle, body, opts) {
    opts = opts || {};
    return '<main class="container '+(opts.wide ? "wide":"")+'"><div class="page-head"><div><div class="eyebrow">'+esc(opts.eyebrow || "EXAM PLATFORM")+'</div><h1>'+title+'</h1>'+(subtitle?'<p class="muted">'+subtitle+'</p>':"")+'</div>'+(opts.action||"")+'</div>'+body+'</main>';
  }
  function nav(active) {
    var items = [["dashboard","▣","Dashboard"],["exams","▤","Exams"],["questions","☷","Questions"],["students","♙","Students"],["results","◔","Results"],["settings","⚙","Settings"]];
    return '<aside class="sidebar"><div class="side-brand">EXAM<span>.</span></div>'+items.map(function(i){return '<button class="side-link '+(active===i[0]?"active":"")+'" data-route="'+i[0]+'">'+icon(i[1])+i[2]+'</button>';}).join("")+'<button class="side-link logout" data-action="student"><span class="ico">↩</span>Student view</button></aside>';
  }
  function adminShell(active, content) {
    return '<div class="admin-layout">'+nav(active)+'<section class="admin-main">'+renderTop("Admin") + content + '</section></div>';
  }
  function emptyState(title,text,action) { return '<div class="empty card"><div class="empty-icon">□</div><h3>'+title+'</h3><p class="muted">'+text+'</p>'+(action||"")+'</div>'; }

  function landing() {
    stopTimer();
    app.innerHTML = '<div class="landing">'+
      '<div class="login-visual"><div class="visual-badge">SMART ASSESSMENT</div><h2>Evaluate knowledge.<br><span>Measure performance.</span></h2><p>One platform for exams, question banks, student results and analytics.</p><div class="visual-shapes"><div></div><div></div><div></div></div></div>'+
      '<div class="login-panel card"><div class="brand">EXAM<span>.</span></div><h1>Student Assessment</h1><p class="muted">Enter your name to start.</p><label class="field"><span>Student name</span><input id="studentName" placeholder="e.g. Ahmed Mohamed" autocomplete="name"></label><button class="btn primary full" id="continueBtn">Continue</button><button class="text-btn" id="adminBtn">Admin login →</button><p class="login-note">Demo MVP — data is stored locally in this browser.</p></div>'+
      '</div>';
    document.getElementById("continueBtn").onclick = function(){ var n=document.getElementById("studentName").value.trim(); if(!n){alert("Enter your name.");return;} state.user={name:n,role:"student"};save();studentExams(); };
    document.getElementById("studentName").onkeydown=function(e){if(e.key==="Enter")document.getElementById("continueBtn").click();};
    document.getElementById("adminBtn").onclick=adminLogin;
  }

  function studentHeader() { return renderTop(state.user ? state.user.name : "Student"); }
  function studentNav() {
    return '<div class="student-nav"><button class="nav-pill active" data-student="exams">Available Exams</button><button class="nav-pill" data-student="history">My History</button><button class="nav-pill" data-student="profile">Profile</button><button class="nav-pill admin-mini" data-student="admin">Admin</button></div>';
  }

  function studentExams() {
    stopTimer();
    var cards=state.exams.map(function(e){
      return '<article class="exam-card card"><div class="exam-icon '+esc(e.category.toLowerCase())+'">'+icon(e.category==="Safety"?"⚠":e.category==="Quality"?"✓":e.category==="Maintenance"?"⚙":"◉")+'</div><div class="exam-card-main"><span class="category">'+esc(e.category)+'</span><h3>'+esc(e.title)+'</h3><p>'+esc(e.description)+'</p><div class="exam-meta"><span>'+e.questions.length+' Questions</span><span>•</span><span>'+e.duration+' Minutes</span><span>•</span><span>Pass '+e.pass+'%</span></div></div><button class="btn primary" data-start="'+e.id+'">Start</button></article>';
    }).join("");
    app.innerHTML=studentHeader()+studentNav()+page("Choose an assessment","Select an exam and complete it before the timer expires.",'<div class="exam-list">'+cards+'</div>');
    bindStudentNav();
    document.querySelectorAll("[data-start]").forEach(function(b){b.onclick=function(){instructions(b.getAttribute("data-start"));};});
  }

  function bindStudentNav(){
    document.querySelectorAll("[data-student]").forEach(function(b){b.onclick=function(){var r=b.getAttribute("data-student"); if(r==="history")studentHistory(); else if(r==="profile")studentProfile(); else if(r==="admin")adminLogin(); else studentExams();};});
  }

  function instructions(id){
    var e=state.exams.find(function(x){return x.id===id}); currentExam=e;
    app.innerHTML=studentHeader()+page("Exam Instructions","Review the rules before starting.",'<div class="instruction-card card"><div class="instruction-hero"><div class="big-doc">▤</div><h2>'+esc(e.title)+'</h2><p>'+e.questions.length+' Questions • '+e.duration+' Minutes</p></div><div class="instruction-grid"><div>◉ <b>Multiple choice questions</b><small>Choose one answer per question.</small></div><div>◷ <b>Timer keeps running</b><small>The timer cannot be paused.</small></div><div>↔ <b>Navigate freely</b><small>Review questions before submitting.</small></div><div>✓ <b>Final submission</b><small>Answers are scored automatically.</small></div></div><div class="center"><button class="btn primary big-btn" id="startExam">Start Exam</button><button class="btn ghost" id="backExams">Back to Exams</button></div></div>');
    document.getElementById("startExam").onclick=function(){startExam(e.id);};
    document.getElementById("backExams").onclick=studentExams;
  }

  function startExam(id){
    currentExam=state.exams.find(function(x){return x.id===id});
    currentAttempt={examId:id,answers:Array(currentExam.questions.length).fill(null),index:0,left:currentExam.duration*60,started:Date.now()};
    renderQuestion();
  }
  function stopTimer(){if(timerId){clearInterval(timerId);timerId=null;}}
  function renderQuestion(){
    stopTimer();
    var e=currentExam,a=currentAttempt,q=e.questions[a.index];
    app.innerHTML=studentHeader()+'<main class="container exam-page"><div class="exam-bar"><div><div class="eyebrow">'+esc(e.category)+'</div><h1>'+esc(e.title)+'</h1><div class="progress"><div style="width:'+((a.index+1)/e.questions.length*100)+'%"></div></div></div><div class="timer"><span>◷</span> <b id="clock">'+fmtTime(a.left)+'</b></div></div>'+
      '<div class="exam-grid"><section class="question-panel card"><div class="q-top"><span>Question '+(a.index+1)+' of '+e.questions.length+'</span><span>'+esc(q.topic||"General")+'</span></div><h2>'+esc(q.text)+'</h2><div class="options">'+q.options.map(function(o,i){return '<button class="answer '+(a.answers[a.index]===i?"selected":"")+'" data-answer="'+i+'"><span class="letter">'+String.fromCharCode(65+i)+'</span><span>'+esc(o)+'</span></button>';}).join("")+'</div><div class="exam-actions"><button class="btn ghost" id="prevQ" '+(a.index===0?"disabled":"")+'>Previous</button><button class="btn primary" id="nextQ">'+(a.index===e.questions.length-1?"Finish Exam":"Next")+'</button></div></section>'+
      '<aside class="question-nav card"><h3>Question Navigation</h3><div class="q-grid">'+e.questions.map(function(_,i){var cls=a.answers[i]!==null?"answered":""; if(i===a.index)cls+=" current"; return '<button class="'+cls+'" data-q="'+i+'">'+(i+1)+'</button>';}).join("")+'</div><div class="legend"><span><i class="dot answered"></i> Answered</span><span><i class="dot current"></i> Current</span><span><i class="dot"></i> Not answered</span></div><button class="btn primary full" id="finishExam">Finish Exam</button></aside></div></main>';
    document.querySelectorAll("[data-answer]").forEach(function(b){b.onclick=function(){a.answers[a.index]=Number(b.getAttribute("data-answer"));renderQuestion();};});
    document.querySelectorAll("[data-q]").forEach(function(b){b.onclick=function(){a.index=Number(b.getAttribute("data-q"));renderQuestion();};});
    document.getElementById("prevQ").onclick=function(){if(a.index>0){a.index--;renderQuestion();}};
    document.getElementById("nextQ").onclick=function(){if(a.index===e.questions.length-1)confirmSubmit();else{a.index++;renderQuestion();}};
    document.getElementById("finishExam").onclick=confirmSubmit;
    timerId=setInterval(function(){a.left--;var c=document.getElementById("clock");if(c)c.textContent=fmtTime(a.left);if(a.left<=0){stopTimer();submitExam(true);}},1000);
  }
  function fmtTime(s){s=Math.max(0,s);return Math.floor(s/60)+":"+String(s%60).padStart(2,"0");}
  function confirmSubmit(){
    var answered=currentAttempt.answers.filter(function(x){return x!==null;}).length;
    var total=currentExam.questions.length;
    var wrap=document.createElement("div");
    wrap.id="confirmModal";
    wrap.className="modal-backdrop";
    wrap.innerHTML="<div class=\"modal card\"><div class=\"modal-icon\">➤</div><h2>Submit Exam?</h2><p>You have answered <b>"+answered+"</b> of <b>"+total+"</b> questions. Remaining questions will be marked as incorrect.</p><div class=\"modal-actions\"><button class=\"btn ghost\" id=\"cancelSubmit\">Cancel</button><button class=\"btn primary\" id=\"yesSubmit\">Submit</button></div></div>";
    app.appendChild(wrap);
    document.getElementById("cancelSubmit").onclick=function(){wrap.remove();};
    document.getElementById("yesSubmit").onclick=function(){submitExam(false);};
  }
  function submitExam(auto){
    stopTimer();var e=currentExam,a=currentAttempt,score=0;
    e.questions.forEach(function(q,i){if(a.answers[i]===q.answer)score++;});
    var pct=Math.round(score/e.questions.length*100),attempt={id:Date.now(),examId:e.id,exam:e.title,student:state.user.name,score:score,total:e.questions.length,pct:pct,passed:pct>=e.pass,date:new Date().toISOString(),timeTaken:Math.round((Date.now()-a.started)/1000),answers:a.answers.slice()};
    state.attempts.push(attempt);save();showResult(attempt,auto);
  }
  function showResult(attempt){
    var pass=attempt.passed;
    app.innerHTML=studentHeader()+page(pass?"Congratulations!":"Good Try!",pass?"You Passed":"You Did Not Pass",'<div class="result-card card '+(pass?"result-pass":"result-fail")+'"><div class="result-icon">'+(pass?"✓":"×")+'</div><h2>'+ (pass?"You Passed":"You Did Not Pass") +'</h2><div class="result-score">'+attempt.pct+'%</div><div class="result-stats"><div><span>Your Score</span><b>'+attempt.score+' / '+attempt.total+'</b></div><div><span>Passing Score</span><b>'+currentExam.pass+'%</b></div></div><div class="result-meta"><span>Exam <b>'+esc(attempt.exam)+'</b></span><span>Time Taken <b>'+fmtTime(attempt.timeTaken)+'</b></span><span>Date <b>'+new Date(attempt.date).toLocaleDateString()</b></span></div><div class="center"><button class="btn ghost" id="reviewBtn">View Answers</button><button class="btn primary" id="backBtn">Back to Exams</button></div></div>');
    document.getElementById("reviewBtn").onclick=function(){reviewAnswers(attempt);};document.getElementById("backBtn").onclick=studentExams;
  }
  function reviewAnswers(attempt){
    var e=state.exams.find(function(x){return x.id===attempt.examId});
    var correct=0; e.questions.forEach(function(q,i){if(attempt.answers[i]===q.answer)correct++;});
    var rows=e.questions.map(function(q,i){var ok=attempt.answers[i]===q.answer;return '<div class="review-row"><div class="review-status '+(ok?"ok":"bad")+'">'+(ok?"✓":"×")+'</div><div><b>Question '+(i+1)+'</b><p>'+esc(q.text)+'</p><small>Your answer: '+(attempt.answers[i]===null?"Not answered":esc(q.options[attempt.answers[i]]))+'</small></div><span class="badge '+(ok?"pass":"fail")+'">'+(ok?"Correct":"Incorrect")+'</span></div>';}).join("");
    app.innerHTML=studentHeader()+page("Answers Review","Review your answers and identify improvement areas.",'<div class="review-summary"><div><b>'+correct+'</b><span>Correct</span></div><div><b>'+(e.questions.length-correct)+'</b><span>Incorrect</span></div><div><b>'+attempt.answers.filter(function(x){return x===null}).length+'</b><span>Not Answered</span></div></div><div class="card review-list">'+rows+'</div><div class="center"><button class="btn primary" id="reviewBack">Back to Results</button></div>');
    document.getElementById("reviewBack").onclick=function(){showResult(attempt);};
  }
  function studentHistory(){
    var mine=state.attempts.filter(function(a){return a.student===state.user.name}).slice().reverse();
    var rows=mine.map(function(a){return '<tr><td>'+new Date(a.date).toLocaleDateString()+'</td><td>'+esc(a.exam)+'</td><td><b>'+a.pct+'%</b></td><td><span class="badge '+(a.passed?"pass":"fail")+'">'+(a.passed?"Pass":"Fail")+'</span></td><td>'+fmtTime(a.timeTaken||0)+'</td><td><button class="mini-btn" data-review="'+a.id+'">View</button></td></tr>';}).join("");
    app.innerHTML=studentHeader()+studentNav()+page("My Exam History","Your completed assessments.",mine.length?'<div class="table-wrap card"><table class="table"><thead><tr><th>Date</th><th>Exam</th><th>Score</th><th>Result</th><th>Time</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>':emptyState("No exams yet","Complete an assessment and your results will appear here.",'<button class="btn primary" id="goExams">Browse Exams</button>'));
    bindStudentNav();if(document.getElementById("goExams"))document.getElementById("goExams").onclick=studentExams;
    document.querySelectorAll("[data-review]").forEach(function(b){b.onclick=function(){var a=state.attempts.find(function(x){return String(x.id)===b.getAttribute("data-review")});showResult(a);};});
  }
  function studentProfile(){app.innerHTML=studentHeader()+studentNav()+page("My Profile","Student account information.",'<div class="profile-card card"><div class="avatar">'+esc((state.user.name||"S").charAt(0).toUpperCase())+'</div><h2>'+esc(state.user.name)+'</h2><p class="muted">Student</p><div class="profile-stats"><div><b>'+state.attempts.filter(function(a){return a.student===state.user.name}).length+'</b><span>Attempts</span></div><div><b>'+avgStudent()+'%</b><span>Average</span></div></div></div>');bindStudentNav();}
  function avgStudent(){var a=state.attempts.filter(function(x){return x.student===state.user.name});return a.length?Math.round(a.reduce(function(s,x){return s+x.pct},0)/a.length):0;}

  function adminLogin(){
    stopTimer();
    app.innerHTML='<div class="admin-login"><div class="admin-login-card card"><div class="brand">EXAM<span>.</span></div><div class="admin-mark">⚙</div><h1>Admin Panel</h1><p class="muted">Sign in to manage exams.</p><label class="field"><span>Email</span><input id="adminEmail" value="admin@exam.com"></label><label class="field"><span>Password</span><input id="adminPass" type="password" value="admin"></label><button class="btn primary full" id="adminSign">Sign In</button><button class="text-btn" id="studentReturn">← Student view</button></div></div>';
    document.getElementById("adminSign").onclick=function(){state.user={name:"Admin",role:"admin"};save();adminDashboard();};
    document.getElementById("studentReturn").onclick=landing;
  }

  function adminDashboard(){
    var attempts=state.attempts,total=attempts.length,avg=total?Math.round(attempts.reduce(function(s,a){return s+a.pct},0)/total):0,pass=total?Math.round(attempts.filter(function(a){return a.passed}).length/total*100):0;
    var bars=[38,55,46,68,60,78,52,88,72,96].map(function(v,i){return '<div class="bar-col"><div class="bar" style="height:'+v+'%"></div><span>'+["Aug 24","Aug 29","Sep 3","Sep 8","Sep 13","Sep 15","Sep 18","Sep 20","Sep 21","Sep 22"][i]+'</span></div>';}).join("");
    var recent=attempts.slice().reverse().slice(0,6).map(function(a){return '<tr><td>'+esc(a.student)+'</td><td>'+esc(a.exam)+'</td><td>'+a.pct+'%</td><td><span class="badge '+(a.passed?"pass":"fail")+'">'+(a.passed?"PASS":"FAIL")+'</span></td></tr>';}).join("");
    return renderAdminDashboard(avg,pass,total,bars,recent);
  }
  function renderAdminDashboard(avg,pass,total,bars,recent){
    var body=page("Dashboard","Overview of exams, attempts and student performance.",'<div class="kpi-grid"><div class="kpi card"><span>👥 Total Students</span><b>12</b><em>+12%</em></div><div class="kpi card"><span>▤ Total Exams</span><b>'+state.exams.length+'</b><em>+8%</em></div><div class="kpi card"><span>♧ Total Attempts</span><b>'+total+'</b><em>+16%</em></div><div class="kpi card"><span>◉ Average Score</span><b>'+avg+'%</b><em>+5%</em></div></div><div class="analytics-grid"><div class="card chart-card"><div class="row"><div><h3>Exam Attempts <small>(Last 30 Days)</small></h3></div><span class="chart-filter">Last 30 Days ▾</span></div><div class="chart">'+bars+'</div></div><div class="card donut-card"><h3>Results Overview</h3><div class="donut" style="--p:'+pass+'"><span>'+pass+'%<small>Pass Rate</small></span></div><div class="donut-legend"><span>■ Pass '+(total?attemptsPass(total):0)+'</span><span>■ Fail '+(total?total-attemptsPass(total):0)+'</span></div></div></div><div class="card table-card"><div class="row"><h3>Recent Attempts</h3><button class="btn ghost" data-route="results">View All</button></div><div class="table-wrap"><table class="table"><thead><tr><th>Student</th><th>Exam</th><th>Score</th><th>Status</th></tr></thead><tbody>'+(recent||'<tr><td colspan="4" class="muted">No attempts yet.</td></tr>')+'</tbody></table></div></div>');
    app.innerHTML=adminShell("dashboard",body);bindAdmin();
  }
  function attemptsPass(total){return state.attempts.filter(function(a){return a.passed}).length;}

  function adminExams(){
    var rows=state.exams.map(function(e){return '<tr><td><b>'+esc(e.title)+'</b><small>'+esc(e.category)+'</small></td><td>'+e.questions.length+'</td><td>'+e.duration+' min</td><td>'+e.pass+'%</td><td><button class="mini-btn" data-edit="'+e.id+'">✎</button><button class="mini-btn danger-mini" data-delete="'+e.id+'">×</button></td></tr>';}).join("");
    var body=page("Manage Exams","Create, edit and organize your assessments.",'<div class="card table-card"><div class="row"><h3>All Exams</h3><button class="btn primary" id="newExam">+ Create Exam</button></div><div class="table-wrap"><table class="table"><thead><tr><th>Exam</th><th>Questions</th><th>Duration</th><th>Pass Score</th><th>Actions</th></tr></thead><tbody>'+rows+'</tbody></table></div></div>');
    app.innerHTML=adminShell("exams",body);bindAdmin();
    document.getElementById("newExam").onclick=function(){editExam(null);};
    document.querySelectorAll("[data-edit]").forEach(function(b){b.onclick=function(){editExam(b.getAttribute("data-edit"));};});
    document.querySelectorAll("[data-delete]").forEach(function(b){b.onclick=function(){var id=b.getAttribute("data-delete");if(confirm("Delete this exam?")){state.exams=state.exams.filter(function(x){return x.id!==id});save();adminExams();}};});
  }
  function editExam(id){
    var e=id?state.exams.find(function(x){return x.id===id}):{id:"EX-"+Date.now(),title:"",category:"General",duration:30,pass:60,description:"",questions:[]};
    var body=page(id?"Edit Exam":"Create New Exam","Configure exam settings and questions.",'<div class="form-card card"><div class="form-grid"><label class="field"><span>Exam Title</span><input id="eTitle" value="'+esc(e.title)+'" placeholder="e.g. Production Basics"></label><label class="field"><span>Category</span><input id="eCat" value="'+esc(e.category)+'"></label><label class="field wide-field"><span>Description</span><textarea id="eDesc" rows="3">'+esc(e.description||"")+'</textarea></label><label class="field"><span>Duration (minutes)</span><input id="eDur" type="number" value="'+e.duration+'"></label><label class="field"><span>Passing Score (%)</span><input id="ePass" type="number" value="'+e.pass+'"></label></div><div class="center"><button class="btn ghost" id="cancelEdit">Cancel</button><button class="btn primary" id="saveExam">'+(id?"Save Changes":"Create Exam")+'</button></div></div>');
    app.innerHTML=adminShell("exams",body);bindAdmin();
    document.getElementById("cancelEdit").onclick=adminExams;
    document.getElementById("saveExam").onclick=function(){e.title=document.getElementById("eTitle").value.trim()||"Untitled Exam";e.category=document.getElementById("eCat").value.trim()||"General";e.description=document.getElementById("eDesc").value.trim();e.duration=Number(document.getElementById("eDur").value)||30;e.pass=Number(document.getElementById("ePass").value)||60;if(!id)state.exams.push(e);save();adminExams();};
  }
  function questionBank(){
    var rows=[];state.exams.forEach(function(e){e.questions.forEach(function(q,i){rows.push('<tr><td><b>'+esc(q.text)+'</b><small>'+esc(q.topic||"General")+'</small></td><td>'+esc(e.title)+'</td><td><button class="mini-btn">✎</button><button class="mini-btn danger-mini">×</button></td></tr>');});});
    var body=page("Question Bank","Central library of questions across all exams.",'<div class="card table-card"><div class="row"><div class="filter-row"><select id="qFilter"><option>All Exams</option>'+state.exams.map(function(e){return '<option>'+esc(e.title)+'</option>';}).join("")+'</select><input placeholder="Search questions..." id="qSearch"></div><button class="btn primary" id="addQ">+ Add Question</button></div><div class="table-wrap"><table class="table"><thead><tr><th>Question</th><th>Exam</th><th>Actions</th></tr></thead><tbody id="qRows">'+rows.join("")+'</tbody></table></div></div>');
    app.innerHTML=adminShell("questions",body);bindAdmin();document.getElementById("addQ").onclick=function(){alert("Question editor is ready for the next database-connected phase.");};
  }
  function students(){
    var names={};state.attempts.forEach(function(a){names[a.student]=(names[a.student]||[]).concat(a);});var rows=Object.keys(names).map(function(n){var a=names[n],avg=Math.round(a.reduce(function(s,x){return s+x.pct},0)/a.length);return '<tr><td><b>'+esc(n)+'</b></td><td>'+a.length+'</td><td>'+avg+'%</td><td><button class="mini-btn">View</button></td></tr>';}).join("");
    var body=page("Students","Monitor student participation and performance.",'<div class="card table-card"><div class="row"><h3>Students</h3><input class="search-inline" placeholder="Search students..."></div><div class="table-wrap"><table class="table"><thead><tr><th>Name</th><th>Exams Taken</th><th>Average Score</th><th>Actions</th></tr></thead><tbody>'+(rows||'<tr><td colspan="4" class="muted">No student attempts yet.</td></tr>')+'</tbody></table></div></div>');
    app.innerHTML=adminShell("students",body);bindAdmin();
  }
  function results(){
    var total=state.attempts.length,pass=total?Math.round(state.attempts.filter(function(a){return a.passed}).length/total*100):0,avg=total?Math.round(state.attempts.reduce(function(s,a){return s+a.pct},0)/total):0;
    var bars=[20,34,48,68,82,64].map(function(v,i){return '<div class="dist-row"><span>'+["0–20","21–40","41–60","61–80","81–90","91–100"][i]+'</span><div><i style="width:'+v+'%"></i></div><b>'+v+'</b></div>';}).join("");
    var body=page("Results Analytics","Performance trends across all assessments.",'<div class="kpi-grid"><div class="kpi card"><span>Total Attempts</span><b>'+total+'</b></div><div class="kpi card"><span>Pass Rate</span><b>'+pass+'%</b></div><div class="kpi card"><span>Average Score</span><b>'+avg+'%</b></div></div><div class="card"><h3>Score Distribution</h3><div class="distribution">'+bars+'</div></div>');
    app.innerHTML=adminShell("results",body);bindAdmin();
  }
  function settings(){
    var body=page("Settings","Application preferences and access controls.",'<div class="settings-grid"><div class="card"><h3>General</h3><label class="field"><span>Platform Name</span><input value="EXAM." disabled></label><label class="field"><span>Default Passing Score</span><input value="60%" disabled></label></div><div class="card"><h3>Data</h3><p class="muted">Current demo data is stored in this browser.</p><button class="btn danger" id="resetAll">Reset Demo Data</button></div></div>');
    app.innerHTML=adminShell("settings",body);bindAdmin();document.getElementById("resetAll").onclick=function(){if(confirm("Reset all demo attempts?")){state.attempts=[];save();settings();}};
  }
  function bindAdmin(){
    document.querySelectorAll("[data-route]").forEach(function(b){b.onclick=function(){routeAdmin(b.getAttribute("data-route"));};});
    document.querySelectorAll("[data-action='student']").forEach(function(b){b.onclick=landing;});
  }
  function routeAdmin(r){if(r==="dashboard")adminDashboard();else if(r==="exams")adminExams();else if(r==="questions")questionBank();else if(r==="students")students();else if(r==="results")results();else settings();}

  landing();
})();