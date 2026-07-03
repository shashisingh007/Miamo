// Miamo Mobile — AccessScreen component test.
jest.mock('@lib/api', () => ({
  api: {
    getIncomingAccessRequests: jest.fn().mockResolvedValue({
      data: [{ id: 'r1', requester: { displayName: 'Alice' }, accessType: 'family', status: 'pending' }],
    }),
    getSentAccessRequests: jest.fn().mockResolvedValue({ data: [] }),
    handleAccessRequest: jest.fn().mockResolvedValue({ data: { ok: true } }),
    trackActivity: jest.fn(),
  },
  setAccessToken: jest.fn(),
}));

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import AccessScreen from '@screens/AccessScreen';

describe('AccessScreen', () => {
  it('renders incoming requests', async () => {
    const { findByTestId } = render(<AccessScreen />);
    await waitFor(() => expect(findByTestId('access-request-r1')).toBeTruthy());
  });

  it('grant button calls handleAccessRequest with grant', async () => {
    const api = require('@lib/api').api;
    const { findByTestId } = render(<AccessScreen />);
    fireEvent.press(await findByTestId('access-grant-r1'));
    await waitFor(() => expect(api.handleAccessRequest).toHaveBeenCalledWith('r1', 'grant'));
  });
});
