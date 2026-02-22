const flattenRoutes = (stack, routes = []) => {
    for (const layer of stack || []) {
        if (layer.route && layer.route.path) {
            const path = typeof layer.route.path === 'string'
                ? layer.route.path
                : String(layer.route.path);
            const methods = Object.keys(layer.route.methods || {})
                .filter((method) => layer.route.methods[method])
                .map((method) => method.toUpperCase());

            for (const method of methods) {
                routes.push({ method, path });
            }
            continue;
        }

        if (layer.name === 'router' && layer.handle && layer.handle.stack) {
            flattenRoutes(layer.handle.stack, routes);
        }
    }

    return routes;
};

const logDuplicateRoutes = (app) => {
    try {
        const router = app?._router || app?.router;
        if (!router?.stack) {
            console.warn('[StartupChecks] Could not inspect route stack (router unavailable).');
            return;
        }

        const keyCounts = new Map();
        for (const route of flattenRoutes(router.stack)) {
            const key = `${route.method} ${route.path}`;
            keyCounts.set(key, (keyCounts.get(key) || 0) + 1);
        }

        const duplicates = [...keyCounts.entries()]
            .filter(([, count]) => count > 1)
            .sort((a, b) => b[1] - a[1]);

        if (duplicates.length === 0) {
            console.log('[StartupChecks] No duplicate express routes detected.');
            return;
        }

        console.warn('[StartupChecks] Duplicate express routes detected (first match wins):');
        for (const [key, count] of duplicates.slice(0, 20)) {
            console.warn(`  - ${key} x${count}`);
        }
    } catch (err) {
        console.warn('[StartupChecks] Failed to inspect route stack:', err.message);
    }
};

const probeOptionalColumn = async ({ supabaseAdmin, table, column }) => {
    try {
        const { error } = await supabaseAdmin
            .from(table)
            .select(column)
            .limit(1);

        if (!error) return true;

        const message = String(error.message || '').toLowerCase();
        if (message.includes('does not exist')) return false;

        console.warn(`[StartupChecks] Could not verify ${table}.${column}: ${error.message}`);
        return false;
    } catch (err) {
        console.warn(`[StartupChecks] Probe exception for ${table}.${column}: ${err.message}`);
        return false;
    }
};

const runStartupDiagnostics = async ({ app, supabaseAdmin, schemaCapabilities }) => {
    logDuplicateRoutes(app);

    if (!supabaseAdmin) return;

    const checks = [
        { key: 'emailTrackingStatus', table: 'email_tracking_events', column: 'status' },
        { key: 'agentsMetadata', table: 'agents', column: 'metadata' }
    ];

    for (const check of checks) {
        const exists = await probeOptionalColumn({
            supabaseAdmin,
            table: check.table,
            column: check.column
        });

        schemaCapabilities[check.key] = exists;
        if (!exists) {
            console.warn(`[StartupChecks] Optional column missing: ${check.table}.${check.column}. Running in compatibility mode.`);
        }
    }
};

module.exports = {
    runStartupDiagnostics
};
