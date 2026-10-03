const PRODUCTS = {
  monthly_premium: { plan: 'premium', months: 1 },
  semester_premium: { plan: 'premium', months: 6 },
  annual_premium: { plan: 'premium', months: 12 },
  monthly_vip: { plan: 'vip', months: 1 },
  semester_vip: { plan: 'vip', months: 6 },
  annual_vip: { plan: 'vip', months: 12 },
};

const KOFI_TIER_TO_PRODUCT = {
  premium: 'monthly_premium',
  vip: 'monthly_vip',
};

const KOFI_GRACE_DAYS = 3;

module.exports = { PRODUCTS, KOFI_TIER_TO_PRODUCT, KOFI_GRACE_DAYS };