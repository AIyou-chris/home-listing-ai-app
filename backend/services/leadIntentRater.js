'use strict';

// Rates a pre-approval lead Hot / Warm / Cold from the four answers the buyer
// tapped on the listing page. Jev (TypeSafe System One) makes the call; a plain
// rules table takes over whenever Jev is unconfigured, errors, or answers with
// something unexpected, so a lead is NEVER lost or left unrated.
//
// Same shape as loPhoneCallService.classifyIntent (a `choice` question with
// criteria) so a loan officer sees one consistent meaning of Hot across the
// phone line and the form.

const INTENT_CRITERIA = {
  Hot: 'Buying within about three months, or already pre-approved and shopping. Worth calling today.',
  Warm: 'A real buyer with a slower timeline (three to six months) or something to fix first, such as credit or down payment. Worth nurturing.',
  Cold: 'Just looking, no timeline, and nothing in the answers suggests they will transact soon.',
};

const LEVELS = Object.keys(INTENT_CRITERIA);

// Lower bound on Jev's confidence; below this we use the rules instead of a coin flip.
const MIN_CONFIDENCE = 0.4;

const norm = (v) => String(v == null ? '' : v).trim().toLowerCase();

// Plain-English rules, used when Jev can't answer. Deliberately conservative:
// it would rather call a buyer Warm than wrongly promise the LO a Hot lead.
function rateByRules({ purchase_timeline, currently_preapproved, credit_range, down_payment }) {
  const timeline = norm(purchase_timeline);
  const credit = norm(credit_range);
  const down = norm(down_payment);

  const soon = timeline.includes('asap') || timeline.startsWith('1');       // ASAP, 1–3 months
  const browsing = timeline.includes('just looking');
  const midTimeline = timeline.startsWith('3');                             // 3–6 months
  const weakCredit = credit.includes('under 620');
  const lowDown = down.includes('under 5');

  if (browsing) return { level: 'Cold', reason: 'Just looking, no timeline yet.' };
  if (currently_preapproved === true && !browsing) {
    return { level: 'Hot', reason: 'Already pre-approved and shopping.' };
  }
  if (soon && !weakCredit) return { level: 'Hot', reason: 'Buying within three months.' };
  if (soon && weakCredit) return { level: 'Warm', reason: 'Buying soon, but credit needs work first.' };
  if (midTimeline) {
    return { level: 'Warm', reason: lowDown ? 'Three to six months out, saving a down payment.' : 'Three to six months out.' };
  }
  if (!timeline) return { level: 'Warm', reason: 'No timeline given.' };
  return { level: 'Warm', reason: 'Real buyer, slower timeline.' };
}

// answers: { purchase_timeline, currently_preapproved, credit_range, down_payment, property_type }
// Returns { level, reason, source } — source is 'jev' or why it fell back.
async function rateLeadIntent(answers = {}, { typesafeClient, log = console } = {}) {
  const fallback = rateByRules(answers);

  if (!typesafeClient || typeof typesafeClient.isConfigured !== 'function' || !typesafeClient.isConfigured()) {
    return { ...fallback, source: 'rules_unconfigured' };
  }

  try {
    const jevAnswers = await typesafeClient.evaluate({
      state: {
        when_they_want_to_buy: answers.purchase_timeline || 'not given',
        already_pre_approved: answers.currently_preapproved === true ? 'yes'
          : answers.currently_preapproved === false ? 'not yet' : 'not given',
        credit_score_range: answers.credit_range || 'not given',
        down_payment: answers.down_payment || 'not given',
        property_type: answers.property_type || 'not given',
      },
      questions: {
        intent: {
          type: 'choice',
          instructions: 'A home buyer tapped these answers on a listing page to ask a loan officer about financing. How ready are they to transact?',
          criteria: INTENT_CRITERIA,
        },
      },
    });

    const answer = jevAnswers?.intent || {};
    let pick = answer.choice;
    const probs = answer.probabilities && typeof answer.probabilities === 'object' ? answer.probabilities : null;
    if (!pick && probs) pick = Object.keys(probs).sort((a, b) => probs[b] - probs[a])[0];
    if (!LEVELS.includes(pick)) return { ...fallback, source: 'rules_unknown_choice' };

    const confidence = typeof answer.confidence === 'number'
      ? answer.confidence
      : (probs && pick ? Number(probs[pick]) : null);
    if (typeof confidence === 'number' && confidence < MIN_CONFIDENCE) {
      return { ...fallback, source: 'rules_low_confidence' };
    }

    return { level: pick, reason: fallback.reason, source: 'jev', confidence: confidence ?? null };
  } catch (err) {
    log.warn?.('[Lead Intent] Jev rating failed, using rules:', err?.message || err);
    return { ...fallback, source: 'rules_error' };
  }
}

module.exports = { rateLeadIntent, rateByRules, INTENT_CRITERIA, LEVELS, MIN_CONFIDENCE };
