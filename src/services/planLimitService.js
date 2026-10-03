const { PLAN_LIMITS } = require('../config/plans');
const { LIMIT_RULES } = require('../config/planLimitRules');
const { ForbiddenError, NotFoundError } = require('../utils/errors');

const PET_READ_ONLY_MESSAGE =
  'This pet exceeds your plan limit and is read-only. Delete other pets or upgrade your plan to edit it.';

const isPetWithinQuota = (pet) =>
  Number(pet.owner_rank) < (PLAN_LIMITS[pet.owner_plan]?.maxPets ?? 0);

const assertPetWritable = (pet) => {
  if (!isPetWithinQuota(pet)) {
    throw new ForbiddenError(PET_READ_ONLY_MESSAGE);
  }
};

const assertLimitAllowed = (outcome, { notFoundMessage = 'Resource not found.' } = {}) => {
  if (outcome.notFound) {
    throw new NotFoundError(notFoundMessage);
  }

  if (outcome.readOnly) {
    throw new ForbiddenError(PET_READ_ONLY_MESSAGE);
  }

  if (outcome.limitReached) {
    const { label, suffix } = LIMIT_RULES[outcome.limitKey];

    if (outcome.max === 0) {
      throw new ForbiddenError(`Your plan does not include ${label}. Upgrade to use this feature.`);
    }
    throw new ForbiddenError(`Limit of ${outcome.max} ${label}${suffix} reached for your plan.`);
  }

  return outcome;
};

module.exports = { assertLimitAllowed, assertPetWritable, isPetWithinQuota };