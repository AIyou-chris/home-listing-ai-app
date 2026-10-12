import { captureFirstTouch, readFirstTouch } from './signupAttribution';

describe('signupAttribution', () => {
  beforeEach(() => localStorage.clear());

  it('saves the first visit that has a source and keeps it', () => {
    captureFirstTouch('?utm_source=blog&utm_medium=article&utm_campaign=wow-link', '/lo-signup');
    captureFirstTouch('?utm_source=linkedin', '/');
    expect(readFirstTouch()).toMatchObject({ source: 'blog', campaign: 'wow-link', landing: '/lo-signup' });
  });

  it('saves nothing for a plain visit', () => {
    captureFirstTouch('', '/');
    expect(readFirstTouch()).toBeNull();
  });
});
