const TIMEZONE = 'America/Sao_Paulo';

const LIMIT_RULES = {
  maxPets:         { table: 'pets',          scope: 'user',       ownerColumn: 'created_by', softDelete: true,  label: 'pets',         suffix: '' },
  maxContacts:     { table: 'contacts',      scope: 'user',       ownerColumn: 'user_id',    softDelete: true,  label: 'contacts',     suffix: '' },
  maxReminders:    { table: 'reminders',     scope: 'user_month', ownerColumn: 'user_id',    softDelete: false, label: 'reminders',    suffix: ' per month' },
  maxFeedings:     { table: 'feedings',      scope: 'pet',        ownerColumn: 'pet_id',     softDelete: true,  label: 'feedings',     suffix: ' per pet' },
  maxWalks:        { table: 'walks',         scope: 'pet',        ownerColumn: 'pet_id',     softDelete: true,  label: 'walks',        suffix: ' per pet' },
  maxBaths:        { table: 'baths',         scope: 'pet',        ownerColumn: 'pet_id',     softDelete: true,  label: 'baths',        suffix: ' per pet' },
  maxDailyReports: { table: 'daily_reports', scope: 'pet',        ownerColumn: 'pet_id',     softDelete: true,  label: 'daily reports', suffix: ' per pet' },
  maxMeasurements: { table: 'measurements',  scope: 'pet',        ownerColumn: 'pet_id',     softDelete: true,  label: 'measurements', suffix: ' per pet' },
};

module.exports = { LIMIT_RULES, TIMEZONE }