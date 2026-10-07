'use strict';
// Fannie Mae condo rules we flag against. Source: Lender Letter LL-2026-03 (March 18, 2026).
// Update this one file when Fannie changes a rule. Flags are questions to ask the lender, never an eligibility decision.
const SOURCE = 'Fannie Mae LL-2026-03';

const RULES = {
  reserveMinPercentNow: 10,
  reserveMinPercentJan2027: 15,
  reserveJan2027Date: 'Jan 4, 2027',
  delinquencyMaxPercent: 15,
  masterDeductibleMaxPerUnit: 50000
};

const toNum = (v) => {
  const m = String(v ?? '').replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
};
const ok = (f) => f && f.status === 'verified' && f.value != null;

// facts: output of reader.verify, derived: output of reader.derive. Returns [{ level, text }].
function readinessFlags(facts, derived) {
  const flags = [];
  const rp = derived?.reservePercentOfBudget;
  if (rp != null) {
    if (rp < RULES.reserveMinPercentNow) flags.push({ level: 'red', text: `Reserves are ${rp}% of the budget. Fannie's minimum is ${RULES.reserveMinPercentNow}% today and ${RULES.reserveMinPercentJan2027}% for applications dated ${RULES.reserveJan2027Date} or later. Ask the lender.`, source: SOURCE });
    else if (rp < RULES.reserveMinPercentJan2027) flags.push({ level: 'yellow', text: `Reserves are ${rp}% of the budget. That meets today's ${RULES.reserveMinPercentNow}% but not the ${RULES.reserveMinPercentJan2027}% needed for applications dated ${RULES.reserveJan2027Date} or later.`, source: SOURCE });
    else flags.push({ level: 'green', text: `Reserves are ${rp}% of the budget, at or above ${RULES.reserveMinPercentJan2027}%.`, source: SOURCE });
  } else {
    flags.push({ level: 'gray', text: `Reserve % of budget could not be worked out. It needs the yearly reserve amount and the yearly dues income from the budget.`, source: SOURCE });
  }
  const method = ok(facts.reserve_study_method) ? String(facts.reserve_study_method.value).toLowerCase() : '';
  if (/baseline/.test(method)) flags.push({ level: 'red', text: 'The reserve study uses the baseline funding method. Fannie no longer allows it for applications dated Aug 3, 2026 or later.', source: SOURCE });
  const dq = ok(facts.delinquent_units_60plus) ? toNum(facts.delinquent_units_60plus.value) : null;
  const units = ok(facts.total_units) ? toNum(facts.total_units.value) : null;
  if (dq != null) {
    const pct = /%/.test(String(facts.delinquent_units_60plus.value)) ? dq : units ? (dq / units) * 100 : null;
    if (pct != null && pct > RULES.delinquencyMaxPercent) flags.push({ level: 'red', text: `About ${Math.round(pct)}% of owners are 60+ days late on dues. Fannie's limit is ${RULES.delinquencyMaxPercent}%.`, source: 'Fannie Mae Selling Guide B4-2.2-02' });
  }
  const sa = ok(facts.special_assessment) ? String(facts.special_assessment.value).toLowerCase() : '';
  if (sa && !/^(none|no|n\/a|\$?0(\.0+)?)\b/.test(sa)) flags.push({ level: 'yellow', text: `A special assessment is mentioned: ${facts.special_assessment.value}. Special assessments cannot stand in for reserves.`, source: SOURCE });
  const rep = ok(facts.critical_repairs) ? String(facts.critical_repairs.value).toLowerCase() : '';
  if (rep && !/^(none|no|n\/a)\b/.test(rep)) flags.push({ level: 'yellow', text: `Repairs are mentioned: ${facts.critical_repairs.value}. Critical repairs can make a project unavailable until they are done.`, source: 'Fannie Mae Selling Guide B4-2.2-02' });
  const ded = ok(facts.master_insurance_deductible) ? toNum(facts.master_insurance_deductible.value) : null;
  if (ded != null && ded > RULES.masterDeductibleMaxPerUnit) flags.push({ level: 'yellow', text: `The master policy deductible looks higher than $${RULES.masterDeductibleMaxPerUnit.toLocaleString('en-US')} per unit. Ask the lender.`, source: SOURCE });
  return flags;
}

module.exports = { RULES, readinessFlags, SOURCE };
