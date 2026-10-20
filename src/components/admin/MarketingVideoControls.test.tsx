import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MarketingVideoControls from './MarketingVideoControls';
import { defaultVideoOptions } from '../../services/studioVideoOptions';

const props = (over = {}) => ({ options: defaultVideoOptions, setOptions: jest.fn(), disabled: false, aiVoice: true, makeVoice: jest.fn(), upload: jest.fn(), ...over });

describe('MarketingVideoControls explainers', () => {
  it('offers the animated explainer and then asks which one', () => {
    const p = props();
    const { rerender } = render(<MarketingVideoControls {...p} />);
    expect(screen.queryByLabelText('Which explainer')).toBeNull();
    fireEvent.change(screen.getByLabelText('Video words'), { target: { value: 'explainer' } });
    expect(p.setOptions).toHaveBeenCalledWith({ ...defaultVideoOptions, layout: 'explainer' });
    const q = props({ options: { ...defaultVideoOptions, layout: 'explainer' } });
    rerender(<MarketingVideoControls {...q} />);
    const which = screen.getByLabelText('Which explainer');
    expect(which.querySelectorAll('option')).toHaveLength(4);
    fireEvent.change(which, { target: { value: 'wow-link' } });
    expect(q.setOptions).toHaveBeenCalledWith({ ...defaultVideoOptions, layout: 'explainer', explainer: 'wow-link' });
  });
});
