import { Address, toNano } from '@ton/core';

/** OpenFragment platform treasury (mainnet). */
export const PLATFORM_TREASURY = Address.parse(
  'UQCBViM7ir-UvvMNNm3jgQDIqlgTU2kJzEPZvxz5GcfDxeGp',
);

/** Total deploy cost shown to users (TON). */
export const DEPLOY_TOTAL_TON = '2';

/** Sent to the jetton minter deploy + mint (TON). */
export const DEPLOY_CONTRACT_TON = '1.5';

/** Platform fee on deploy (TON) — credited to PLATFORM_TREASURY. */
export const DEPLOY_PLATFORM_FEE_TON = '0.5';

/** Transfer tax on owner-initiated jetton sends (100 = 1%). */
export const TRANSFER_FEE_BPS = 100n;

export const TRANSFER_FEE_PERCENT = 1;

export const DEPLOY_TOTAL_NANO = toNano(DEPLOY_TOTAL_TON);
export const DEPLOY_CONTRACT_NANO = toNano(DEPLOY_CONTRACT_TON);
export const DEPLOY_PLATFORM_FEE_NANO = toNano(DEPLOY_PLATFORM_FEE_TON);
