/**
 * SQL Validation Script for supabase-setup.sql
 * Checks for common syntax issues and structure problems
 */

const fs = require('fs');
const path = require('path');

const sqlFile = path.join(__dirname, 'supabase-setup.sql');
const sql = fs.readFileSync(sqlFile, 'utf8');

console.log('🔍 Validating supabase-setup.sql...\n');

const issues = [];
const warnings = [];
const info = [];

// Split into statements
const statements = sql.split(';').filter(s => s.trim());

console.log(`📊 Found ${statements.length} SQL statements\n`);

// Check 1: Table definitions
const tableMatches = sql.match(/CREATE TABLE IF NOT EXISTS (\w+\.)?(\w+)/gi) || [];
const tables = tableMatches.map(m => {
  const match = m.match(/CREATE TABLE IF NOT EXISTS (?:\w+\.)?(\w+)/i);
  return match ? match[1] : null;
}).filter(Boolean);

console.log(`✅ Tables defined (${tables.length}):`);
tables.forEach(t => console.log(`   - ${t}`));
console.log('');

// Check 2: Missing 'agents' table
if (!tables.includes('agents')) {
  issues.push('❌ CRITICAL: Missing "agents" table - required for slug-based routing');
  info.push('   📝 Found in docs/agent-onboarding-flow.md but not in supabase-setup.sql');
  info.push('   📝 This table should contain: id, slug, email, status, auth_user_id, etc.');
}

// Check 3: Check for slug columns in existing tables
const slugReferences = sql.match(/\bslug\b/gi) || [];
if (slugReferences.length === 0) {
  warnings.push('⚠️  No "slug" column found in any table');
  info.push('   📝 For slug-based routing (/:slug/dashboard), you need a slug column');
}

// Check 4: Check for unclosed parentheses
const openParens = (sql.match(/\(/g) || []).length;
const closeParens = (sql.match(/\)/g) || []).length;
if (openParens !== closeParens) {
  issues.push(`❌ SYNTAX: Unbalanced parentheses (${openParens} open, ${closeParens} close)`);
}

// Check 5: Check for unclosed quotes
const singleQuotes = (sql.match(/'/g) || []).length;
if (singleQuotes % 2 !== 0) {
  warnings.push('⚠️  Odd number of single quotes - possible unclosed string');
}

// Check 6: Check for required foreign key references
const fkMatches = sql.match(/REFERENCES\s+(\w+\.)?(\w+)\s*\(/gi) || [];
const referencedTables = fkMatches.map(m => {
  const match = m.match(/REFERENCES\s+(?:\w+\.)?(\w+)\s*\(/i);
  return match ? match[1] : null;
}).filter(Boolean);

console.log(`🔗 Foreign key references (${referencedTables.length}):`);
const uniqueRefs = [...new Set(referencedTables)];
uniqueRefs.forEach(t => {
  const count = referencedTables.filter(r => r === t).length;
  console.log(`   - ${t} (${count} references)`);
});
console.log('');

// Check 7: Verify auth.users references exist
if (!sql.includes('auth.users')) {
  warnings.push('⚠️  No references to auth.users table');
}

// Check 8: Check RLS policies
const rlsPolicies = sql.match(/CREATE POLICY/gi) || [];
const rlsEnabled = sql.match(/ENABLE ROW LEVEL SECURITY/gi) || [];

console.log(`🔒 Security:`);
console.log(`   - RLS enabled on ${rlsEnabled.length} tables`);
console.log(`   - ${rlsPolicies.length} RLS policies defined`);
console.log('');

// Check 9: Check for storage buckets
const buckets = sql.match(/INSERT INTO storage\.buckets.*?VALUES\s*\('([^']+)'/gi) || [];
const bucketNames = buckets.map(b => {
  const match = b.match(/VALUES\s*\('([^']+)'/);
  return match ? match[1] : null;
}).filter(Boolean);

if (bucketNames.length > 0) {
  console.log(`📦 Storage buckets (${bucketNames.length}):`);
  bucketNames.forEach(b => console.log(`   - ${b}`));
  console.log('');
}

// Check 10: Check for indexes
const indexes = sql.match(/CREATE INDEX/gi) || [];
console.log(`📇 Indexes: ${indexes.length} indexes defined\n`);

// Check 11: Specific URL structure requirements
const urlStructureChecks = {
  'ai_card_profiles': tables.includes('ai_card_profiles'),
  'ai_conversations': tables.includes('ai_conversations'),
  'ai_sidekick_profiles': tables.includes('ai_sidekick_profiles'),
  'leads': tables.includes('leads'),
  'appointments': tables.includes('appointments'),
  'ai_kb': tables.includes('ai_kb'),
};

console.log('🌐 URL Structure Support:');
Object.entries(urlStructureChecks).forEach(([table, exists]) => {
  console.log(`   ${exists ? '✅' : '❌'} ${table}`);
});
console.log('');

// Summary
console.log('━'.repeat(60));
console.log('📋 VALIDATION SUMMARY\n');

if (issues.length > 0) {
  console.log('🚨 CRITICAL ISSUES:');
  issues.forEach(i => console.log(i));
  console.log('');
}

if (warnings.length > 0) {
  console.log('⚠️  WARNINGS:');
  warnings.forEach(w => console.log(w));
  console.log('');
}

if (info.length > 0) {
  console.log('ℹ️  INFORMATION:');
  info.forEach(i => console.log(i));
  console.log('');
}

if (issues.length === 0 && warnings.length === 0) {
  console.log('✨ No critical issues found!');
  console.log('');
} else {
  console.log(`Found ${issues.length} critical issue(s) and ${warnings.length} warning(s)`);
  console.log('');
}

// Gap Analysis for URL Structure
console.log('━'.repeat(60));
console.log('🔍 GAP ANALYSIS FOR URL STRUCTURE\n');

const gaps = [];

if (!tables.includes('agents')) {
  gaps.push({
    severity: 'CRITICAL',
    item: 'Missing "agents" table',
    description: 'Required for slug-based routing (/:slug/dashboard)',
    recommendation: 'Add agents table with columns: id, slug, email, first_name, last_name, status, auth_user_id'
  });
}

if (slugReferences.length === 0) {
  gaps.push({
    severity: 'CRITICAL',
    item: 'No slug column in any table',
    description: 'URL structure uses /:slug/ pattern but no slug field exists',
    recommendation: 'Add slug column to agents table or create a mapping table'
  });
}

if (!tables.includes('dashboards')) {
  gaps.push({
    severity: 'MODERATE',
    item: 'Missing "dashboards" table',
    description: 'For per-agent dashboard configuration',
    recommendation: 'Add dashboards table to store agent-specific dashboard settings'
  });
}

if (gaps.length > 0) {
  gaps.forEach((gap, idx) => {
    console.log(`${idx + 1}. [${gap.severity}] ${gap.item}`);
    console.log(`   Description: ${gap.description}`);
    console.log(`   Recommendation: ${gap.recommendation}`);
    console.log('');
  });
} else {
  console.log('✅ All required tables for URL structure are present!\n');
}

console.log('━'.repeat(60));
process.exit(issues.length > 0 ? 1 : 0);
