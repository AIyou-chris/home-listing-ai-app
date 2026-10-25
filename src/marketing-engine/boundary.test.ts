import fs from 'fs';
import path from 'path';

// The screens are one folder that can be copied to another app. Nothing inside may import from the rest of the app
// except through ./host/ (one tiny file per thing borrowed).
const ROOT = __dirname;
const walk = (dir: string, out: string[] = []): string[] => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out); else if (/\.tsx?$/.test(e.name)) out.push(full);
  }
  return out;
};
const specs = (file: string) => [...fs.readFileSync(file, 'utf8').matchAll(/(?:from|import|mock)\s*\(?\s*['"](\.[^'"]*)['"]/g)].map((m) => m[1]);

it('nothing outside ./host reaches out of the marketing-engine folder', () => {
  const leaks: string[] = [];
  for (const file of walk(ROOT).filter((f) => !f.includes(`${path.sep}host${path.sep}`) && !f.endsWith('boundary.test.ts'))) {
    for (const spec of specs(file)) {
      const target = path.resolve(path.dirname(file), spec);
      if (!target.startsWith(ROOT)) leaks.push(`${path.relative(ROOT, file)} -> ${spec}`);
    }
  }
  expect(leaks).toEqual([]);
});

it('each host file is a plain re-export of one thing', () => {
  for (const file of walk(path.join(ROOT, 'host'))) {
    const text = fs.readFileSync(file, 'utf8').replace(/\/\/[^\n]*/g, '').trim();
    expect(text).toMatch(/^export \{[^}]+\} from '[^']+';$/);
  }
});
