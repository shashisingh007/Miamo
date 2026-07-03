// Miamo Mobile — DtmScreen component test.
jest.mock('@lib/api', () => ({
  api: {
    getMatrimonialProfile: jest.fn().mockResolvedValue({ data: { id: 'p1', displayName: 'Me' } }),
    browseMatrimonial: jest.fn().mockResolvedValue({ data: [{ id: 'c1', displayName: 'Alice' }] }),
    trackActivity: jest.fn(),
  },
  setAccessToken: jest.fn(),
}));

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import DtmScreen from '@screens/DtmScreen';

describe('DtmScreen', () => {
  it('renders after load', async () => {
    const { findByTestId } = render(<DtmScreen />);
    await waitFor(() => expect(findByTestId('dtm-screen')).toBeTruthy());
  });

  it('shows candidate card', async () => {
    const { findByTestId } = render(<DtmScreen />);
    await waitFor(() => expect(findByTestId('dtm-card-c1')).toBeTruthy());
  });
});
