'use strict';
// Master on/off switches. Missing, unreadable or never-set always means OFF.
async function getSwitch(db, key) {
  try {
    const { data, error } = await db.from('admin_switches').select('enabled').eq('key', key).maybeSingle();
    if (error) return false;
    return data?.enabled === true;
  } catch {
    return false;
  }
}

async function setSwitch(db, key, enabled, updatedBy) {
  const { error } = await db.from('admin_switches').upsert(
    { key, enabled: enabled === true, updated_by: updatedBy || null, updated_at: new Date().toISOString() },
    { onConflict: 'key' }
  );
  if (error) throw error;
  return enabled === true;
}

module.exports = { getSwitch, setSwitch };
