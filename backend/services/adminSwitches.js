'use strict';
// On/off switches, one set per customer (owner). Missing, unreadable or never-set always means OFF.
// A switch without an owner is never read or written: that would be a switch shared by every customer.
async function getSwitch(db, key, owner) {
  if (!owner) return false;
  try {
    const { data, error } = await db.from('admin_switches').select('enabled').eq('key', key).eq('owner_id', owner).maybeSingle();
    if (error) return false;
    return data?.enabled === true;
  } catch {
    return false;
  }
}

// Update-then-insert (not upsert) so this works under the old and the new database key alike.
async function setSwitch(db, key, enabled, updatedBy, owner) {
  if (!owner) throw new Error('A switch needs an owner');
  const row = { enabled: enabled === true, updated_by: updatedBy || null, updated_at: new Date().toISOString() };
  const { data, error } = await db.from('admin_switches').update(row).eq('key', key).eq('owner_id', owner).select('key');
  if (error) throw error;
  if (!data?.length) {
    const { error: insertError } = await db.from('admin_switches').insert({ key, owner_id: owner, ...row });
    if (insertError) throw insertError;
  }
  return enabled === true;
}

// Every customer who has this switch on (for the background jobs that serve all customers).
async function ownersWithSwitchOn(db, key) {
  try {
    const { data, error } = await db.from('admin_switches').select('owner_id').eq('key', key).eq('enabled', true);
    if (error) return [];
    return [...new Set((data || []).map((r) => r.owner_id).filter(Boolean))];
  } catch {
    return [];
  }
}

module.exports = { getSwitch, setSwitch, ownersWithSwitchOn };
