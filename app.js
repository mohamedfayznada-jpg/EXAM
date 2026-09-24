(function(){
"use strict";
var state={user:null,attempts:[],exams:[]};
var app=document.getElementById("app"),timer=null,current=null,attempt=null;
function save(){/* Supabase is the source of truth; browser storage is not authoritative. */}
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
      <p>Simple student access. Enter your name once and continue.</p>
    </div>
    <div class="login-panel card">
      <div class="brand">EXAM<span>.</span></div>
      <h1>Student Access</h1>
      <p class="muted">Enter your name to start. No email or password required.</p>
      <label class="field"><span>Student name</span><input id="studentName" placeholder="e.g. Mohamed Fayez"></label>
      <button class="btn primary full" id="studentContinue">Enter Exam</button>
      <button class="text-btn" id="authAdmin">Admin login →</button>
      <p class="login-note">Your browser keeps your student session so you do not need to type your name every time.</p>
    </div>
  </div>`;
  document.getElementById("studentContinue").onclick=async function(){
    var name=document.getElementById("studentName").value.trim();
    if(!name)return alert("Enter your name.");
    var r=await supabaseClient.auth.signInAnonymously();
    if(r.error)return alert(r.error.message);
    var user=r.data.user;
    var profile=await cloudProfile(user);
    if(!profile){
      var ins=await supabaseClient.from("profiles").insert({id:user.id,full_name:name,role:"student"}).select("id,full_name,role").single();
      profile=ins.data;
    }else{
      await supabaseClient.from("profiles").update({full_name:name,role:profile.role==="admin"?"admin":"student"}).eq("id",user.id);
    }
    await enterCloudApp(user);
  };
  document.getElementById("authAdmin").onclick=adminLogin;
}

function landing(){ authLanding(); }

function adminLogin(){
  stop();
  app.innerHTML=`<div class="admin-login"><div class="admin-login-card card">
    <div class="brand">EXAM<span>.</span></div><div class="admin-mark">⚙</div>
    <h1>Admin Panel</h1><p class="muted">Simple admin access.</p>
    <label class="field"><span>Username</span><input id="ae" autocomplete="username" value="eng.wael"></label>
    <label class="field"><span>Password</span><input id="ap" type="password" autocomplete="current-password" placeholder="•••••"></label>
    <button class="btn primary full" id="sign">Sign In</button>
    <button class="text-btn" id="student">← Student access</button>
  </div></div>`;
  document.getElementById("sign").onclick=async function(){
    var username=document.getElementById("ae").value.trim(),password=document.getElementById("ap").value;
    if(!username||!password)return alert("Enter username and password.");
    var session=(await supabaseClient.auth.getSession()).data.session;
    if(!session){
      var anon=await supabaseClient.auth.signInAnonymously();
      if(anon.error)return alert(anon.error.message);
    }
    var r=await supabaseClient.rpc("admin_login",{p_username:username,p_password:password});
    if(r.error)return alert(r.error.message);
    if(!r.data||!r.data.ok)return alert("Invalid admin username or password.");
    var currentSession=(await supabaseClient.auth.getSession()).data.session;
    if(!currentSession||!currentSession.user)return alert("Admin session could not be created.");
    await enterCloudApp(currentSession.user);
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
  supabaseClient.auth.onAuthStateChange(function(event){
    if(event==="SIGNED_OUT") landing();
  });
}
boot();
})();