const test = require('node:test');
const assert = require('node:assert/strict');

const { LeadScoringService } = require('../LeadScoringService');

const service = new LeadScoringService();

test('calculateScore adds Jev semantic points and can raise the lead tier', () => {
    const lead = {
        phone: '5551234567',
        email: 'buyer@example.com',
        score_breakdown: []
    };
    const history = [
        { event_trigger: 'CHAT_REPLY' },
        { event_trigger: 'EMAIL_CLICK' }
    ];
    const jevEvaluation = {
        points: 40,
        intent: 'ready_to_act',
        intentConfidence: 0.95,
        readiness: 4,
        urgency: 3,
        model: 'jev-test'
    };

    const result = service.calculateScore(lead, history, 'CHAT_REPLY', jevEvaluation);

    assert.equal(result.totalScore, 105);
    assert.equal(result.tier, 'Hot');
    assert.equal(result.scoringVersion, 'v2.1-jev');
    assert.deepEqual(
        result.breakdown.find(item => item.rule === 'JEV Semantic Qualification'),
        {
            rule: 'JEV Semantic Qualification',
            points: 40,
            intent: 'ready_to_act',
            confidence: 0.95,
            readiness: 4,
            urgency: 3,
            model: 'jev-test'
        }
    );
});

test('calculateScore preserves the latest Jev qualification on later non-reply events', () => {
    const lead = {
        score_breakdown: [{
            rule: 'JEV Semantic Qualification',
            points: 21,
            intent: 'actively_evaluating',
            confidence: 0.8,
            readiness: 3,
            urgency: 1,
            model: 'jev-test'
        }]
    };

    const result = service.calculateScore(lead, [], 'PAGE_VIEW');
    const jevBreakdown = result.breakdown.find(item => item.rule === 'JEV Semantic Qualification');

    assert.equal(result.totalScore, 23);
    assert.equal(jevBreakdown.points, 21);
    assert.equal(jevBreakdown.intent, 'actively_evaluating');
    assert.equal(result.scoringVersion, 'v2.0');
});

test('calculateScore never returns a negative score for negative Jev intent', () => {
    const result = service.calculateScore(
        {},
        [],
        'CHAT_REPLY',
        { points: -50, intent: 'stop_contact', intentConfidence: 1, readiness: 0, urgency: 0, model: 'jev-test' }
    );

    assert.equal(result.totalScore, 0);
    assert.equal(result.tier, 'Cold');
});
