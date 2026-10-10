import { readFileSync, writeFileSync } from 'node:fs';
import { createSecurityHeaders } from './securityHeaders.ts';

writeFileSync('build/client/_headers', createSecurityHeaders(readFileSync('build/client/index.html', 'utf8')));
