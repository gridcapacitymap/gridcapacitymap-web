import fs from 'fs';
import path from 'path';

let path_prefix = process.argv[process.argv.length - 1] || '.';
let file_path = path.join(path_prefix, 'openapi.json');
let rawdata = fs.readFileSync(file_path);
let openapi_content = JSON.parse(rawdata);

// https://fastapi.tiangolo.com/advanced/generate-clients/#preprocess-the-openapi-specification-for-the-client-generator
for (const [p, path_data] of Object.entries(openapi_content.paths)) {
  for (const [op, operation] of Object.entries(path_data)) {
    const tag = operation.tags[0];
    const operation_id = operation.operationId;
    const to_remove = `${tag}-`;
    const new_operation_id = operation_id.substr(to_remove.length);
    operation.operationId = new_operation_id;
  }
}

fs.writeFileSync(file_path, JSON.stringify(openapi_content));
