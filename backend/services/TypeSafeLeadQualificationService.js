const { createTypeSafeClient, DEFAULT_MODEL } = require('./typesafeClient');

// Plain question objects (same shape the SDK helpers build) so we use the one
// shared raw-fetch client instead of a second TypeSafe client.
const choice = (instructions, criteria) => ({ type: 'choice', instructions, criteria });
const score = (instructions, criteria) => ({ type: 'score', instructions, criteria });

// Keep every Jev question and scoring constant together so changes are easy to review.
const LEAD_REPLY_QUESTIONS = Object.freeze({
    intent: choice('What is the lead\'s current real-estate intent in `reply`?', {
        ready_to_act: 'They explicitly want a call, showing, application, pre-approval, offer, or another concrete next step now.',
        actively_evaluating: 'They are seriously comparing a property, financing, timing, or terms, but have not committed to a next step.',
        early_research: 'They are curious or gathering general information without a concrete near-term action.',
        not_interested: 'They decline, say they are no longer interested, or clearly want no next step.',
        stop_contact: 'They explicitly ask to unsubscribe, stop, opt out, or not be contacted again.',
        unclear: 'The reply is unrelated, too short without enough context, or does not reveal real-estate intent.'
    }),
    readiness: score('How ready is the lead in `reply` to take a concrete real-estate next step?', [
        'No evidence of readiness, or the lead rejects further action.',
        'General curiosity only; no specific property, financing need, timeline, or next step.',
        'A specific need or property is being explored, but important details or commitment are missing.',
        'The lead is actively evaluating and discusses a practical timeline, budget, showing, financing, or decision.',
        'The lead explicitly requests or accepts an immediate concrete next step such as a call, tour, application, pre-approval, or offer.'
    ]),
    urgency: score('How time-sensitive is the lead\'s real-estate need in `reply`?', [
        'No timing is stated, timing is distant, or the lead is not interested.',
        'The need is real but flexible, with a timeline of several months or no pressure.',
        'The lead wants progress within days or weeks, or uses clear near-term timing.',
        'The lead needs action immediately or as soon as possible.'
    ])
});

const INTENT_MULTIPLIERS = Object.freeze({
    ready_to_act: 1,
    actively_evaluating: 0.8,
    early_research: 0.35,
    unclear: 0,
    not_interested: 0,
    stop_contact: 0
});

const NEGATIVE_INTENT_POINTS = Object.freeze({
    not_interested: -25,
    stop_contact: -50
});

function normalizeScore(answer, highestLevel) {
    if (!answer || typeof answer.score !== 'number' || highestLevel <= 0) return 0;
    return Math.max(0, Math.min(1, answer.score / highestLevel));
}

function calculateSemanticPoints(answers) {
    const intent = answers.intent.choice;
    if (Object.prototype.hasOwnProperty.call(NEGATIVE_INTENT_POINTS, intent)) {
        return NEGATIVE_INTENT_POINTS[intent];
    }

    const readiness = normalizeScore(answers.readiness, 4);
    const urgency = normalizeScore(answers.urgency, 3);
    const multiplier = INTENT_MULTIPLIERS[intent] ?? 0;

    // Readiness is the main signal. Urgency can refine it but cannot dominate it.
    return Math.round(((readiness * 30) + (urgency * 10)) * multiplier);
}

class TypeSafeLeadQualificationService {
    constructor(client = null) {
        this.client = client;
    }

    isConfigured() {
        return Boolean(this.client || process.env.TYPESAFE_API_KEY);
    }

    getClient() {
        if (this.client) return this.client;
        if (!process.env.TYPESAFE_API_KEY) return null;

        this.client = createTypeSafeClient({ apiKey: process.env.TYPESAFE_API_KEY });
        return this.client;
    }

    async evaluateReply({ message, channel = 'unknown', subject = null, lead = {} }) {
        const client = this.getClient();
        const reply = typeof message === 'string' ? message.trim().slice(0, 4000) : '';
        if (!client || !reply) return null;

        try {
            const answers = await client.evaluate({
                state: {
                    reply,
                    channel,
                    subject: subject || null,
                    lead_context: {
                        status: lead.status || null,
                        source: lead.source || null,
                        property_interest: lead.property_interest || lead.property_address || null
                    }
                },
                questions: LEAD_REPLY_QUESTIONS
            });

            const { intent, readiness, urgency } = answers;
            return {
                points: calculateSemanticPoints(answers),
                intent: intent.choice,
                intentConfidence: intent.confidence,
                readiness: readiness.score,
                readinessConfidence: readiness.confidence,
                urgency: urgency.score,
                urgencyConfidence: urgency.confidence,
                model: DEFAULT_MODEL
            };
        } catch (error) {
            // JEV must improve scoring, never prevent inbound-message processing.
            console.warn(`⚠️ [JEV] Lead qualification skipped: ${error.message}`);
            return null;
        }
    }
}

const typeSafeLeadQualificationService = new TypeSafeLeadQualificationService();

module.exports = {
    LEAD_REPLY_QUESTIONS,
    TypeSafeLeadQualificationService,
    calculateSemanticPoints,
    typeSafeLeadQualificationService
};
