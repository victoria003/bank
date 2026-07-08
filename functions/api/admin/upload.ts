import { buildJsonResponse, verifyToken } from '../_auth';
import { executeSnowflakeSql } from '../_snowflake';

export async function onRequestPost(context: any) {
  const authHeader = context.request.headers.get('Authorization');
  const user = verifyToken(authHeader);
  if (!user) {
    return buildJsonResponse({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await context.request.json();
  if (!body.fileName || !body.fileFormat || !body.stageName) {
    return buildJsonResponse({ success: false, error: 'File name, format, and stage are required.' }, { status: 400 });
  }

  try {
    const result = await executeSnowflakeSql(context, `
      SELECT ? AS file_name,
             ? AS file_format,
             ? AS stage_name,
             'LOADED' AS status,
             1245 AS rows_loaded,
             0 AS errors,
             CURRENT_TIMESTAMP() AS timestamp
    `, [body.fileName, body.fileFormat, body.stageName]);

    return buildJsonResponse({
      message: 'COPY INTO execution simulated successfully',
      details: {
        id: `LD-${Math.floor(Math.random() * 900 + 100)}`,
        fileName: body.fileName,
        format: body.fileFormat,
        stage: body.stageName,
        status: 'LOADED',
        rowsLoaded: 1245,
        errors: 0,
        timestamp: result.rows[0]?.timestamp
      }
    });
  } catch (err: any) {
    return buildJsonResponse({ success: false, error: err.message || 'Snowflake upload simulation failed' }, { status: 500 });
  }
}
