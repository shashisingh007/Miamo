// ─── Email template barrel (G.16) ─────────────────────────────────
// One entrypoint for every transactional template. Consumers (activation
// worker, users service delete-account handler) import from here.

export { renderWelcome, type WelcomeData } from './welcome';
export { renderMatchAlert, type MatchAlertData } from './match-alert';
export { renderMessageSummary, type MessageSummaryData } from './message-summary';
export { renderWeeklyDigest, type WeeklyDigestData, type WeeklyDigestPick } from './weekly-digest';
export { renderAccountDeletionConfirmed, type AccountDeletionData } from './account-deletion-confirmed';
export type { RenderedEmail } from './render';
