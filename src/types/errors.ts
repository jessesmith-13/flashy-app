export interface AccountBannedError extends Error {
  name: 'ACCOUNT_BANNED'
  banReason?: string
}