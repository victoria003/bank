import { buildJsonResponse, verifyToken } from '../../_auth';
import { executeSnowflakeSql } from '../../_snowflake';

export async function onRequestGet(context: any) {
  const authHeader = context.request.headers.get('Authorization');
  const user = verifyToken(authHeader);
  if (!user) {
    return buildJsonResponse({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await executeSnowflakeSql(context, `
      SELECT
        role_name AS role,
        'SYSADMIN' AS parent,
        0 AS users_count,
        0 AS grants_count,
        'Catalog-level access' AS privilege_level
      FROM SNOWFLAKE.ACCOUNT_USAGE.ROLES
      ORDER BY role_name
      LIMIT 50
    `);

    return buildJsonResponse(result.rows.map((row: any) => ({
      role: row.role,
      parent: row.parent,
      usersCount: Number(row.usersCount || 0),
      grantsCount: Number(row.grantsCount || 0),
      privilegeLevel: row.privilegeLevel
    })));
  } catch (err: any) {
    return buildJsonResponse({ success: false, error: err.message || 'Snowflake role metadata fetch failed' }, { status: 500 });
  }
}
