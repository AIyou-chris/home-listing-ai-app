const { supabaseAdmin } = require('./supabase');
const { validatePhoneNumber } = require('./smsService');

// Vapi Configuration
const VAPI_BASE_URL = 'https://api.vapi.ai';

const initiateCall = async ({ leadId, agentId, propertyId, script, leadName, leadPhone, callType }) => {
    try {
        if (!process.env.VAPI_PRIVATE_KEY) {
            throw new Error('Server configuration error: VAPI_PRIVATE_KEY missing');
        }

        // 1. Fetch Context (if not fully provided)
        let targetPhone = leadPhone;
        let contextData = {};
        let agentContext = {};

        // Get Lead Details
        if (leadId) {
            const { data: lead, error: leadError } = await supabaseAdmin.from('leads').select('*').eq('id', leadId).single();
            if (lead && !leadError) {
                targetPhone = lead.phone || targetPhone;
                contextData.leadName = lead.name;
                contextData.leadEmail = lead.email;
            }
        }

        // Get Property Details
        if (propertyId) {
            const { data: p } = await supabaseAdmin.from('properties').select('*').eq('id', propertyId).single();
            if (p) {
                contextData.propertyAddress = p.address;
                contextData.propertyPrice = p.price;
                contextData.propertyBedrooms = p.bedrooms;
            }
        }

        // Get Agent Details & Check Budget
        if (agentId) {
            const { data: a } = await supabaseAdmin.from('agents').select('*').eq('id', agentId).single();
            if (a) {
                // BUDGET CHECK
                const used = a.voice_minutes_used || 0;
                const limit = a.voice_allowance_monthly || 60; // Default 60 mins

                if (used >= limit) {
                    console.warn(`🛑 [Voice Budget] Agent ${agentId} hit limit (${used}/${limit}). Blocking call.`);
                    throw new Error('Voice budget exceeded. Please upgrade your plan.');
                }

                agentContext.name = `${a.first_name} ${a.last_name}`;
                agentContext.company = a.company || 'HomeListingAI';
            }
        }

        // 2. Prepare Vapi Call Payload
        const phoneNumberId = callType === 'sales'
            ? process.env.VAPI_SALES_PHONE_NUMBER_ID
            : process.env.VAPI_PHONE_NUMBER_ID;

        if (!phoneNumberId) {
            throw new Error('Server configuration error: VAPI phone number ID missing');
        }

        const assistantId = callType === 'sales' && process.env.VAPI_SALES_ASSISTANT_ID
            ? process.env.VAPI_SALES_ASSISTANT_ID
            : process.env.VAPI_ASSISTANT_ID;

        // Default "Name" fallback
        const customerName = leadName || contextData.leadName || 'Valued Lead';

        const payload = {
            phoneNumberId: phoneNumberId,
            customer: {
                number: targetPhone,
                name: customerName
            },
            // Option A: Use existing Assistant ID + Overrides
            ...(assistantId ? {
                assistantId: assistantId,
                assistantOverrides: {
                    variableValues: {
                        leadName: customerName,
                        agentName: agentContext.name || 'Agent',
                        companyName: agentContext.company || 'our agency',
                        propertyAddress: contextData.propertyAddress || 'the property',
                        ...contextData
                    },
                    model: {
                        provider: 'openai',
                        model: 'gpt-4',
                        messages: [
                            {
                                role: 'system',
                                content: script || "You are a helpful real estate assistant. Ask the lead if they have any questions."
                            }
                        ]
                    },
                    firstMessage: script || "Hi, this is " + (agentContext.name || "the assistant") + ". I saw you checked out the property link. Did you have any questions?",
                    voicemailMessage: `Hi, this is ${agentContext.name || 'the assistant'} with ${agentContext.company || 'HomeListingAI'}. I was calling about your property inquiry. I'll send you a text message shortly. Thanks!`,
                    metadata: {
                        agentId,
                        leadId,
                        propertyId,
                        source: 'funnel_automation'
                    }
                }
            } : {
                // Option B: Transient Assistant (No ID provided)
                assistant: {
                    model: {
                        provider: 'openai',
                        model: 'gpt-4',
                        messages: [
                            {
                                role: 'system',
                                content: script || "You are a helpful real estate assistant. Ask the lead if they have any questions."
                            }
                        ]
                    },
                    firstMessage: script || "Hi, this is " + (agentContext.name || "the assistant") + ". I saw you checked out the property link. Did you have any questions?",
                    variableValues: {
                        leadName: customerName,
                        agentName: agentContext.name || 'Agent',
                        companyName: agentContext.company || 'our agency',
                        propertyAddress: contextData.propertyAddress || 'the property',
                        ...contextData
                    }
                }
            }),

            // Analysis block removed as it caused 400 error and might be deprecated or misplaced. 
            // If needed, it usually goes inside 'assistant' or 'assistantOverrides' depending on Vapi version.
            // For now, removing to ensure call works.
        };

        // STEP: Validate Number before calling
        const isPhoneValid = await validatePhoneNumber(targetPhone);
        if (!isPhoneValid) {
            console.warn(`🛑 [Vapi] Aborted call to invalid number: ${targetPhone}`);
            throw new Error('Invalid phone number (rejected by verification)');
        }

        console.log(`📞 Initiating Vapi Call to ${targetPhone} [Lead: ${contextData.leadName}] [Agent: ${agentContext.name}]`);

        const vapiRes = await fetch(`${VAPI_BASE_URL}/call/phone`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.VAPI_PRIVATE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!vapiRes.ok) {
            const errText = await vapiRes.text();
            throw new Error(`Vapi API Error: ${errText}`);
        }

        const data = await vapiRes.json();
        return { success: true, callId: data.id };

    } catch (error) {
        console.error('Vapi Call Error:', error.message);
        throw error;
    }
};

module.exports = {
    initiateCall
};
