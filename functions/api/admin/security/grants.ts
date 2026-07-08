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
        privilege,
        granted_on AS object_type,
        name AS object_name,
        grantee_name AS grantee
      FROM SNOWFLAKE.ACCOUNT_USAGE.GRANTS_TO_ROLES
      ORDER BY grantee_name, object_type
      LIMIT 100
    `);

    return buildJsonResponse(result.rows.map((row: any) => ({
      privilege: row.privilege,
      objectType: row.objectType,
      objectName: row.objectName,
      grantee: row.grantee
    })));
  } catch (err: any) {
    return buildJsonResponse({ success: false, error: err.message || 'Snowflake grants metadata fetch failed' }, { status: 500 });
  }
}
