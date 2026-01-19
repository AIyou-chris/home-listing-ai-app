-- Fix Foreign Key Constraint for ai_conversations
-- Includes cleanup of orphaned records that point to non-existent agents

DO $$
BEGIN
    -- 1. CLEANUP ORPHANED DATA
    -- Delete messages where the user_id does not exist in agents
    DELETE FROM public.ai_conversation_messages
    WHERE user_id NOT IN (SELECT id FROM public.agents);

    -- Delete conversations where the user_id does not exist in agents
    -- This will cascade delete messages belonging to these conversations if that FK exists
    DELETE FROM public.ai_conversations
    WHERE user_id NOT IN (SELECT id FROM public.agents);

    -- 2. Drop existing incorrect FKs if they exist
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ai_conversations_user_id_fkey') THEN
        ALTER TABLE public.ai_conversations DROP CONSTRAINT ai_conversations_user_id_fkey;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ai_conversation_messages_user_id_fkey') THEN
        ALTER TABLE public.ai_conversation_messages DROP CONSTRAINT ai_conversation_messages_user_id_fkey;
    END IF;
    
    -- 3. Add correct FKs to public.agents
    ALTER TABLE public.ai_conversations
    ADD CONSTRAINT ai_conversations_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.agents(id) ON DELETE CASCADE;

    ALTER TABLE public.ai_conversation_messages
    ADD CONSTRAINT ai_conversation_messages_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.agents(id) ON DELETE CASCADE;

END $$;
