import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const openApiPath = path.join(root, 'contracts', 'openapi.json');
const manifestSchemaPath = path.join(root, 'contracts', 'lokal-manifest.schema.json');
const ignoredMethods = new Set(['options']);
const httpMethods = ['get', 'post', 'put', 'patch', 'delete'];

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Could not read JSON at ${path.relative(root, filePath)}: ${error.message}`);
  }
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    return [fullPath];
  });
}

function routeFileToOpenApiPath(filePath) {
  const relative = path.relative(root, filePath).replaceAll(path.sep, '/');

  if (relative === 'app/.well-known/lokal/route.ts') {
    return '/.well-known/lokal';
  }

  if (!relative.startsWith('app/api/platform/') || !relative.endsWith('/route.ts')) {
    return null;
  }

  const routePath = relative
    .replace(/^app/, '')
    .replace(/\/route\.ts$/, '')
    .replace(/\[([^\]]+)\]/g, '{$1}');

  return routePath;
}

function exportedMethods(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const methods = new Set();
  const expression = /export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS)\s*\(/g;
  let match;

  while ((match = expression.exec(source))) {
    const method = match[1].toLowerCase();
    if (!ignoredMethods.has(method)) methods.add(method);
  }

  return [...methods].sort();
}

function implementedOperations() {
  const routeFiles = [
    ...walk(path.join(root, 'app', 'api', 'platform')),
    path.join(root, 'app', '.well-known', 'lokal', 'route.ts'),
  ].filter((filePath) => filePath.endsWith('/route.ts'));

  const operations = new Map();

  for (const filePath of routeFiles) {
    const openApiRoute = routeFileToOpenApiPath(filePath);
    if (!openApiRoute) continue;

    const methods = exportedMethods(filePath);
    if (methods.length === 0) continue;

    operations.set(openApiRoute, methods);
  }

  return operations;
}

function openApiOperations(spec) {
  const operations = new Map();

  for (const [routePath, pathItem] of Object.entries(spec.paths ?? {})) {
    const methods = httpMethods.filter((method) => pathItem && Object.hasOwn(pathItem, method)).sort();
    if (methods.length > 0) operations.set(routePath, methods);
  }

  return operations;
}

function diffOperations(implemented, documented) {
  const errors = [];

  for (const [routePath, methods] of implemented.entries()) {
    if (!documented.has(routePath)) {
      errors.push(`Missing OpenAPI path for implemented route: ${routePath} (${methods.join(', ').toUpperCase()})`);
      continue;
    }

    const documentedMethods = new Set(documented.get(routePath));
    for (const method of methods) {
      if (!documentedMethods.has(method)) {
        errors.push(`Missing OpenAPI operation: ${method.toUpperCase()} ${routePath}`);
      }
    }
  }

  for (const [routePath, methods] of documented.entries()) {
    if (!implemented.has(routePath)) {
      errors.push(`OpenAPI path has no implemented route: ${routePath} (${methods.join(', ').toUpperCase()})`);
      continue;
    }

    const implementedMethods = new Set(implemented.get(routePath));
    for (const method of methods) {
      if (!implementedMethods.has(method)) {
        errors.push(`OpenAPI operation has no implementation: ${method.toUpperCase()} ${routePath}`);
      }
    }
  }

  return errors;
}

function main() {
  const spec = readJson(openApiPath);
  const manifestSchema = readJson(manifestSchemaPath);
  const errors = [];

  if (spec.openapi !== '3.1.0') {
    errors.push('contracts/openapi.json must use openapi: 3.1.0');
  }

  if (!spec.info?.version) {
    errors.push('contracts/openapi.json is missing info.version');
  }

  if (!spec.paths || typeof spec.paths !== 'object') {
    errors.push('contracts/openapi.json is missing paths');
  }

  if (manifestSchema.required?.includes('slug') !== true || manifestSchema.required?.includes('collections') !== true) {
    errors.push('contracts/lokal-manifest.schema.json must require slug and collections');
  }

  errors.push(...diffOperations(implementedOperations(), openApiOperations(spec)));

  if (errors.length > 0) {
    console.error('Contract check failed:\n');
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log('Contracts OK');
}

main();
