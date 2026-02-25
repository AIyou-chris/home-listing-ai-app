const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const JOB_STATUS = {
  QUEUED: 'queued',
  PROCESSING: 'processing',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  DEAD: 'dead'
};

const BACKOFF_SECONDS = [30, 120, 600];

const nowIso = () => new Date().toISOString();

const isMissingTableError = (error) =>
  error?.code === '42P01' ||
  error?.code === 'PGRST205' ||
  /does not exist/i.test(error?.message || '');

const computeBackoffSeconds = (attemptNumber) => {
  if (attemptNumber <= 1) return BACKOFF_SECONDS[0];
  if (attemptNumber === 2) return BACKOFF_SECONDS[1];
  if (attemptNumber >= 3) return BACKOFF_SECONDS[2];
  return BACKOFF_SECONDS[0];
};

const deriveWebhookEventId = (provider, payload = {}) => {
  const providerName = String(provider || '').toLowerCase();

  if (providerName === 'vapi') {
    const direct = payload?.id || payload?.eventId || payload?.event_id;
    const callId = payload?.message?.call?.id || payload?.message?.callId || payload?.message?.call_id;
    const messageType = payload?.message?.type || payload?.type || 'unknown';
    if (direct) return String(direct);
    if (callId) return `vapi:${callId}:${messageType}`;
  }

  if (providerName === 'telnyx') {
    const direct = payload?.id || payload?.data?.id || payload?.data?.payload?.id;
    const eventType = payload?.data?.event_type || payload?.event_type || 'unknown';
    if (direct) return String(direct);
    const fallbackSource = JSON.stringify({ eventType, payload: payload?.data?.payload || payload?.data || payload });
    return `telnyx:${crypto.createHash('sha256').update(fallbackSource).digest('hex')}`;
  }

  const serialized = JSON.stringify(payload || {});
  return `${providerName}:${crypto.createHash('sha256').update(serialized).digest('hex')}`;
};

const enqueueJob = async ({
  type,
  payload = {},
  idempotencyKey,
  priority = 5,
  runAt,
  maxAttempts = 3
}) => {
  if (!type) throw new Error('job_type_required');
  if (!idempotencyKey) throw new Error('job_idempotency_key_required');

  const insertPayload = {
    type,
    status: JOB_STATUS.QUEUED,
    priority,
    run_at: runAt || nowIso(),
    attempts: 0,
    max_attempts: maxAttempts,
    payload,
    idempotency_key: idempotencyKey,
    created_at: nowIso(),
    updated_at: nowIso()
  };

  const { data, error } = await supabase
    .from('jobs')
    .upsert(insertPayload, {
      onConflict: 'idempotency_key',
      ignoreDuplicates: true
    })
    .select('*')
    .maybeSingle();

  if (error) throw error;
  if (data) return { job: data, created: true };

  const { data: existing, error: existingError } = await supabase
    .from('jobs')
    .select('*')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();

  if (existingError) throw existingError;
  return { job: existing || null, created: false };
};

const enqueueWebhookEvent = async ({ provider, payload, forcedEventId, priority = 2 }) => {
  const normalizedProvider = String(provider || '').toLowerCase();
  if (!normalizedProvider) throw new Error('provider_required');

  const eventId = forcedEventId || deriveWebhookEventId(normalizedProvider, payload);
  const webhookInsert = {
    provider: normalizedProvider,
    event_id: eventId,
    status: 'received',
    payload: payload || {},
    received_at: nowIso()
  };

  const { data: insertedEvent, error: insertError } = await supabase
    .from('webhook_events')
    .upsert(webhookInsert, {
      onConflict: 'provider,event_id',
      ignoreDuplicates: true
    })
    .select('*')
    .maybeSingle();

  if (insertError) throw insertError;

  const { data: existingEvent, error: existingEventError } = await supabase
    .from('webhook_events')
    .select('*')
    .eq('provider', normalizedProvider)
    .eq('event_id', eventId)
    .maybeSingle();

  if (existingEventError) throw existingEventError;

  const eventRecord = insertedEvent || existingEvent;
  if (!eventRecord) {
    throw new Error('webhook_event_not_persisted');
  }

  const { job } = await enqueueJob({
    type: normalizedProvider === 'vapi' ? 'webhook_vapi_process' : 'webhook_telnyx_process',
    payload: {
      webhook_event_id: eventRecord.id,
      provider: normalizedProvider,
      event_id: eventId
    },
    idempotencyKey: `webhook:${normalizedProvider}:${eventId}`,
    priority,
    runAt: nowIso(),
    maxAttempts: 3
  });

  return { webhookEvent: eventRecord, job };
};

const claimDueJobs = async ({ workerId, limit = 20 } = {}) => {
  const now = nowIso();
  const { data: candidates, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('status', JOB_STATUS.QUEUED)
    .lte('run_at', now)
    .order('priority', { ascending: true })
    .order('run_at', { ascending: true })
    .limit(limit);

  if (error) throw error;
  if (!candidates || candidates.length === 0) return [];

  const claimed = [];
  for (const job of candidates) {
    const { data: locked, error: lockError } = await supabase
      .from('jobs')
      .update({
        status: JOB_STATUS.PROCESSING,
        locked_at: now,
        locked_by: workerId || null,
        updated_at: now
      })
      .eq('id', job.id)
      .eq('status', JOB_STATUS.QUEUED)
      .select('*')
      .maybeSingle();

    if (lockError) {
      if (isMissingTableError(lockError)) return [];
      throw lockError;
    }

    if (locked) {
      claimed.push(locked);
    }
  }

  return claimed;
};

const recordJobRunStart = async ({ job, workerId }) => {
  const { data, error } = await supabase
    .from('job_runs')
    .insert({
      job_id: job.id,
      started_at: nowIso(),
      status: 'failed',
      attempt_number: Number(job.attempts || 0) + 1,
      worker_id: workerId || null,
      result: {}
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
};

const finishJobRun = async ({ runId, status, result, errorMessage }) => {
  if (!runId) return;
  const payload = {
    status,
    finished_at: nowIso(),
    result: result || null,
    error: errorMessage || null
  };

  await supabase
    .from('job_runs')
    .update(payload)
    .eq('id', runId);
};

const markWebhookProcessed = async ({ webhookEventId }) => {
  if (!webhookEventId) return;
  await supabase
    .from('webhook_events')
    .update({ status: 'processed', processed_at: nowIso() })
    .eq('id', webhookEventId);
};

const markWebhookFailed = async ({ webhookEventId }) => {
  if (!webhookEventId) return;
  await supabase
    .from('webhook_events')
    .update({ status: 'failed' })
    .eq('id', webhookEventId);
};

const setJobSucceeded = async ({ jobId, result }) => {
  await supabase
    .from('jobs')
    .update({
      status: JOB_STATUS.SUCCEEDED,
      locked_at: null,
      locked_by: null,
      last_error: null,
      updated_at: nowIso(),
      payload: result?.persistPayload ? result.persistPayload : undefined
    })
    .eq('id', jobId);
};

const setJobRetryOrDead = async ({ job, errorMessage }) => {
  const nextAttempts = Number(job.attempts || 0) + 1;
  const maxAttempts = Number(job.max_attempts || 3);
  const shouldRetry = nextAttempts < maxAttempts;

  if (!shouldRetry) {
    await supabase
      .from('jobs')
      .update({
        status: JOB_STATUS.DEAD,
        attempts: nextAttempts,
        last_error: errorMessage || null,
        locked_at: null,
        locked_by: null,
        updated_at: nowIso()
      })
      .eq('id', job.id);
    return JOB_STATUS.DEAD;
  }

  const backoffSeconds = computeBackoffSeconds(nextAttempts);
  const runAt = new Date(Date.now() + backoffSeconds * 1000).toISOString();

  await supabase
    .from('jobs')
    .update({
      status: JOB_STATUS.QUEUED,
      attempts: nextAttempts,
      run_at: runAt,
      last_error: errorMessage || null,
      locked_at: null,
      locked_by: null,
      updated_at: nowIso()
    })
    .eq('id', job.id);

  return JOB_STATUS.QUEUED;
};

const reapStuckJobs = async ({ staleMinutes = 10, limit = 50 } = {}) => {
  const cutoff = new Date(Date.now() - staleMinutes * 60 * 1000).toISOString();
  const { data: stuckJobs, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('status', JOB_STATUS.PROCESSING)
    .lt('locked_at', cutoff)
    .order('locked_at', { ascending: true })
    .limit(limit);

  if (error) {
    if (isMissingTableError(error)) return { reaped: 0 };
    throw error;
  }

  if (!stuckJobs || stuckJobs.length === 0) return { reaped: 0 };

  for (const job of stuckJobs) {
    await supabase
      .from('jobs')
      .update({
        status: JOB_STATUS.QUEUED,
        run_at: nowIso(),
        locked_at: null,
        locked_by: null,
        last_error: 'stuck_job_reaped',
        updated_at: nowIso()
      })
      .eq('id', job.id)
      .eq('status', JOB_STATUS.PROCESSING);

    await supabase
      .from('job_runs')
      .insert({
        job_id: job.id,
        started_at: job.locked_at || nowIso(),
        finished_at: nowIso(),
        status: 'failed',
        attempt_number: Number(job.attempts || 0) + 1,
        worker_id: job.locked_by || 'reaper',
        error: 'stuck_job_reaped',
        result: { requeued: true }
      });
  }

  return { reaped: stuckJobs.length };
};

const processJobBatch = async ({ workerId, handlers = {}, batchSize = 20 } = {}) => {
  const claimed = await claimDueJobs({ workerId, limit: batchSize });
  if (!claimed.length) return { processed: 0, succeeded: 0, failed: 0, dead: 0 };

  let succeeded = 0;
  let failed = 0;
  let dead = 0;

  for (const job of claimed) {
    const run = await recordJobRunStart({ job, workerId });
    const handler = handlers[job.type];
    if (!handler) {
      const status = await setJobRetryOrDead({ job, errorMessage: `missing_job_handler:${job.type}` });
      await finishJobRun({
        runId: run.id,
        status: 'failed',
        errorMessage: `missing_job_handler:${job.type}`,
        result: { status }
      });
      failed += 1;
      if (status === JOB_STATUS.DEAD) dead += 1;
      continue;
    }

    try {
      const result = await handler(job);
      await setJobSucceeded({ jobId: job.id, result });

      if (job.type === 'webhook_vapi_process' || job.type === 'webhook_telnyx_process') {
        await markWebhookProcessed({ webhookEventId: job.payload?.webhook_event_id });
      }

      await finishJobRun({
        runId: run.id,
        status: 'succeeded',
        result: result || { ok: true }
      });
      succeeded += 1;
    } catch (error) {
      const errorMessage = error?.message || String(error);
      const status = await setJobRetryOrDead({ job, errorMessage });

      if (job.type === 'webhook_vapi_process' || job.type === 'webhook_telnyx_process') {
        await markWebhookFailed({ webhookEventId: job.payload?.webhook_event_id });
      }

      await finishJobRun({
        runId: run.id,
        status: 'failed',
        errorMessage,
        result: { status }
      });

      failed += 1;
      if (status === JOB_STATUS.DEAD) dead += 1;
    }
  }

  return {
    processed: claimed.length,
    succeeded,
    failed,
    dead
  };
};

const listJobs = async ({ status, type, limit = 50 } = {}) => {
  let query = supabase
    .from('jobs')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (status) query = query.eq('status', status);
  if (type) query = query.eq('type', type);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

const replayJob = async (jobId) => {
  const { data, error } = await supabase
    .from('jobs')
    .update({
      status: JOB_STATUS.QUEUED,
      attempts: 0,
      run_at: nowIso(),
      locked_at: null,
      locked_by: null,
      last_error: null,
      updated_at: nowIso()
    })
    .eq('id', jobId)
    .in('status', [JOB_STATUS.DEAD, JOB_STATUS.FAILED])
    .select('*')
    .maybeSingle();

  if (error) throw error;
  return data;
};

const listWebhooks = async ({ provider, status, limit = 50 } = {}) => {
  let query = supabase
    .from('webhook_events')
    .select('*')
    .order('received_at', { ascending: false })
    .limit(limit);

  if (provider) query = query.eq('provider', provider);
  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

const replayWebhook = async ({ webhookEventId, priority = 2 }) => {
  const { data: event, error } = await supabase
    .from('webhook_events')
    .select('*')
    .eq('id', webhookEventId)
    .maybeSingle();

  if (error) throw error;
  if (!event) return null;

  await supabase
    .from('webhook_events')
    .update({ status: 'received', processed_at: null })
    .eq('id', webhookEventId);

  const idempotencyKey = `webhook:${event.provider}:${event.event_id}`;
  const type = event.provider === 'vapi' ? 'webhook_vapi_process' : 'webhook_telnyx_process';
  const payload = {
    webhook_event_id: event.id,
    provider: event.provider,
    event_id: event.event_id
  };

  const { data: existingJob, error: existingJobError } = await supabase
    .from('jobs')
    .select('*')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();

  if (existingJobError) throw existingJobError;

  if (existingJob) {
    const { data: replayedJob, error: replayError } = await supabase
      .from('jobs')
      .update({
        type,
        payload,
        status: JOB_STATUS.QUEUED,
        attempts: 0,
        run_at: nowIso(),
        locked_at: null,
        locked_by: null,
        last_error: null,
        updated_at: nowIso()
      })
      .eq('id', existingJob.id)
      .select('*')
      .maybeSingle();

    if (replayError) throw replayError;
    return { event, job: replayedJob || existingJob };
  }

  const { job } = await enqueueJob({
    type,
    payload,
    idempotencyKey,
    priority,
    runAt: nowIso(),
    maxAttempts: 3
  });

  return { event, job: job || null };
};

const getWebhookPayload = async (webhookEventId) => {
  if (!webhookEventId) return null;
  const { data, error } = await supabase
    .from('webhook_events')
    .select('*')
    .eq('id', webhookEventId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
};

module.exports = {
  JOB_STATUS,
  enqueueJob,
  enqueueWebhookEvent,
  claimDueJobs,
  processJobBatch,
  reapStuckJobs,
  listJobs,
  replayJob,
  listWebhooks,
  replayWebhook,
  getWebhookPayload,
  deriveWebhookEventId,
  computeBackoffSeconds,
  isMissingTableError
};
