// Miamo Mobile — SettingsScreen component test.
jest.mock('@lib/api', () => ({
  api: {
    getSettings: jest.fn().mockResolvedValue({ data: { pushNotifications: true, showOnlineStatus: true, showReadReceipts: false } }),
    updateSettings: jest.fn().mockResolvedValue({ data: { pushNotifications: false } }),
    logout: jest.fn(),
    trackActivity: jest.fn(),
  },
  setAccessToken: jest.fn(),
}));

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import SettingsScreen from '@screens/SettingsScreen';

describe('SettingsScreen', () => {
  it('renders after load', async () => {
    const { findByTestId } = render(<SettingsScreen />);
    await waitFor(() => expect(findByTestId('settings-screen')).toBeTruthy());
  });

  it('toggles push', async () => {
    const api = require('@lib/api').api;
    const { findByTestId } = render(<SettingsScreen />);
    const toggle = await findByTestId('settings-push');
    fireEvent(toggle, 'valueChange', false);
    await waitFor(() => expect(api.updateSettings).toHaveBeenCalledWith({ pushNotifications: false }));
  });
});
