import {
  DEFAULT_AI_CARD_PROFILE,
  DEFAULT_LEAD_USER_ID,
  buildAiCardDestinationUrl,
  buildQrSvgDataUrl,
  fetchAiCardProfileForUser,
  mapAiCardQrCodeFromRow,
  supabaseAdmin,
  upsertAiCardProfileForUser,
  type AiCardQrCodeRow
} from './_shared/aiCardHelpers';

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
type HandlerResult = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
};

interface NetlifyHandlerEvent {
  httpMethod?: string;
  path?: string;
  queryStringParameters?: Record<string, string> | null;
  body?: string | null;
}

const jsonResponse = (statusCode: number, payload: JsonValue) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payload)
});

const parseJsonBody = (body?: string | null) => {
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch (error) {
    console.warn('[AI Card] Failed to parse JSON body:', error);
    return {};
  }
};

const normalizeRoute = (path?: string) => {
  if (!path) return '/';
  const prefix = '/.netlify/functions/ai-card';
  if (path.startsWith(prefix)) {
    const sliced = path.slice(prefix.length) || '/';
    return sliced.startsWith('/') ? sliced : `/${sliced}`;
  }
  return path.startsWith('/') ? path : `/${path}`;
};

export const handler = async (event: NetlifyHandlerEvent = {}): Promise<HandlerResult> => {
  const method = (event.httpMethod || 'GET').toUpperCase();
  const route = normalizeRoute(event.path);
  const query = event.queryStringParameters || {};
  const body = parseJsonBody(event.body);

  try {
    if (route === '/profile' && method === 'GET') {
      const targetUserId = query.userId || DEFAULT_LEAD_USER_ID || null;
      if (!targetUserId) {
        return jsonResponse(200, DEFAULT_AI_CARD_PROFILE);
      }
      const profile =
        (await fetchAiCardProfileForUser(targetUserId)) ||
        { ...DEFAULT_AI_CARD_PROFILE, id: targetUserId };
      return jsonResponse(200, profile);
    }

    if (route === '/profile' && method === 'POST') {
      const { userId, ...profileData } = body as Record<string, unknown>;
      const targetUserId = (userId as string) || DEFAULT_LEAD_USER_ID;
      if (!targetUserId) {
        return jsonResponse(400, { error: 'userId is required to create AI Card profile' });
      }
      const savedProfile = await upsertAiCardProfileForUser(targetUserId, profileData, {
        mergeDefaults: true
      });
      return jsonResponse(200, savedProfile);
    }

    if (route === '/profile' && method === 'PUT') {
      const { userId, ...profileData } = body as Record<string, unknown>;
      const targetUserId = (userId as string) || DEFAULT_LEAD_USER_ID;
      if (!targetUserId) {
        return jsonResponse(400, { error: 'userId is required to update AI Card profile' });
      }
      const savedProfile = await upsertAiCardProfileForUser(targetUserId, profileData);
      return jsonResponse(200, savedProfile);
    }

    if (route === '/generate-qr' && method === 'POST') {
      const { userId, cardUrl } = body as { userId?: string; cardUrl?: string };
      const targetUserId = userId || DEFAULT_LEAD_USER_ID;
      const profile =
        (targetUserId && (await fetchAiCardProfileForUser(targetUserId))) ||
        DEFAULT_AI_CARD_PROFILE;
      const resolvedUrl = buildAiCardDestinationUrl(profile, targetUserId, cardUrl);
      const qrCodeData = buildQrSvgDataUrl(profile.fullName, resolvedUrl);
      return jsonResponse(200, {
        qrCode: qrCodeData,
        url: resolvedUrl,
        profileId: profile.id || targetUserId || 'default'
      });
    }

    if (route === '/share' && method === 'POST') {
      const { userId, method: shareMethod, recipient } = body as {
        userId?: string;
        method?: string;
        recipient?: string;
      };
      const targetUserId = userId || DEFAULT_LEAD_USER_ID;
      const profile =
        (targetUserId && (await fetchAiCardProfileForUser(targetUserId))) ||
        DEFAULT_AI_CARD_PROFILE;
      const shareUrl = buildAiCardDestinationUrl(profile, targetUserId);
      const displayName =
        profile.fullName && profile.fullName.trim().length > 0
          ? profile.fullName.trim()
          : 'Your Agent';
      const titleText =
        profile.professionalTitle && profile.professionalTitle.trim().length > 0
          ? profile.professionalTitle.trim()
          : 'Real Estate Professional';
      const companyText =
        profile.company && profile.company.trim().length > 0
          ? profile.company.trim()
          : 'Your Team';
      const shareText = `Check out ${displayName}'s AI Business Card - ${titleText} at ${companyText}`;

      return jsonResponse(200, {
        url: shareUrl,
        text: shareText,
        method: shareMethod,
        recipient,
        timestamp: new Date().toISOString()
      });
    }

    if (route === '/qr-codes' && method === 'GET') {
      if (!supabaseAdmin) {
        return jsonResponse(200, []);
      }
      const targetUserId = query.userId || DEFAULT_LEAD_USER_ID;
      if (!targetUserId) {
        return jsonResponse(200, []);
      }
      const { data, error } = await supabaseAdmin
        .from('ai_card_qr_codes')
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false });
      if (error) {
        throw error;
      }
      const mapped = ((data || []) as AiCardQrCodeRow[])
        .map((row) => mapAiCardQrCodeFromRow(row))
        .filter(
          (item): item is NonNullable<ReturnType<typeof mapAiCardQrCodeFromRow>> => Boolean(item)
        );
      return jsonResponse(200, mapped);
    }

    if (route === '/qr-codes' && method === 'POST') {
      if (!supabaseAdmin) {
        return jsonResponse(500, { error: 'Supabase service role is required for QR creation' });
      }
      const { userId, label, destinationUrl } = body as {
        userId?: string;
        label?: string;
        destinationUrl?: string;
      };
      const targetUserId = userId || DEFAULT_LEAD_USER_ID;
      if (!targetUserId) {
        return jsonResponse(400, { error: 'userId is required to create a QR code' });
      }
      if (!label || !label.trim()) {
        return jsonResponse(400, { error: 'QR code label is required' });
      }
      const profile =
        (await fetchAiCardProfileForUser(targetUserId)) || DEFAULT_AI_CARD_PROFILE;
      const resolvedUrl = buildAiCardDestinationUrl(profile, targetUserId, destinationUrl);
      const qrSvg = buildQrSvgDataUrl(profile.fullName, resolvedUrl);
      const insertPayload = {
        user_id: targetUserId,
        label: label.trim(),
        destination_url: resolvedUrl,
        qr_svg: qrSvg,
        total_scans: 0,
        last_scanned_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      const { data, error } = await supabaseAdmin
        .from('ai_card_qr_codes')
        .insert(insertPayload)
        .select('*')
        .single();
      if (error) {
        throw error;
      }
      return jsonResponse(200, mapAiCardQrCodeFromRow(data));
    }

    const qrIdMatch = route.match(/^\/qr-codes\/([^/]+)$/);
    if (qrIdMatch && method === 'PUT') {
      if (!supabaseAdmin) {
        return jsonResponse(500, { error: 'Supabase service role is required for QR updates' });
      }

      const qrId = qrIdMatch[1];
      const { label, destinationUrl } = body as { label?: string; destinationUrl?: string };

      const { data: existingRow, error: fetchError } = await supabaseAdmin
        .from('ai_card_qr_codes')
        .select('*')
        .eq('id', qrId)
        .maybeSingle();
      if (fetchError) {
        throw fetchError;
      }
      if (!existingRow) {
        return jsonResponse(404, { error: 'QR code not found' });
      }

      let resolvedUrl = existingRow.destination_url;
      if (destinationUrl !== undefined) {
        resolvedUrl = destinationUrl;
      }

      const updatePayload: Record<string, unknown> = {
        updated_at: new Date().toISOString()
      };

      if (label !== undefined) {
        updatePayload.label = label.trim();
      }
      if (destinationUrl !== undefined || label !== undefined) {
        const profile =
          (await fetchAiCardProfileForUser(existingRow.user_id)) || DEFAULT_AI_CARD_PROFILE;
        const finalUrl = buildAiCardDestinationUrl(profile, existingRow.user_id, resolvedUrl);
        updatePayload.destination_url = finalUrl;
        updatePayload.qr_svg = buildQrSvgDataUrl(profile.fullName, finalUrl);
      }

      const { data: updatedRow, error: updateError } = await supabaseAdmin
        .from('ai_card_qr_codes')
        .update(updatePayload)
        .eq('id', qrId)
        .select('*')
        .single();
      if (updateError) {
        throw updateError;
      }
      return jsonResponse(200, mapAiCardQrCodeFromRow(updatedRow));
    }

    if (qrIdMatch && method === 'DELETE') {
      if (!supabaseAdmin) {
        return jsonResponse(500, { error: 'Supabase service role is required for QR deletion' });
      }
      const qrId = qrIdMatch[1];
      const { data, error } = await supabaseAdmin
        .from('ai_card_qr_codes')
        .delete()
        .eq('id', qrId)
        .select('*')
        .single();
      if (error) {
        throw error;
      }
      return jsonResponse(200, { success: true, qrCode: mapAiCardQrCodeFromRow(data) });
    }

    return jsonResponse(404, { error: 'Not found' });
  } catch (error) {
    console.error('[AI Card] Function error:', error);
    return jsonResponse(500, { error: 'Internal server error' });
  }
};
