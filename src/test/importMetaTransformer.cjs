/**
 * ts-jest AST transformer: rewrite `import.meta` → `__importMeta__`.
 *
 * Vite source code reads config via `import.meta.env`. ts-jest compiles to
 * CommonJS, where `import.meta` is illegal ("Cannot use 'import.meta' outside a
 * module"). This replaces every `import.meta` meta-property with a reference to
 * the global `__importMeta__` (defined in src/test/setupTests.ts), so env reads
 * work in the Jest runtime without touching production code.
 */
const ts = require('typescript');

const factory = () => (ctx) => (sourceFile) => {
  const visitor = (node) => {
    if (
      ts.isMetaProperty(node) &&
      node.keywordToken === ts.SyntaxKind.ImportKeyword
    ) {
      return ctx.factory.createIdentifier('__importMeta__');
    }
    return ts.visitEachChild(node, visitor, ctx);
  };
  return ts.visitNode(sourceFile, visitor);
};

module.exports = { name: 'import-meta', version: 1, factory };
