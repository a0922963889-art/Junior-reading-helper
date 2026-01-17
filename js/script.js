// 引力场专用的全局状态
let gNodes = [], gLinks = [], gAnimationId = null;
let gWidth, gHeight;
let gDraggingNode = null;
let lastMouseX = 0, lastMouseY = 0;
const canvas=document.getElementById('bgCanvas'), ctx=canvas.getContext('2d');
let width, height, particles=[];
function resize(){width=canvas.width=window.innerWidth;height=canvas.height=window.innerHeight;}
window.addEventListener('resize',resize); resize();
class Particle{
    constructor(){this.init();}
    init(){this.x=Math.random()*width;this.y=Math.random()*height;this.r=Math.random()*200+100;this.vx=(Math.random()-0.5)*0.5;this.vy=(Math.random()-0.5)*0.5;this.alpha=0;this.targetAlpha=Math.random()*0.3+0.1;this.fadingIn=true;this.color=['255, 253, 245','181, 234, 215','255, 218, 193'][Math.floor(Math.random()*3)];}
    update(){this.x+=this.vx;this.y+=this.vy;if(this.x<-this.r||this.x>width+this.r)this.vx*=-1;if(this.y<-this.r||this.y>height+this.r)this.vy*=-1;if(this.fadingIn){this.alpha+=0.002;if(this.alpha>=this.targetAlpha)this.fadingIn=false;}else{this.alpha-=0.002;if(this.alpha<=0)this.init();}}
    draw(){ctx.beginPath();const g=ctx.createRadialGradient(this.x,this.y,0,this.x,this.y,this.r);g.addColorStop(0,`rgba(${this.color},${this.alpha})`);g.addColorStop(1,`rgba(${this.color},0)`);ctx.fillStyle=g;ctx.arc(this.x,this.y,this.r,0,Math.PI*2);ctx.fill();}
}
for(let i=0;i<15;i++)particles.push(new Particle());
function animate(){ctx.clearRect(0,0,width,height);ctx.fillStyle='#FFFDF5';ctx.fillRect(0,0,width,height);particles.forEach(p=>{p.update();p.draw();});requestAnimationFrame(animate);}
animate();

const texts=["让阅读更简单","必读书目助读","关键考点积累","思维导图理解"];
let ti=0, ci=0, isDel=false; const typeEl=document.getElementById('typewriter-text');
function type(){const cur=texts[ti]; typeEl.textContent=isDel?cur.substring(0,ci-1):cur.substring(0,ci+1); ci=isDel?ci-1:ci+1; let spd=150; if(!isDel&&ci===cur.length){spd=2000;isDel=true;} else if(isDel&&ci===0){isDel=false;ti=(ti+1)%texts.length;spd=500;} else if(isDel)spd=100; setTimeout(type,spd);}
document.addEventListener('DOMContentLoaded',type);

const mainContent=document.getElementById('main-content'), sidebar=document.getElementById('sidebar'), readerSidebar=document.getElementById('reader-sidebar'), readerContainer=document.getElementById('book-reader');
const clozeView=document.getElementById('reader-content'), mindmapView=document.getElementById('mindmap-container'), quizView=document.getElementById('quiz-container'), finalTestView=document.getElementById('final-test-container');
const chapterList=document.getElementById('chapter-list'), quizList=document.getElementById('quiz-list');
const btnCloze=document.getElementById('btn-cloze'), btnMindmap=document.getElementById('btn-mindmap'), btnQuiz=document.getElementById('btn-quiz');

window.openBook=function(id){
    if(id!=='zhxs'){alert("敬请期待！");return;}
    mainContent.style.display='none'; sidebar.style.display='none';
    readerContainer.style.display='flex'; readerSidebar.style.display='block';
    generateChapterList(); generateQuizList();
    switchReaderMode('cloze'); loadZhxsContent();
}
window.closeBook=function(){ readerContainer.style.display='none'; readerSidebar.style.display='none'; mainContent.style.display='block'; sidebar.style.display='block'; }

// 更新后的 switchReaderMode 函数
window.switchReaderMode = function(mode){
    // 1. 隐藏所有
    clozeView.style.display='none'; 
    mindmapView.style.display='none'; 
    quizView.style.display='none'; 
    finalTestView.style.display='none';
    document.getElementById('video-container').style.display='none';
    document.getElementById('gravity-container').style.display='none'; // 新增

    // 2. 重置按钮
    btnCloze.classList.remove('active-mode'); 
    btnMindmap.classList.remove('active-mode'); 
    btnQuiz.classList.remove('active-mode');
    document.getElementById('btn-video').classList.remove('active-mode');
    const btnGrav = document.getElementById('btn-gravity');
    if(btnGrav) btnGrav.classList.remove('active-mode'); // 新增

    chapterList.style.display='none'; 
    quizList.style.display='none';
    
    // 3. 停止物理引擎 (重要!)
    if(typeof stopGravity === 'function') stopGravity();

    // 4. 显示对应
    if(mode==='cloze'){ clozeView.style.display='flex'; btnCloze.classList.add('active-mode'); chapterList.style.display='block'; }
    else if(mode==='mindmap'){ mindmapView.style.display='block'; btnMindmap.classList.add('active-mode'); if(!mapInitialized) initMindMap(); }
    else if(mode==='quiz'){ quizView.style.display='flex'; btnQuiz.classList.add('active-mode'); quizList.style.display='block'; loadQuizContent(0); }
    else if(mode==='video'){ document.getElementById('video-container').style.display='flex'; document.getElementById('btn-video').classList.add('active-mode'); }
    else if(mode==='gravity'){ // 新增分支
        document.getElementById('gravity-container').style.display='block'; 
        if(btnGrav) btnGrav.classList.add('active-mode');
        if(typeof startGravity === 'function') startGravity();
    }
}

function generateChapterList(){
    chapterList.innerHTML=''; if(typeof ZHXS_DATA==='undefined')return;
    ZHXS_DATA.forEach((c,i)=>{
        const el=document.createElement('div'); el.className='submenu-item'; el.innerText=c.title.split('：')[1]||c.title;
        el.onclick=()=>{switchReaderMode('cloze'); document.querySelectorAll('.sheet-card')[i]?.scrollIntoView({behavior:'smooth'});};
        chapterList.appendChild(el);
    });
}
function generateQuizList(){
    quizList.innerHTML=''; if(typeof ZHXS_DATA==='undefined')return;
    ZHXS_DATA.forEach((c,i)=>{
        const el=document.createElement('div'); el.className='submenu-item'; el.innerText=c.title.split('：')[1]||c.title;
        el.onclick=()=>{ loadQuizContent(i); quizView.scrollTop=0; };
        quizList.appendChild(el);
    });
}

window.toggleCloze=function(el){el.classList.toggle('revealed');}
function loadZhxsContent(){
    clozeView.innerHTML=''; if(typeof ZHXS_DATA==='undefined')return;
    ZHXS_DATA.forEach(c=>{
        const s=document.createElement('div'); s.className='sheet-card block-style';
        let h=`<h2 class="sheet-title">${c.title}</h2>`;
        for(let k in c.categories){ h+=`<div style="font-weight:bold;margin:25px 0 10px;color:#2c2c2c">● ${k}</div>`; c.categories[k].forEach((q,i)=>{ h+=`<div class="question-line">${i+1}. ${q.q.replace(/\{(.*?)\}/g,(m,p)=>`<span class="cloze-slot" onclick="toggleCloze(this)">${p}</span>`)}</div>`; }); }
        s.innerHTML=h; clozeView.appendChild(s);
    });
}

// ===================== 修复版：选择题渲染逻辑 =====================

function loadQuizContent(idx){
    const qView = document.getElementById('quiz-container'); // 确保变量名对齐
    qView.innerHTML=''; 
    const c = ZHXS_DATA[idx];
    
    // 如果没有题目
    if(!c.quiz || c.quiz.length === 0){
        qView.innerHTML=`<div style="color:#999;text-align:center;margin-top:50px;">本章暂无选择题数据</div>`;
        return;
    }

    const h = document.createElement('h2'); 
    h.className = 'sheet-title'; 
    h.innerText = c.title + ' · 10道精选'; 
    qView.appendChild(h);

    c.quiz.forEach((q,i)=>{
        const card = document.createElement('div'); 
        card.className = 'quiz-card'; // 对应CSS样式

        // 重置按钮
        const r = document.createElement('div'); 
        r.className = 'reset-quiz-btn'; 
        r.innerHTML = '↻'; 
        r.onclick = () => resetQuiz(card, q);

        // 题目
        const qt = document.createElement('div'); 
        qt.className = 'quiz-question'; 
        qt.innerText = `${i+1}. ${q.q}`;

        // 选项容器
        const ops = document.createElement('div'); 
        ops.className = 'quiz-options';

        q.options.forEach((opt,oi)=>{
            const b = document.createElement('div'); 
            b.className = 'quiz-option'; 
            b.innerText = opt;
            // 绑定点击事件
            b.onclick = () => checkAns(b, oi, q.answer, card); 
            ops.appendChild(b);
        });

        // 解析框 (默认隐藏)
        const exp = document.createElement('div'); 
        exp.className = 'quiz-explanation'; // CSS里有 display: none
        exp.innerText = q.explain;

        card.append(r, qt, ops, exp); 
        qView.appendChild(card);
    });
    
    // 底部垫高
    const sp = document.createElement('div'); 
    sp.style.height = '100px'; 
    qView.appendChild(sp);
}

// 判题逻辑
function checkAns(btn, idx, ans, card){
    // 如果已经答过了(有任何红或绿)，就禁止再点
    if(card.querySelector('.correct') || card.querySelector('.wrong')) return;
    
    const opts = card.querySelectorAll('.quiz-option');
    const exp = card.querySelector('.quiz-explanation');

    if(idx === ans){
        // 答对
        btn.classList.add('correct'); 
        btn.innerText += ' ✅';
    } else {
        // 答错
        btn.classList.add('wrong'); 
        btn.innerText += ' ❌';
        // 显示正确答案
        opts[ans].classList.add('correct'); 
        opts[ans].innerText += ' ✅';
    }
    // 显示解析
    exp.classList.add('show'); 
}

// 重置逻辑
function resetQuiz(card, q){
    const opts = card.querySelectorAll('.quiz-option');
    opts.forEach((o,i)=>{
        o.className = 'quiz-option'; // 移除颜色
        o.innerText = q.options[i];  // 移除对勾叉号
    });
    // 隐藏解析
    card.querySelector('.quiz-explanation').classList.remove('show');
}

let mapScale=0.9, mapX=100, mapY=300, isDragging=false, startX, startY, mapInitialized=false;
const viewport=document.getElementById('mindmap-viewport'), world=document.getElementById('mindmap-world'), svgLayer=document.getElementById('mindmap-lines'), nodesLayer=document.getElementById('mindmap-nodes');
function buildChain(s){const p=s.split('->').map(x=>x.trim());let r={name:p[p.length-1]};for(let i=p.length-2;i>=0;i--)r={name:p[i],children:[r]};return r;}
const FULL_MAP_DATA={id:"root",name:"《朝花夕拾》",type:"root",children:[{name:"狗猫鼠",children:[{name:"情感",children:[buildChain("仇猫->媚态")]},{name:"批判",children:[buildChain("正人君子")]}]},{name:"阿长",children:[{name:"情感",children:[buildChain("厌恶->感激")]}]},{name:"二十四孝图",children:[{name:"批判",children:[buildChain("虚伪残酷")]}]},{name:"五猖会",children:[{name:"压抑",children:[buildChain("背书->扫兴")]}]}]};
function initMindMap(){mapInitialized=true;renderMindMap(FULL_MAP_DATA);mapX=100;mapY=window.innerHeight/2;updateTransform();}
const NODE_H=45, LEVEL_W=220, NODE_M=15;
function layoutNode(n,l){n.level=l;if(!n.children||!n.children.length){n.contentHeight=NODE_H;return;}let h=0;n.children.forEach(c=>{layoutNode(c,l+1);h+=c.contentHeight+NODE_M;});h-=NODE_M;n.contentHeight=h;}
function assignPos(n,x,y){n.x=x;n.y=y+n.contentHeight/2;if(!n.children)return;let cy=y;n.children.forEach(c=>{assignPos(c,x+LEVEL_W,cy);cy+=c.contentHeight+NODE_M;});}
function renderMindMap(d){nodesLayer.innerHTML='';svgLayer.innerHTML='';layoutNode(d,0);assignPos(d,0,-d.contentHeight/2);drawNode(d);svgLayer.setAttribute('width','50000');svgLayer.setAttribute('height','50000');}
function drawNode(n){ const el=document.createElement('div'); el.className=`mind-node level-${Math.min(n.level,3)}`; if(n.type==='root')el.classList.add('root-node'); el.innerHTML=n.name; el.style.left=n.x+'px'; el.style.top=(n.y-NODE_H/2)+'px'; nodesLayer.appendChild(el); if(n.children){n.children.forEach(c=>{ const sx=n.x+el.offsetWidth-5, sy=n.y, ex=c.x+5, ey=c.y; const d=`M ${sx} ${sy} C ${sx+(ex-sx)/2} ${sy}, ${ex-(ex-sx)/2} ${ey}, ${ex} ${ey}`; const p=document.createElementNS("http://www.w3.org/2000/svg","path"); p.setAttribute("d",d); p.setAttribute("class","connection-line"); svgLayer.appendChild(p); drawNode(c); });} }
viewport.addEventListener('mousedown',e=>{isDragging=true;startX=e.clientX-mapX;startY=e.clientY-mapY;}); window.addEventListener('mousemove',e=>{if(!isDragging)return;mapX=e.clientX-startX;mapY=e.clientY-startY;updateTransform();}); window.addEventListener('mouseup',()=>{isDragging=false;}); function updateTransform(){world.style.transform=`translate(${mapX}px,${mapY}px) scale(${mapScale})`;} window.zoomMap=(d)=>{mapScale+=d;updateTransform();}, window.resetView=()=>{mapScale=0.9;mapX=100;mapY=window.innerHeight/2;updateTransform();}

// ===================== 终极试卷逻辑 =====================
window.startFinalTest = function() {
    switchReaderMode('none'); 
    finalTestView.style.display = 'block'; 
    renderFinalTest();
}

function renderFinalTest() {
    const mcC = document.getElementById('final-mc-questions');
    const clC = document.getElementById('final-cloze-questions');
    const esC = document.getElementById('final-essay-questions');
    
    // 选择题
    mcC.innerHTML = '';
    if(typeof FINAL_TEST_DATA !== 'undefined' && FINAL_TEST_DATA.mc) {
        FINAL_TEST_DATA.mc.forEach((q, i) => {
            let h = `<div class="test-q-item" id="mc-${i}"><div class="test-q-title">${i+1}. ${q.q}</div><div class="test-mc-options">`;
            q.opts.forEach((o, idx) => h+=`<label class="test-mc-label"><input type="radio" name="mc-${i}" value="${idx}"> ${o}</label>`);
            h += `</div><div class="analysis-box" id="mc-exp-${i}">${q.exp}</div></div>`;
            mcC.innerHTML += h;
        });
    }

    // 填空题
    clC.innerHTML = '';
    if(typeof FINAL_TEST_DATA !== 'undefined' && FINAL_TEST_DATA.cloze) {
        FINAL_TEST_DATA.cloze.forEach((q, i) => {
            let parts = q.q.split(/\{|\}/), h = '';
            parts.forEach((p, idx) => h += idx%2===0 ? p : `<input type="text" class="test-cloze-input" data-qid="${i}" data-ans="${p}">`);
            clC.innerHTML += `<div class="test-q-item" id="cloze-${i}"><div class="test-q-title">${i+1}. ${h}</div><div class="analysis-box" id="cloze-exp-${i}">答案：<span class="correct-answer">${q.a}</span></div></div>`;
        });
    }

    // 压轴大题 (仅渲染题目，解析隐藏)
    esC.innerHTML = '';
    if(typeof FINAL_TEST_DATA !== 'undefined' && FINAL_TEST_DATA.essay) {
        FINAL_TEST_DATA.essay.forEach((q, i) => {
            esC.innerHTML += `<div class="test-q-item"><div class="test-q-title" style="font-size:1.3rem;color:#333;">${q.title}</div><div style="padding:15px;background:#f9f9f9;margin-bottom:10px;line-height:1.6;">${q.text}</div><div class="analysis-box" id="essay-ans-${i}" style="display:none;background:#FFFDF5;border-left:4px solid #FF6B6B;">${q.ans}</div></div>`;
        });
    }
}

window.submitFinalTest = function() {
    if(!confirm("确定要提交试卷吗？")) return;
    let score = 0;
    // 批改选择
    if(FINAL_TEST_DATA.mc) FINAL_TEST_DATA.mc.forEach((q, i) => {
        let sel = -1;
        document.getElementsByName(`mc-${i}`).forEach(inp => { if(inp.checked) sel = parseInt(inp.value); });
        document.getElementById(`mc-exp-${i}`).style.display = 'block';
        if(sel === q.ans) { score += 2; document.getElementById(`mc-${i}`).style.borderLeft = "5px solid green"; }
        else document.getElementById(`mc-${i}`).style.borderLeft = "5px solid red";
    });
    // 批改填空
    if(FINAL_TEST_DATA.cloze) FINAL_TEST_DATA.cloze.forEach((q, i) => {
        const item = document.getElementById(`cloze-${i}`);
        let allCorrect = true;
        item.querySelectorAll('input').forEach(inp => {
            if(inp.value.trim() !== inp.getAttribute('data-ans')) { allCorrect = false; inp.style.color = 'red'; }
            else inp.style.color = 'green';
        });
        if(allCorrect) { score += 1; item.style.borderLeft = "5px solid green"; }
        else { item.style.borderLeft = "5px solid red"; document.getElementById(`cloze-exp-${i}`).style.display = 'block'; }
    });
    
    // 显示大题解析
    if(FINAL_TEST_DATA.essay) FINAL_TEST_DATA.essay.forEach((q,i) => document.getElementById(`essay-ans-${i}`).style.display='block');
    
    document.getElementById('test-score-panel').style.display = 'block';
    document.getElementById('final-score').innerText = score;
    document.getElementById('final-essay-section').style.display = 'block';
    document.getElementById('final-test-container').scrollTop = 0;
}
// ==========================================
// 6. 曼波整蛊逻辑 (Mambo Prank)
// ==========================================


// ==========================================
// 6. 曼波整蛊逻辑 (病毒爆发版)
// ==========================================

// 1. 鼠标碰到入口按钮：按钮消失，弹窗出现 (保持不变)
function triggerMamboTrap() {
    const btn = document.getElementById('trap-btn');
    const overlay = document.getElementById('mambo-overlay');
    btn.style.opacity = '0';
    btn.style.pointerEvents = 'none';
    setTimeout(() => { overlay.style.display = 'flex'; }, 100);
}

// 2. 【核心修改】点击“没读完”：病毒爆发 -> 3秒后进考试
function triggerMamboPhase2() {
    // 1. 隐藏提问弹窗
    document.getElementById('mambo-phase-1').style.display = 'none';
    
    // 2. 准备病毒容器 (如果没有就创建)
    let virusLayer = document.getElementById('mambo-virus-layer');
    if (!virusLayer) {
        virusLayer = document.createElement('div');
        virusLayer.id = 'mambo-virus-layer';
        document.body.appendChild(virusLayer);
    }
    virusLayer.innerHTML = ''; // 清空旧的
    virusLayer.style.display = 'block';

    // 3. 准备素材 (嘲讽图)
    // 请确保你的 assets 文件夹里有 mambo_mock.jpg
    const virusSrc = 'assets/mambo_mock.jpg'; 
    let counter = 0;

    // 4. 开启病毒生成器 (每30毫秒生成一个，极快)
    const virusInterval = setInterval(() => {
        const img = document.createElement('img');
        img.src = virusSrc;
        img.className = 'mambo-virus-item';
        
        // 随机大小 (100px - 300px)
        const size = Math.floor(Math.random() * 200) + 100;
        
        // 随机位置 (减去图片大小，防止贴边太难看)
        const x = Math.random() * (window.innerWidth - size);
        const y = Math.random() * (window.innerHeight - size);
        
        // 随机旋转 (-45度 到 45度)
        const rot = Math.floor(Math.random() * 90) - 45;
        
        // 应用样式
        img.style.width = size + 'px';
        img.style.height = size + 'px'; // 正方形
        img.style.left = x + 'px';
        img.style.top = y + 'px';
        img.style.setProperty('--rot', rot + 'deg'); // 给动画用的变量
        img.style.transform = `rotate(${rot}deg)`;   // 最终状态
        img.style.zIndex = 20000 + counter; // 越后的层级越高，堆叠效果

        virusLayer.appendChild(img);
        
        counter++;
        
        // 限制数量防止浏览器崩溃 (最多生成100个)
        if(counter > 1500) clearInterval(virusInterval);

    }, 10); // 频率：30ms

    // 5. 3秒后清理战场，进入考试
    setTimeout(() => {
        clearInterval(virusInterval);
        virusLayer.style.display = 'none'; // 隐藏病毒层
        virusLayer.innerHTML = ''; // 清空DOM
        
        document.getElementById('mambo-overlay').style.display = 'none'; // 关掉主弹窗
        
        // 恢复按钮状态 (下次还能玩)
        const btn = document.getElementById('trap-btn');
        btn.style.opacity = '1';
        btn.style.pointerEvents = 'auto';
        document.getElementById('mambo-phase-1').style.display = 'block';
        
        // 🔥 正式启动考试
        startFinalTest();
        
    }, 3000);
}
// ==========================================
// 7. 视频播放器逻辑 (Video Player)
// ==========================================
const video = document.getElementById('main-video');
const playBtn = document.getElementById('v-play-btn');
const seekbar = document.getElementById('video-seekbar');
const timeDisplay = document.getElementById('v-time');

// 播放/暂停切换
window.togglePlay = function() {
    if (video.paused) {
        video.play();
        playBtn.innerText = "⏸ 暂停";
    } else {
        video.pause();
        playBtn.innerText = "▶ 播放";
    }
}

// 跳跃时间 (+/- 15s)
window.videoSkip = function(seconds) {
    video.currentTime += seconds;
}

// 改变倍速
window.changeSpeed = function(el) {
    video.playbackRate = parseFloat(el.value);
}

// 更新进度条和时间显示
video.addEventListener('timeupdate', () => {
    const current = video.currentTime;
    const duration = video.duration || 0;
    
    // 更新滑块位置
    seekbar.value = (current / duration) * 100;
    
    // 更新时间文字 00:00 / 00:00
    timeDisplay.innerText = `${formatTime(current)} / ${formatTime(duration)}`;
});

// 拖动进度条
seekbar.addEventListener('input', () => {
    const time = (seekbar.value / 100) * video.duration;
    video.currentTime = time;
});

// 格式化时间函数 (秒 -> mm:ss)
function formatTime(s) {
    const min = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

// 视频加载元数据后初始化进度条
video.addEventListener('loadedmetadata', () => {
    timeDisplay.innerText = `00:00 / ${formatTime(video.duration)}`;
});
// --- 启动引擎 ---
function startGravity() {
    const gc = document.getElementById('gravity-canvas');
    if (!gc) return console.error("找不到画布！");
    const gctx = gc.getContext('2d');
    
    gWidth = gc.width = window.innerWidth - 260; 
    gHeight = gc.height = window.innerHeight;
    
    // 初始化人物 (GRAVITY_CONFIG 见上一个回答的数据)
    gNodes = GRAVITY_CONFIG.nodes.map(n => ({ 
        ...n, x: Math.random() * gWidth, y: Math.random() * gHeight, vx: 0, vy: 0 
    }));
    
    gLinks = GRAVITY_CONFIG.links.map(l => ({ 
        source: gNodes.find(n => n.id === l.s), target: gNodes.find(n => n.id === l.t) 
    }));

    if (!gAnimationId) updateGravity();
}

// --- 核心渲染循环 (精准结构) ---
function updateGravity() {
    const gc = document.getElementById('gravity-canvas');
    if (!gc) return;
    const gctx = gc.getContext('2d');
    
    // 1. 清屏 (黑色半透明实现荧光拖尾)
    gctx.fillStyle = "rgba(0, 0, 0, 0.2)"; 
    gctx.fillRect(0, 0, gWidth, gHeight);

    // 2. 物理碰撞与引力计算 (略, 保持之前的逻辑即可)
    const damping = 0.9;

    // 3. 绘制流水线
    gNodes.forEach(n => {
        // 更新位置
        if (n !== gDraggingNode) {
            n.vx *= damping; n.vy *= damping;
            n.x += n.vx; n.y += n.vy;
            if (n.x < n.r || n.x > gWidth - n.r) n.vx *= -1;
            if (n.y < n.r || n.y > gHeight - n.r) n.vy *= -1;
        }

        // 悬停检测
        const isHover = Math.sqrt((lastMouseX - n.x)**2 + (lastMouseY - n.y)**2) < n.r;
        const r = isHover ? n.r * 1.3 : n.r;

        // 绘制荧光 (Neon Glow)
        const grad = gctx.createRadialGradient(n.x, n.y, r*0.2, n.x, n.y, r*1.5);
        grad.addColorStop(0, n.color);
        grad.addColorStop(1, "transparent");
        
        gctx.beginPath();
        gctx.arc(n.x, n.y, r * 1.5, 0, Math.PI * 2);
        gctx.fillStyle = grad;
        gctx.fill();

        // 绘制中心点
        gctx.beginPath();
        gctx.arc(n.x, n.y, r * 0.4, 0, Math.PI * 2);
        gctx.fillStyle = "#fff";
        gctx.fill();

        // 绘制姓名 (常驻标签)
        gctx.fillStyle = "#fff";
        gctx.font = `bold ${isHover ? 18 : 14}px sans-serif`;
        gctx.textAlign = "center";
        gctx.fillText(n.id, n.x, n.y + r + 20);

        if (isHover) {
            gctx.fillStyle = "rgba(255, 255, 255, 0.8)";
            gctx.fillText(n.desc, n.x, n.y - r - 20);
        }
    });

    // 4. 递归申请下一帧
    gAnimationId = requestAnimationFrame(updateGravity);
}
// ==========================================================================
// 8. 荧光人物引力场 (Neon Character Gravity Engine)
// ==========================================================================

// --- A. 核心数据配置 ---
// 包含《朝花夕拾》中的核心人物及其特征描述
const GRAVITY_CONFIG = {
    nodes: [
        { id: "鲁迅", color: "#FF0055", r: 45, desc: "清醒的观察者与回忆者" },
        { id: "阿长", color: "#FFE600", r: 35, desc: "卑微身份下包含着神力的守护" },
        { id: "藤野", color: "#00CCFF", r: 38, desc: "跨越国界的严谨与博爱" },
        { id: "范爱农", color: "#CC00FF", r: 32, desc: "黑暗时代落魄知识分子的悲歌" },
        { id: "父亲", color: "#00FF66", r: 32, desc: "封建父权的威严与病榻的无奈" },
        { id: "衍太太", color: "#AAAAAA", r: 28, desc: "口蜜腹剑的市侩与伪善" },
        { id: "寿镜吾", color: "#FF9900", r: 30, desc: "极方正质朴博学的旧式恩师" },
        { id: "无常", color: "#00FFFF", r: 30, desc: "阴间里最有公理的人情鬼" }
    ],
    links: [
        { s: "鲁迅", t: "阿长" }, { s: "鲁迅", t: "藤野" },
        { s: "鲁迅", t: "范爱农" }, { s: "鲁迅", t: "父亲" },
        { s: "鲁迅", t: "衍太太" }, { s: "鲁迅", t: "寿镜吾" },
        { s: "鲁迅", t: "无常" }, { s: "阿长", t: "鲁迅" }
    ]
};

// --- B. 引擎初始化与启动 ---
function startGravity() {
    const gc = document.getElementById('gravity-canvas');
    if (!gc) return;
    const gctx = gc.getContext('2d');
    
    // 动态适配画布大小（减去侧边栏宽度）
    gWidth = gc.width = window.innerWidth - 260; 
    gHeight = gc.height = window.innerHeight;
    
    // 初始化节点位置与速度
    gNodes = GRAVITY_CONFIG.nodes.map(n => ({
        ...n, 
        x: Math.random() * gWidth, 
        y: Math.random() * gHeight, 
        vx: 0, vy: 0
    }));
    
    // 映射连线关系
    gLinks = GRAVITY_CONFIG.links.map(l => ({
        source: gNodes.find(n => n.id === l.s),
        target: gNodes.find(n => n.id === l.t)
    }));

    // 启动动画循环
    if (!gAnimationId) updateGravity();
    
    // 绑定交互事件
    gc.addEventListener('mousedown', gOnDown);
    window.addEventListener('mousemove', gOnMove);
    window.addEventListener('mouseup', gOnUp);
}

// 停止引擎（切换模式时调用，节省性能）
function stopGravity() {
    if (gAnimationId) {
        cancelAnimationFrame(gAnimationId);
        gAnimationId = null;
    }
}

// --- C. 核心渲染与物理计算循环 ---
function updateGravity() {
    const gc = document.getElementById('gravity-canvas');
    if (!gc) return;
    const gctx = gc.getContext('2d');
    
    // 1. 绘制黑色背景并保留透明度，实现荧光拖尾效果
    gctx.fillStyle = "rgba(0, 0, 0, 0.2)"; 
    gctx.fillRect(0, 0, gWidth, gHeight);

    const k = 0.05;         // 弹力系数
    const repulsion = 8000; // 斥力系数
    const damping = 0.9;    // 物理阻尼（摩擦力）

    // 2. 物理计算：全员斥力
    for(let i=0; i<gNodes.length; i++){
        for(let j=i+1; j<gNodes.length; j++){
            const a = gNodes[i], b = gNodes[j];
            const dx = a.x - b.x, dy = a.y - b.y;
            const dist = Math.sqrt(dx*dx + dy*dy) || 1;
            if(dist < 400) {
                const force = repulsion / (dist * dist);
                const fx = (dx/dist) * force, fy = (dy/dist) * force;
                if(a !== gDraggingNode) { a.vx += fx; a.vy += fy; }
                if(b !== gDraggingNode) { b.vx -= fx; b.vy -= fy; }
            }
        }
    }

    // 3. 物理计算：连线引力
    gLinks.forEach(l => {
        const dx = l.target.x - l.source.x, dy = l.target.y - l.source.y;
        const dist = Math.sqrt(dx*dx + dy*dy) || 1;
        const force = (dist - 200) * k; 
        const fx = (dx/dist) * force, fy = (dy/dist) * force;
        if(l.source !== gDraggingNode) { l.source.vx += fx; l.source.vy += fy; }
        if(l.target !== gDraggingNode) { l.target.vx -= fx; l.target.vy -= fy; }
    });

    // 4. 渲染节点流水线
    gNodes.forEach(n => {
        // 更新位置（非拖拽状态）
        if(n !== gDraggingNode) {
            n.vx *= damping; n.vy *= damping;
            n.x += n.vx; n.y += n.vy;
            // 边界弹性反弹
            if(n.x < n.r || n.x > gWidth - n.r) n.vx *= -1;
            if(n.y < n.r || n.y > gHeight - n.r) n.vy *= -1;
        }

        // 动态检测鼠标悬停
        const distToMouse = Math.sqrt((lastMouseX - n.x)**2 + (lastMouseY - n.y)**2);
        const isHover = distToMouse < n.r;
        const displayR = isHover ? n.r * 1.3 : n.r;

        // A. 绘制荧光光晕
        const grad = gctx.createRadialGradient(n.x, n.y, displayR*0.2, n.x, n.y, displayR*1.5);
        grad.addColorStop(0, n.color);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        
        gctx.beginPath();
        gctx.arc(n.x, n.y, displayR*1.5, 0, Math.PI*2);
        gctx.fillStyle = grad;
        gctx.fill();

        // B. 绘制核心球体
        gctx.beginPath();
        gctx.arc(n.x, n.y, displayR*0.4, 0, Math.PI*2);
        gctx.fillStyle = "#fff";
        gctx.fill();

        // C. 绘制姓名标签
        gctx.fillStyle = "#fff";
        gctx.font = `bold ${isHover ? 18 : 14}px sans-serif`;
        gctx.textAlign = "center";
        gctx.fillText(n.id, n.x, n.y + displayR + 25);

        // D. 绘制人物灵魂描述（仅悬停显示）
        if(isHover) {
            gctx.fillStyle = "rgba(255, 255, 255, 0.8)";
            gctx.font = "14px sans-serif";
            gctx.fillText(n.desc, n.x, n.y - displayR - 20);
        }
    });

    // 申请下一帧动画
    gAnimationId = requestAnimationFrame(updateGravity);
}

// --- D. 鼠标交互逻辑 ---
function gOnDown(e) {
    const rect = document.getElementById('gravity-canvas').getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    gNodes.forEach(n => {
        const dist = Math.sqrt((mx-n.x)**2 + (my-n.y)**2);
        if(dist < n.r) gDraggingNode = n;
    });
}

function gOnMove(e) {
    const gc = document.getElementById('gravity-canvas');
    if(!gc) return;
    const rect = gc.getBoundingClientRect();
    lastMouseX = e.clientX - rect.left;
    lastMouseY = e.clientY - rect.top;

    if(gDraggingNode) {
        gDraggingNode.x = lastMouseX;
        gDraggingNode.y = lastMouseY;
        gDraggingNode.vx = 0; gDraggingNode.vy = 0;
    }
}

function gOnUp() { gDraggingNode = null; }