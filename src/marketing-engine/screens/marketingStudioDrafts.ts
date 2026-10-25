export type PictureMode = 'auto' | 'describe' | 'own';
export type StudioBrief = {
  id: string;
  kind: 'campaign' | 'video';
  idea: string;
  goal: string;
  tone: string;
  audience: string;
  pictureMode: PictureMode;
  pictureDescription: string;
  photoName: string;
  videoFormat: 'vertical' | 'landscape';
  videoDuration: '15' | '30' | '60';
  plannedAt: string;
  createdAt: string;
};

export const MAX_STUDIO_BRIEFS = 50;
const storageKey = (ownerId: string) => `hlai_marketing_studio_v1:${ownerId}`;

function isBrief(value: unknown): value is StudioBrief {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return ['id', 'idea', 'goal', 'tone', 'audience', 'pictureDescription', 'photoName', 'plannedAt', 'createdAt']
    .every(key => typeof row[key] === 'string')
    && ['campaign', 'video'].includes(String(row.kind))
    && ['auto', 'describe', 'own'].includes(String(row.pictureMode))
    && ['vertical', 'landscape'].includes(String(row.videoFormat))
    && ['15', '30', '60'].includes(String(row.videoDuration))
    && row.idea !== '' && Number.isFinite(Date.parse(String(row.createdAt)));
}

export function loadStudioBriefs(ownerId: string): StudioBrief[] {
  if (!ownerId) return [];
  const raw = localStorage.getItem(storageKey(ownerId));
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed) || !parsed.every(isBrief)) {
    throw new Error('Your saved briefs could not be read. They have not been changed.');
  }
  return parsed;
}

// Stage one stores only text briefs, never credentials, uploaded photos, or
// publish jobs. Server-backed campaigns and scheduling are later stages.
export function saveStudioBriefs(ownerId: string, briefs: StudioBrief[]) {
  if (!ownerId) throw new Error('Your account is still loading. Please try again.');
  if (briefs.length > MAX_STUDIO_BRIEFS) throw new Error('You have 50 saved briefs. Remove one before saving another.');
  localStorage.setItem(storageKey(ownerId), JSON.stringify(briefs));
}

export function briefAsText(brief: StudioBrief) {
  return [
    `${brief.kind === 'video' ? 'Video' : 'Campaign'} brief`,
    `Idea: ${brief.idea}`, `Goal: ${brief.goal}`, `Tone: ${brief.tone}`, `Audience: ${brief.audience}`,
    brief.pictureMode === 'auto' ? 'Picture: Let the AI decide'
      : brief.pictureMode === 'describe' ? `Picture: ${brief.pictureDescription}`
        : `Picture file: ${brief.photoName} (reattach when generation is connected)`,
    ...(brief.kind === 'video' ? [`Format: ${brief.videoFormat}`, `Length: ${brief.videoDuration} seconds`] : []),
    brief.plannedAt ? `Planned for: ${brief.plannedAt} (not scheduled for publishing)` : '',
  ].filter(Boolean).join('\n');
}
