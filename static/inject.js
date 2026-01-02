(function () {
    'use strict';

    // 配置
    const CONFIG = {
        apiBase: '/api/manage',
        checkInterval: 1000,
        btnClass: 'el-button el-button--primary el-button--small is-plain',
        authStorageKey: 'imgbed_admin_auth'
    };

    console.log('ImgBed Public Access Injector Loaded');

    // 监听 DOM 变化
    const observer = new MutationObserver((mutations) => {
        // 检查是否有表格行增加
        const rows = document.querySelectorAll('.el-table__body-wrapper .el-table__row');
        if (rows.length > 0) {
            processRows(rows);
        }
    });

    // 开始观察
    function startObserver() {
        const app = document.getElementById('app');
        if (app) {
            observer.observe(app, {
                childList: true,
                subtree: true
            });
            console.log('Observer started');
        } else {
            setTimeout(startObserver, 500);
        }
    }

    // 处理表格行
    function processRows(rows) {
        rows.forEach(row => {
            // 避免重复处理
            if (row.dataset.publicInjected === 'true') return;

            // 1. 获取文件 ID
            // 通常在第一列或第二列有图片预览
            const img = row.querySelector('img');
            let fileId = null;

            if (img && img.src) {
                // src format: /file/CF/123.jpg?from=admin
                const match = img.src.match(/\/file\/(.+)\?from=admin/);
                if (match) {
                    fileId = decodeURIComponent(match[1]);
                }
            }

            // 如果没找到 img，尝试从文件名 cell 获取 (通常是第一个含有 text 的 cell)
            if (!fileId) {
                // 暂时仅支持从图片获取
                return;
            }

            // 2. 找到操作列 (通常是最后一列)
            const cells = row.querySelectorAll('.el-table__cell');
            if (cells.length === 0) return;
            const actionCell = cells[cells.length - 1];
            const actionContainer = actionCell.querySelector('.cell');

            if (actionContainer) {
                // 创建"设为公开"按钮
                const publicBtn = document.createElement('button');
                publicBtn.className = CONFIG.btnClass; // 复用 Element Plus 样式
                publicBtn.innerText = '公开';
                publicBtn.style.marginLeft = '10px';
                publicBtn.title = '设为公开访问';

                // 创建"取消"按钮
                const unpublicBtn = document.createElement('button');
                unpublicBtn.className = 'el-button el-button--info el-button--small is-plain';
                unpublicBtn.innerText = '私有';
                unpublicBtn.style.marginLeft = '5px';
                unpublicBtn.title = '取消公开访问';

                const handleAction = async (isPublic) => {
                    const actionName = isPublic ? '公开' : '私有';
                    if (!confirm(`确定要将此文件设为"${actionName}"吗？`)) return;

                    const btn = isPublic ? publicBtn : unpublicBtn;
                    const originalText = btn.innerText;

                    try {
                        btn.disabled = true;
                        btn.innerText = '...';

                        const authHeader = getAuthHeader();
                        if (!authHeader) {
                            // 提示输入密码
                            const input = prompt("请输入管理员用户名和密码 (格式: username:password)：");
                            if (!input || !input.includes(':')) {
                                alert("格式错误或取消操作");
                                btn.innerText = originalText;
                                btn.disabled = false;
                                return;
                            }
                            // 保存并重试
                            const [u, p] = input.split(':');
                            const token = btoa(`${u}:${p}`);
                            localStorage.setItem(CONFIG.authStorageKey, token);
                            return handleAction(isPublic); // 递归重试
                        }

                        const endpoint = isPublic ? 'public' : 'unpublic';
                        const response = await fetch(`${CONFIG.apiBase}/${endpoint}/${fileId}`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Basic ${authHeader}`
                            }
                        });

                        if (response.ok) {
                            alert(`设置成功：文件已${actionName}`);
                            if (isPublic) {
                                publicBtn.classList.add('el-button--success');
                                publicBtn.innerText = '已公开';
                                unpublicBtn.innerText = '私有';
                            } else {
                                publicBtn.classList.remove('el-button--success');
                                publicBtn.innerText = '公开';
                                unpublicBtn.innerText = '已私有';
                            }
                        } else {
                            if (response.status === 401) {
                                localStorage.removeItem(CONFIG.authStorageKey); // 清除无效凭证
                                alert("认证失败，请重试");
                            } else {
                                alert('操作失败: ' + await response.text());
                            }
                            btn.innerText = originalText;
                        }
                    } catch (err) {
                        console.error(err);
                        alert('网络错误');
                        btn.innerText = originalText;
                    } finally {
                        btn.disabled = false;
                    }
                };

                publicBtn.onclick = (e) => { e.stopPropagation(); handleAction(true); };
                unpublicBtn.onclick = (e) => { e.stopPropagation(); handleAction(false); };

                // 插入按钮
                actionContainer.appendChild(publicBtn);
                actionContainer.appendChild(unpublicBtn);

                // 标记已处理
                row.dataset.publicInjected = 'true';
            }
        });
    }

    // 获取认证信息
    function getAuthHeader() {
        return localStorage.getItem(CONFIG.authStorageKey);
    }

    // 启动
    startObserver();

})();
