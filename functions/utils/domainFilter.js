/**
 * 自定义域名过滤中间件
 * 独立文件，避免与上游更新冲突
 * 
 * 使用方法：在需要域名过滤的 _middleware.js 中引入
 * import { domainFilterMiddleware } from '../utils/domainFilter';
 * export const onRequest = [domainFilterMiddleware, ...其他中间件];
 */

import { fetchSecurityConfig } from './sysConfig';

/**
 * 检查请求域名是否在允许列表中
 * @param {Request} request - 请求对象
 * @param {Object} securityConfig - 安全配置
 * @param {URL} url - 请求URL
 * @returns {boolean} 是否允许访问
 */
function isDomainAllowed(request, securityConfig, url) {
    const Referer = request.headers.get('Referer');
    const allowedDomains = securityConfig.access?.allowedDomains || '';

    // 如果没有配置放行域名，默认全部放行
    if (!allowedDomains || allowedDomains.trim() === '') {
        return true;
    }

    // 如果没有 Referer，根据配置决定是否放行
    // 注意：这里默认放行无 Referer 的请求，与原逻辑保持一致
    // 如果你想要更严格的限制，可以改为 return false;
    if (!Referer) {
        return true;
    }

    try {
        const refererUrl = new URL(Referer);
        const domains = allowedDomains.split(',').map(d => d.trim()).filter(d => d);
        
        // 自动把自身域名加入白名单
        domains.push(url.hostname);

        // 检查是否匹配任一允许的域名（支持子域名匹配）
        const isAllowed = domains.some(domain => {
            // 使用 replaceAll 完整转义所有点，修复原代码的 bug
            const escapedDomain = domain.replaceAll('.', '\\.');
            const domainPattern = new RegExp(`(^|\\.)${escapedDomain}$`, 'i');
            return domainPattern.test(refererUrl.hostname);
        });

        return isAllowed;
    } catch (e) {
        console.error('Domain filter error:', e);
        return false;
    }
}

/**
 * 返回拦截响应
 * @param {string} message - 错误消息
 * @returns {Response} 拦截响应
 */
function blockedResponse(message = 'Access denied: Domain not allowed') {
    return new Response(JSON.stringify({ 
        error: message,
        code: 'DOMAIN_NOT_ALLOWED'
    }), {
        status: 403,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    });
}

/**
 * 域名过滤中间件
 * 可用于任何需要域名过滤的路由
 */
export async function domainFilterMiddleware(context) {
    const { request, env } = context;
    const url = new URL(request.url);

    try {
        // 获取安全配置
        const securityConfig = await fetchSecurityConfig(env);

        // 检查域名是否允许
        if (!isDomainAllowed(request, securityConfig, url)) {
            return blockedResponse();
        }

        // 域名允许，继续处理请求
        return context.next();
    } catch (error) {
        console.error('Domain filter middleware error:', error);
        // 出错时默认放行，避免影响正常访问
        return context.next();
    }
}

export default domainFilterMiddleware;
