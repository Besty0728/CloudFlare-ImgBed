import { fetchSecurityConfig } from "../utils/sysConfig";
import { checkDatabaseConfig } from "../utils/middleware";
import { validateApiToken } from "../utils/tokenValidator";
import { getDatabase } from "../utils/databaseAdapter.js";

let securityConfig = {}
let basicUser = ""
let basicPass = ""

async function errorHandling(context) {
    try {
        return await context.next();
    } catch (err) {
        return new Response(`${err.message}\n${err.stack}`, { status: 500 });
    }
}

function basicAuthentication(request) {
    const Authorization = request.headers.get('Authorization');

    const [scheme, encoded] = Authorization.split(' ');

    if (!encoded || scheme !== 'Basic') {
        return BadRequestException('Malformed authorization header.');
    }

    const buffer = Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
    const decoded = new TextDecoder().decode(buffer).normalize();

    const index = decoded.indexOf(':');

    if (index === -1 || /[\0-\x1F\x7F]/.test(decoded)) {
        return BadRequestException('Invalid authorization value.');
    }

    return {
        user: decoded.substring(0, index),
        pass: decoded.substring(index + 1),
    };
}

function UnauthorizedException(reason) {
    return new Response(reason, {
        status: 401,
        statusText: 'Unauthorized',
        headers: {
            'Content-Type': 'text/plain;charset=UTF-8',
            'Cache-Control': 'no-store',
            'Content-Length': reason.length,
        },
    });
}

function BadRequestException(reason) {
    return new Response(reason, {
        status: 400,
        statusText: 'Bad Request',
        headers: {
            'Content-Type': 'text/plain;charset=UTF-8',
            'Cache-Control': 'no-store',
            'Content-Length': reason.length,
        },
    });
}

// Reuse strict authentication logic
async function authentication(context) {
    // Read security config
    securityConfig = await fetchSecurityConfig(context.env);
    basicUser = securityConfig.auth.admin.adminUsername
    basicPass = securityConfig.auth.admin.adminPassword

    if (typeof basicUser == "undefined" || basicUser == null || basicUser == "") {
        return context.next();
    } else {
        if (context.request.headers.has('Authorization')) {
            // Basic Auth check
            const { user, pass } = basicAuthentication(context.request);
            if (basicUser !== user || basicPass !== pass) {
                return UnauthorizedException('Invalid credentials.');
            } else {
                return context.next();
            }
        } else {
            // Prompt for Basic Auth
            // MUST use the same realm as /api/manage for seamless API calls if possible,
            // though different paths might still require re-auth or browser handling.
            // We use "my scope" to match existing middleware.
            return new Response('You need to login to access admin tools.', {
                status: 401,
                headers: {
                    'WWW-Authenticate': 'Basic realm="my scope", charset="UTF-8"',
                },
            });
        }
    }
}

export const onRequest = [checkDatabaseConfig, errorHandling, authentication];
