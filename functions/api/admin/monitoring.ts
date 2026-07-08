import { buildJsonResponse, verifyToken } from '../_auth';
import { executeSnowflakeSql } from '../_snowflake';

export async function onRequestGet(context: any) {
  const authHeader = context.request.headers.get('Authorization');
  const user = await verifyToken(authHeader, context);
  if (!user) {
    return buildJsonResponse({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [accountInfo, warehouses, pipes, tasks, streams, retention, credits, storage] = await Promise.all([
      executeSnowflakeSql(context, `
        SELECT CURRENT_ACCOUNT() AS account,
               CURRENT_DATABASE() AS database,
               CURRENT_SCHEMA() AS schema
      `),
      executeSnowflakeSql(context, `SHOW WAREHOUSES`),
      executeSnowflakeSql(context, `SHOW PIPES`),
      executeSnowflakeSql(context, `SHOW TASKS`),
      executeSnowflakeSql(context, `SHOW STREAMS`),
      executeSnowflakeSql(context, `SHOW PARAMETERS IN ACCOUNT LIKE 'TIME_TRAVEL_RETENTION_TIME_IN_DAYS'`),
      executeSnowflakeSql(context, `
        SELECT COALESCE(SUM(credits_used), 0) AS credit_usage_month
        FROM SNOWFLAKE.ACCOUNT_USAGE.WAREHOUSE_METERING_HISTORY
        WHERE start_time >= DATEADD(month, -1, CURRENT_TIMESTAMP())
      `),
      executeSnowflakeSql(context, `
        SELECT COALESCE(SUM(bytes) / 1024 / 1024 / 1024, 0) AS storage_gb_used
        FROM SNOWFLAKE.ACCOUNT_USAGE.DATABASE_STORAGE_USAGE_HISTORY
        WHERE usage_date >= DATEADD(day, -7, CURRENT_DATE())
      `)
    ]);

    const warehouseRows = warehouses.rows.map((row: any) => ({
      name: row.name,
      state: row.state,
      size: row.warehouseSize || row.size,
      creditsPerHour: Number(row.creditsPerHour || 0),
      autoSuspendMin: Number(row.autoSuspend || row.autoSuspendMin || 0),
      activeQueries: Number(row.activeQueries || 0),
      queuedQueries: Number(row.queuedQueries || 0)
    }));

    return buildJsonResponse({
      connected: true,
      mode: 'LIVE_SQL_API',
      account: accountInfo.rows[0]?.account ?? null,
      database: accountInfo.rows[0]?.database ?? null,
      schema: accountInfo.rows[0]?.schema ?? null,
      warehouses: warehouseRows,
      creditUsageMonth: Number(credits.rows[0]?.creditUsageMonth || 0),
      storageGbUsed: Number(storage.rows[0]?.storageGbUsed || 0),
      timeTravelRetentionDays: Number(retention.rows[0]?.value || 0),
      activePipes: pipes.rows.length,
      activeTasks: tasks.rows.length,
      activeStreams: streams.rows.length
    });
  } catch (err: any) {
    return buildJsonResponse({ success: false, error: err.message || 'Snowflake monitoring query failed' }, { status: 500 });
  }
}
