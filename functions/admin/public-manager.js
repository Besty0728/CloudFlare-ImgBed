export async function onRequest(context) {
    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ImgBed 公开访问管理 (Secure)</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            max-width: 600px;
            margin: 2rem auto;
            padding: 0 1rem;
            background-color: #f5f7fa;
            color: #2c3e50;
        }
        .container {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 2px 12px 0 rgba(0,0,0,0.1);
            border-top: 4px solid #67c23a;
        }
        h1 { margin-top: 0; color: #2c3e50; font-size: 1.5rem; }
        .badge {
            display: inline-block;
            padding: 2px 8px;
            background: #e1f3d8;
            color: #67c23a;
            border-radius: 4px;
            font-size: 0.8rem;
            vertical-align: middle;
            margin-left: 8px;
        }
        .form-group { margin-bottom: 1.5rem; }
        label { display: block; margin-bottom: 0.5rem; font-weight: bold; }
        input {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #dcdfe6;
            border-radius: 4px;
            box-sizing: border-box;
            font-size: 1rem;
        }
        input:focus { border-color: #409eff; outline: none; }
        .btn-group { display: flex; gap: 1rem; }
        button {
            flex: 1;
            padding: 0.75rem;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 1rem;
            font-weight: 500;
            transition: opacity 0.2s;
        }
        button:hover { opacity: 0.9; }
        button:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-public { background-color: #67c23a; color: white; }
        .btn-private { background-color: #909399; color: white; }
        #status { margin-top: 1.5rem; padding: 1rem; border-radius: 4px; display: none; }
        .success { background-color: #f0f9eb; color: #67c23a; }
        .error { background-color: #fef0f0; color: #f56c6c; }
        .help-text { font-size: 0.85rem; color: #909399; margin-top: 0.5rem; }
    </style>
</head>
<body>
    <div class="container">
        <h1>公开访问文件管理 <span class="badge">已加密</span></h1>
        
        <div class="form-group">
            <label>文件路径 (Path) 或 ID</label>
            <input type="text" id="filePath" placeholder="例如: CF/123.jpg">
            <div class="help-text">
                无需再次输入密码，已复用您的登录凭证。
                <br>请复制 Dashboard 图片链接中的路径部分。
            </div>
        </div>

        <div class="btn-group">
            <button onclick="setAccess(true)" class="btn-public">设为公开 (Public)</button>
            <button onclick="setAccess(false)" class="btn-private">设为私有 (Private)</button>
        </div>

        <div id="status"></div>
    </div>

    <script>
        const API_BASE = '/api/manage';

        async function setAccess(isPublic) {
            const filePath = document.getElementById('filePath').value.trim();
            const statusEl = document.getElementById('status');
            
            if (!filePath) {
                showStatus('请输入文件路径', 'error');
                return;
            }

            showStatus('处理中...', 'info');

            try {
                const endpoint = isPublic ? 'public' : 'unpublic';
                
                // 直接发起请求，浏览器会自动附带当前会话的 Basic Auth 凭证
                const response = await fetch(\`\${API_BASE}/\${endpoint}/\${encodeURIComponent(filePath)}\`, {
                    method: 'POST'
                });

                if (response.ok) {
                    showStatus(
                        isPublic ? '✅ 成功！文件现已公开访问。' : '🔒 成功！文件已恢复为私有状态。',
                        'success'
                    );
                } else if (response.status === 401) {
                    showStatus('❌ 认证失效，请刷新页面重新登录', 'error');
                } else {
                    const text = await response.text();
                    showStatus(\`❌ 失败: \${response.status} \${text}\`, 'error');
                }
            } catch (err) {
                console.error(err);
                showStatus(\`❌ 网络错误: \${err.message}\`, 'error');
            }
        }

        function showStatus(text, type) {
            const el = document.getElementById('status');
            el.style.display = 'block';
            el.className = type === 'info' ? '' : type;
            el.style.backgroundColor = type === 'info' ? '#ecf5ff' : null;
            el.style.color = type === 'info' ? '#409eff' : null;
            el.textContent = text;
        }
    </script>
</body>
</html>
    `;

    return new Response(html, {
        headers: {
            'Content-Type': 'text/html;charset=UTF-8'
        }
    });
}
