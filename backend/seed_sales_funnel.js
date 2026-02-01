const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const UNIVERSAL_FUNNEL_ID = 'agent_recruitment'; // Used as prefix for IDs

const SALES_STEPS = [
    {
        id: `${UNIVERSAL_FUNNEL_ID}-1`,
        title: 'How Many 2 AM Showings Did You Have This Week?',
        description: 'Agents are closing deals in their sleep — literally.',
        icon: 'warning',
        delay: 'Immediate (Day 0)',
        delay_minutes: 0,
        type: 'Email',
        subject: 'How many 2 A.M. showings did you do this week? 😴',
        previewText: 'You\'re working too hard — let AI take the night shift.',
        content: `Hey {{LEAD.NAME}},\n\nBe honest — how many 2 A.M. showings or "just checking in" texts did you send this week?\n\nYeah... same. The market's quiet, but your burnout's not.\n\nMeanwhile, smart agents are sleeping through the chaos while Natural Lead AI books their next clients automatically.\n\nAnd right now, you can try it with a free trial — and if you love it, keep it for just $69/month.\n\nThat’s less than one dead “exclusive” lead that never calls back.\n\n👉 [Start your Free Trial – $69/month after]\n\nTalk with you soon,\n{{AGENT.NAME}}\n{{AGENT.PHONE}}\n{{AGENT.AICARDURL}}`,
        attachments: []
    },
    {
        id: `${UNIVERSAL_FUNNEL_ID}-2`,
        title: 'The Leak-Proof Bucket',
        description: 'Explain the system logic',
        icon: 'water_drop',
        delay: '+1 days',
        delay_minutes: 1440,
        type: 'Email',
        subject: 'Your bucket has a hole in it',
        previewText: 'Stop losing leads to bad follow-up.',
        content: 'Hi {{lead.firstName}},\n\nYou spend thousands on leads, but 90% of them leak out of your funnel because you follow up once and give up.\n\nMy "Leak-Proof Bucket" system nurtures every single lead for 12 months automatically. It never sleeps, never takes a day off, and never forgets to call.\n\nDo you want to plug the holes? \n\nCTA: Watch the demo.\n\n{{agent.signature}}',
        attachments: []
    },
    {
        id: `${UNIVERSAL_FUNNEL_ID}-3`,
        title: 'Aggressive Value Drop',
        description: 'Provide undeniable proof',
        icon: 'verified',
        delay: '+3 days',
        delay_minutes: 4320,
        type: 'Email',
        subject: 'I did the math for you',
        content: 'Hi {{lead.firstName}},\n\nI looked at your market. Agents using AI assistants are closing 30% more deals with 80% less effort.\n\nThis isn\'t magic. It\'s just superior technology.\n\nI\'m not asking you to change your brokerage. I\'m asking you to upgrade your engine.\n\nAre you ready to win?\n\n{{agent.signature}}',
        attachments: []
    },
    {
        id: `${UNIVERSAL_FUNNEL_ID}-4`,
        title: 'The Takeaway',
        description: 'Create Fear Of Missing Out',
        icon: 'block',
        delay: '+5 days',
        delay_minutes: 7200,
        type: 'Email',
        subject: 'Is this goodbye?',
        content: 'Hi {{lead.firstName}},\n\nI haven\'t heard back, so I assume you\'re content with your current conversion rates.\n\nI\'m going to focus on agents who are hungry to dominate the market this year. If you change your mind and want to stop losing leads to faster competitors, you know where to find me.\n\nBest of luck,\n{{agent.signature}}',
        attachments: []
    },
    {
        id: `${UNIVERSAL_FUNNEL_ID}-5`,
        title: 'The Hail Mary',
        description: 'Final attempt to re-engage',
        icon: 'priority_high',
        delay: '+14 days',
        delay_minutes: 20160,
        type: 'Email',
        subject: ' One last thing before I go...',
        content: 'Hi {{lead.firstName}},\n\nOkay, I lied. I can\'t let you leave money on the table.\n\nHere is a free case study on how a solo agent doubled their GCI in 90 days using this exact AI system.\n\nNo strings attached. Just read it.\n\n[Link to Case Study]\n\n{{agent.signature}}',
        attachments: []
    }
];

async function seedSalesFunnel() {
    const userId = '12021f06-03bc-4046-9b9d-dbfd47eb29ee';

    console.log(`Seeding 'universal_sales' funnel for ${userId}...`);

    // Force Update or Create
    const { data: existing } = await supabase
        .from('funnels')
        .select('id')
        .eq('agent_id', userId)
        .eq('funnel_key', 'universal_sales')
        .maybeSingle();

    if (existing) {
        console.log('Funnel exists. Updating steps to 2 A.M. content.');
        const { error } = await supabase.from('funnels').update({
            steps: SALES_STEPS,
            updated_at: new Date().toISOString()
        }).eq('id', existing.id);

        if (error) console.error('Update Failed:', error);
        else console.log('Successfully updated universal_sales.');
    } else {
        console.log('Creating new universal_sales funnel.');
        const { error } = await supabase.from('funnels').insert({
            agent_id: userId,
            funnel_key: 'universal_sales',
            name: 'Agent Outreach',
            description: 'Agent recruitment sales funnel',
            steps: SALES_STEPS,
            // is_active: true, // column removed
            version: 1,
            is_default: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });

        if (error) console.error('Insert Failed:', error);
        else console.log('Successfully created universal_sales.');
    }
}

seedSalesFunnel();
