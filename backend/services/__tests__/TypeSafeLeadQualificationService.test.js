const test = require('node:test');
const assert = require('node:assert/strict');

const {
    TypeSafeLeadQualificationService,
    calculateSemanticPoints
} = require('../TypeSafeLeadQualificationService');

function answers(intent, readiness, urgency) {
    return {
        intent: { type: 'choice', choice: intent, confidence: 0.9, probabilities: {} },
        readiness: { type: 'score', score: readiness, confidence: 0.8, probabilities: {}, legend: {} },
        urgency: { type: 'score', score: urgency, confidence: 0.7, probabilities: {}, legend: {} }
    };
}

test('semantic points reward concrete, urgent next steps', () => {
    assert.equal(calculateSemanticPoints(answers('ready_to_act', 4, 3)), 40);
    assert.equal(calculateSemanticPoints(answers('actively_evaluating', 3, 1)), 21);
});

test('semantic points penalize negative intent', () => {
    assert.equal(calculateSemanticPoints(answers('not_interested', 0, 0)), -25);
    assert.equal(calculateSemanticPoints(answers('stop_contact', 0, 0)), -50);
});

test('evaluateReply returns structured Jev qualification', async () => {
    const client = {
        evaluate: async () => answers('ready_to_act', 4, 3)
    };
    const service = new TypeSafeLeadQualificationService(client);

    const result = await service.evaluateReply({
        message: 'Yes, I want to tour it today. Please call me.',
        channel: 'sms'
    });

    assert.equal(result.points, 40);
    assert.equal(result.intent, 'ready_to_act');
    assert.equal(result.model, 'jev-latest');
});

test('evaluateReply fails open when Jev is unavailable', async () => {
    const client = { evaluate: async () => { throw new Error('offline'); } };
    const service = new TypeSafeLeadQualificationService(client);

    const result = await service.evaluateReply({ message: 'Can I see the house?' });
    assert.equal(result, null);
});
