(function() {
    console.log("✅ 最终版 Auth.js 已加载");

    // ================= 配置区 =================
    const SUPABASE_URL = 'https://hcjfovtvlwpfitoklxyr.supabase.co'; 
    const SUPABASE_KEY = 'sb_publishable_dR_d0us1TiHY8OUCjnr1Dw_oMlgKpuO';
    // =========================================

    let authClient = null;

    if (typeof supabase !== 'undefined') {
        authClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }

    // 1. 初始化
    checkSession();

    // ============================================================
    // 🔥 暴力监听修复版：专门适配新的“底部大按钮”
    // ============================================================
    document.addEventListener('click', function(e) {
        // 1. 查找是否点击了 .dock-btn (那两个大按钮)
        const btn = e.target.closest('.dock-btn');
        
        // 2. 如果没点到按钮，再看看是不是点的登录大卡片
        const loginDock = e.target.closest('.user-dock');

        // --- 逻辑分支 ---
        
        // A. 如果点击的是【退出】按钮
        if (btn && btn.classList.contains('logout')) {
            e.stopPropagation(); // 防止冒泡
            window.doLogout();
            return;
        }

        // B. 如果点击的是【档案】按钮
        if (btn && !btn.classList.contains('logout')) {
            e.stopPropagation();
            console.log("👆 点击了档案按钮");
            openProfileModal();
            return;
        }

        // C. 如果未登录，点击整个区域触发登录
        // (判断依据：没有 dock-btn 的话，说明是未登录状态的那个大按钮)
        if (loginDock && !loginDock.querySelector('.dock-btn')) {
            console.log("👆 点击了登录区域");
            window.openAuthModal();
        }
    });

    // 监听文件选择（头像预览）
    document.addEventListener('change', e => {
        if (e.target.id === 'avatar-input' && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.type !== "image/jpeg") return alert("必须是 JPG 格式！");
            const reader = new FileReader();
            reader.onload = (evt) => {
                const preview = document.getElementById('profile-avatar-preview');
                if(preview) preview.innerHTML = `<img src="${evt.target.result}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
            };
            reader.readAsDataURL(file);
        }
    });

    async function checkSession() {
        if (!authClient) return;
        const { data } = await authClient.auth.getSession();
        updateUserUI(data.session?.user);
        
        authClient.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT') updateUserUI(null);
            else updateUserUI(session?.user);
        });
    }

    // ================= UI 更新 (适配新布局) =================
    async function updateUserUI(user) {
        const el = document.getElementById('sidebar-user-area');
        if (!el) return;

        if (user) {
            // 加载中
            if (!el.innerHTML.includes('dock-header')) {
               el.innerHTML = `
               <div class="user-dock">
                   <div style="padding:20px; color:#999;">读取中...</div>
               </div>`;
            }

            let displayName = "书友";
            let avatarHtml = "";
            let firstChar = "书";

            try {
                const { data } = await authClient.from('profiles').select('username, avatar_url').eq('id', user.id).single();
                if (data) {
                    if (data.username) displayName = data.username;
                    // 加上时间戳防止缓存
                    if (data.avatar_url) avatarHtml = `<img src="${data.avatar_url}?t=${Date.now()}">`;
                } else {
                    displayName = user.email.split('@')[0];
                }
            } catch (e) {}

            if (!avatarHtml) {
                firstChar = displayName.charAt(0).toUpperCase();
                avatarHtml = firstChar; // 如果没有图，显示文字
            }

            // 渲染：注意这里不再写 onclick，全靠上面的 addEventListener
            el.innerHTML = `
                <div class="user-dock">
                    <div class="dock-header">
                        <div class="user-avatar" style="background:#B5EAD7;">${avatarHtml}</div>
                        <div class="dock-name">${escapeHtml(displayName)}</div>
                    </div>
                    <div class="dock-actions">
                        <div class="dock-btn">⚙️ 档案</div>
                        <div class="dock-btn logout">🚪 退出</div>
                    </div>
                </div>`;
            
            if (window.justLoggedIn) {
                showLoginSuccessModal(displayName);
                window.justLoggedIn = false;
            }
        } else {
            // 未登录
            el.innerHTML = `
                <div class="user-dock" style="cursor:pointer; background:#B5EAD7;">
                    <div style="font-size:1.2rem; font-weight:bold; color:#2c2c2c; padding:10px;">
                        👋 点击登录
                    </div>
                </div>`;
        }
    }

    // ================= 🌍 全局功能函数 =================
    
    // 打开档案弹窗
    window.openProfileModal = async function() {
        const { data: { user } } = await authClient.auth.getUser();
        if (!user) return window.openAuthModal();

        const modal = document.getElementById('profile-modal');
        if (modal) modal.style.display = 'flex';

        // 填数据
        const { data } = await authClient.from('profiles').select('*').eq('id', user.id).single();
        if (data) {
            document.getElementById('edit-username').value = data.username || "";
            const preview = document.getElementById('profile-avatar-preview');
            // 预览图也加时间戳
            if (data.avatar_url) preview.innerHTML = `<img src="${data.avatar_url}?t=${Date.now()}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
            else preview.innerHTML = (data.username || "书").charAt(0);
        }
    };

    // 保存资料
    window.saveProfileChanges = async function() {
        const { data: { user } } = await authClient.auth.getUser();
        const newName = document.getElementById('edit-username').value;
        const newPass = document.getElementById('edit-password').value;
        const file = document.getElementById('avatar-input').files[0];
        const btn = document.querySelector('#profile-modal button');
        
        btn.innerText = "同步中..."; btn.disabled = true;
        let updates = { id: user.id, username: newName, updated_at: new Date() };

        try {
            if (file) {
                const fileName = `${user.id}-${Date.now()}.jpg`;
                const { error: upErr } = await authClient.storage.from('avatars').upload(fileName, file, { upsert: true });
                if (upErr) throw upErr;
                const { data: { publicUrl } } = authClient.storage.from('avatars').getPublicUrl(fileName);
                updates.avatar_url = publicUrl;
            }

            const { error: dbErr } = await authClient.from('profiles').upsert(updates);
            if (dbErr) throw dbErr;

            if (newPass && newPass.length >= 6) {
                const { error: pErr } = await authClient.auth.updateUser({ password: newPass });
                if (pErr) throw pErr;
            }

            alert("✨ 同步成功！");
            document.getElementById('profile-modal').style.display = 'none';
            // 强制重新加载 UI，不刷新页面
            updateUserUI(user);
            
        } catch (err) {
            alert("失败: " + err.message);
        } finally {
            btn.innerText = "同步记忆"; btn.disabled = false;
        }
    };

    // 其他原有函数
    window.closeProfileModal = () => document.getElementById('profile-modal').style.display = 'none';
    
    window.doLogout = async () => { 
        await authClient.auth.signOut(); 
        location.reload(); 
    };

    // 登录注册逻辑保持不变...
    window.sendVerifyCode = async function() { 
        const email = document.getElementById('reg-email').value;
        if (!email) return alert("填邮箱！");
        const btn = document.getElementById('btn-send-code');
        btn.innerText = "发送中...";
        const { error } = await authClient.auth.signUp({ email, password: "TempPassword123!" });
        if (error && !error.message.includes("already")) return alert(error.message);
        alert("验证码已发送！");
        document.getElementById('group-code').style.display = 'block';
    };
    
    window.verifyCodeAndNext = async function() {
        const code = document.getElementById('reg-code').value;
        const email = document.getElementById('reg-email').value;
        const { error } = await authClient.auth.verifyOtp({ email, token: code, type: 'signup' });
        if (error) alert("验证码错误");
        else { document.getElementById('reg-step-1').style.display = 'none'; document.getElementById('reg-step-2').style.display = 'block'; }
    };
    
    window.setUserInfoAndFinish = async function() {
        const nick = document.getElementById('reg-nick').value;
        const p1 = document.getElementById('reg-pass-1').value;
        await authClient.auth.updateUser({ password: p1 });
        const { data: { user } } = await authClient.auth.getUser();
        await authClient.from('profiles').upsert([{ id: user.id, username: nick }]);
        window.justLoggedIn = true; window.closeAuthModal(); updateUserUI(user);
    };
    
    window.switchTab = (t) => {
        document.getElementById('tab-login').className = t==='login'?'active-tab':'';
        document.getElementById('tab-register').className = t==='register'?'active-tab':'';
        document.getElementById('panel-login').style.display = t==='login'?'block':'none';
        document.getElementById('panel-register').style.display = t==='register'?'block':'none';
    };
    
    window.openAuthModal = () => document.getElementById('auth-overlay').style.display = 'flex';
    window.closeAuthModal = () => document.getElementById('auth-overlay').style.display = 'none';
    
    window.doLogin = async () => {
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-pass').value;
        const { error } = await authClient.auth.signInWithPassword({ email, password: pass });
        if (error) alert(error.message);
        else { window.justLoggedIn = true; closeAuthModal(); }
    };
    
    function showLoginSuccessModal(name) {
        const modal = document.getElementById('login-success-modal');
        if(modal) {
            document.getElementById('welcome-name').innerText = name;
            modal.style.display = 'flex';
            setTimeout(() => modal.style.display = 'none', 1500);
        }
    }
    
    function escapeHtml(text) { return text ? text.replace(/</g, "&lt;") : ""; }
})();
