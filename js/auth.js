(function() {
    // ================= 配置区 =================
    const SUPABASE_URL = 'https://hcjfovtvlwpfitoklxyr.supabase.co'; 
    const SUPABASE_KEY = 'sb_publishable_dR_d0us1TiHY8OUCjnr1Dw_oMlgKpuO';
    // =========================================

    let authClient = null;
    let tempEmail = ""; // 临时存一下邮箱

    if (typeof supabase !== 'undefined') {
        authClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }

    // 1. 彻底修复：初始化状态检查
    // 很多时候页面刷新了但JS变量还在，导致假登录。这里强制查一遍。
    checkSession();

    async function checkSession() {
        if (!authClient) return;
        const { data } = await authClient.auth.getSession();
        updateUserUI(data.session?.user);
        
        // 监听后续变化
        authClient.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT') updateUserUI(null);
            else updateUserUI(session?.user);
        });
    }

    // ================= 功能 A：发送验证码 =================
    window.sendVerifyCode = async function() {
        const email = document.getElementById('reg-email').value;
        if (!email || !email.includes('@')) return alert("请输入正确的 QQ 邮箱！");

        const btn = document.getElementById('btn-send-code');
        
        // 倒计时逻辑
        let timeLeft = 60;
        btn.disabled = true;
        btn.innerText = "发送中...";

        // 【黑科技】使用临时密码偷偷注册
        // 为什么？因为Supabase注册必须有密码。我们先随机生成一个，等会儿让用户改。
        const tempPassword = "TempPass_" + Math.random().toString(36).slice(-8);

        const { data, error } = await authClient.auth.signUp({
            email: email,
            password: tempPassword // 这是一个用户不知道的密码
        });

        if (error) {
            console.error(error);
            btn.disabled = false; btn.innerText = "发送验证码";
            
            if(error.message.includes("already")) {
                alert("这个邮箱注册过了！请直接去登录。");
                switchTab('login');
            } else {
                alert("发送失败: " + error.message);
            }
        } else {
            alert("✅ 验证码已发送到 QQ 邮箱！");
            tempEmail = email; // 记住这个邮箱
            
            // 显示验证码输入框
            document.getElementById('group-code').style.display = 'block';
            document.getElementById('reg-email').disabled = true; // 锁定邮箱

            // 倒计时开始
            const timer = setInterval(() => {
                timeLeft--;
                btn.innerText = `${timeLeft}秒后重发`;
                if (timeLeft <= 0) {
                    clearInterval(timer);
                    btn.disabled = false;
                    btn.innerText = "重新发送";
                }
            }, 1000);
        }
    };

    // ================= 功能 B：验证代码并进入下一步 =================
   window.verifyCodeAndNext = async function() {
    const code = document.getElementById('reg-code').value;
    // 适配你的 8 位后台设置
    if (!code || code.length < 8) return alert("验证码为 8 位，请检查邮件");

    console.log("🔐 正在验证 8 位 OTP:", code);
    // ... 后面的代码保持不变

        // 验证 OTP
        const { data, error } = await authClient.auth.verifyOtp({
            email: tempEmail,
            token: code,
            type: 'signup'
        });

        if (error) {
            alert("❌ 验证码错误或已过期！");
        } else {
            // 验证成功！Supabase 会自动登录
            // 现在我们要切换到“设置密码”界面
            document.getElementById('reg-step-1').style.display = 'none';
            document.getElementById('reg-step-2').style.display = 'block';
        }
    };

    // ================= 功能 C：同步信息到 Profiles 表 =================
    window.setUserInfoAndFinish = async function() {
        const nick = document.getElementById('reg-nick').value;
        const p1 = document.getElementById('reg-pass-1').value;
        const p2 = document.getElementById('reg-pass-2').value;

        // 1. 各种检查
        if (!nick) return alert("请输入username");
        if (p1.length < 6) return alert("密码的长度需不少于六位");
        if (p1 !== p2) return alert("密码二次验证错误，请再次检查");

        const btn = document.querySelector('#reg-step-2 button');
        btn.innerText = "正在存档..."; btn.disabled = true;

        try {
            // 2. 先更新 Auth 表 (修改密码)
            const { error: passError } = await authClient.auth.updateUser({ password: p1 });
            if (passError) throw passError;

            // 3. 获取当前用户的 ID (胶水层)
            // 因为之前验证码通过时，Supabase 已经自动帮我们登录了，所以现在能取到 user
            const { data: { user } } = await authClient.auth.getUser();

            if (user) {
                console.log("正在同步数据, 用户ID:", user.id);
                
                // 4. 【核心一步】写入 Profiles 表
                // upsert 的意思是：如果有就更新，没就插入 (防重复报错)
                const { error: profileError } = await authClient
                    .from('profiles')
                    .upsert([
                        { 
                            id: user.id,         // 必须和 Auth 表的 ID 一样
                            username: nick,      // 存入刚才填的昵称
                            updated_at: new Date()
                        }
                    ]);

                if (profileError) {
                    console.error("Profile写入失败:", profileError);
                    alert("账号建好了，但名字没存进去。可能是 RLS 权限问题！");
                } else {
                    alert("🎉 注册成功！欢迎加入！");
                    closeAuthModal();
                    location.reload(); // 刷新网页，让新名字显示出来
                }
            }

        } catch (err) {
            console.error(err);
            alert("出错了: " + err.message);
            btn.innerText = "重试"; btn.disabled = false;
        }
    };

    // ================= 登录逻辑 =================
    window.doLogin = async function() {
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-pass').value;
        
        const { error } = await authClient.auth.signInWithPassword({ email, password: pass });
        if (error) alert("登录失败：" + error.message);
        else closeAuthModal();
    };

    // ================= 辅助逻辑 =================
    window.switchTab = function(tab) {
        document.getElementById('tab-login').className = tab==='login'?'active-tab':'';
        document.getElementById('tab-register').className = tab==='register'?'active-tab':'';
        document.getElementById('panel-login').style.display = tab==='login'?'block':'none';
        document.getElementById('panel-register').style.display = tab==='register'?'block':'none';
    }
    window.openAuthModal = () => document.getElementById('auth-overlay').style.display = 'flex';
    window.closeAuthModal = () => document.getElementById('auth-overlay').style.display = 'none';
    
    // UI 更新
    window.doLogout = async () => { await authClient.auth.signOut(); location.reload(); };
    function updateUserUI(user) {
        const el = document.getElementById('sidebar-user-area');
        if (!el) return;
        if (user) {
            el.innerHTML = `<div class="user-card logged-in" style="border-color:#B5EAD7"><div class="user-avatar" style="background:#B5EAD7">👤</div><div class="user-info"><div class="user-name">已登录</div><div onclick="doLogout()" class="logout-btn">退出</div></div></div>`;
        } else {
            el.innerHTML = `<div class="user-card" onclick="openAuthModal()"><div class="user-avatar">?</div><div class="user-info"><div class="user-name">点击登录</div></div></div>`;
        }
    }
})();