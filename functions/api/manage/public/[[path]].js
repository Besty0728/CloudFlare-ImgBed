import { purgeCFCache } from "../../../utils/purgeCache";
import { addFileToIndex } from "../../../utils/indexManager.js";
import { getDatabase } from "../../../utils/databaseAdapter.js";

export async function onRequest(context) {
    // 将文件标记为公开访问（Public）
    const {
        request,
        env,
        params,
        waitUntil,
    } = context;

    const url = new URL(request.url);

    if (params.path) {
        params.path = String(params.path).split(',').join('/');
    }
    const cdnUrl = `https://${url.hostname}/file/${params.path}`;

    params.path = decodeURIComponent(params.path);

    const db = getDatabase(env);
    const value = await db.getWithMetadata(params.path);

    if (!value || !value.metadata) {
        return new Response('Error: File not found', { status: 404 });
    }

    value.metadata.ListType = "Public";
    await db.put(params.path, value.value, { metadata: value.metadata });
    const info = JSON.stringify(value.metadata);

    await purgeCFCache(env, cdnUrl);
    waitUntil(addFileToIndex(context, params.path, value.metadata));

    return new Response(info);
}
