// @ts-check

module.exports = {
  FIELD_TYPE: {
    PAYMENT_HASH: 1,
    ROUTE: 3,
    EXPIRY: 6,
    FALLBACK_ADDRESS: 9,
    SHORT_DESC: 13,
    PAYEE_NODE: 19,
    HASH_DESC: 23,
    MIN_FINAL_CLTV_EXPIRY: 24,
  },
  FIELD_DEFAULT: {
    EXPIRY: 3600,
    MIN_FINAL_CLTV_EXPIRY: 9,
  },
  ADDRESS_VERSION: {
    SEGWIT: 0,
    P2PKH: 17,
    P2SH: 18,
  },
};
