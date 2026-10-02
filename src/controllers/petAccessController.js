const petAccessService = require('../services/petAccessService');

const grantAccess = async (req, res, next) => {
  try {
    const access = await petAccessService.grantAccess(req.params.petId, req.body, req.user);
    return res.status(201).json(access);
  } catch (error) {
    next(error);
  }
};

const listAccess = async (req, res, next) => {
  try {
    const result = await petAccessService.listAccess(req.params.petId, req.query, req.user);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const updateAccess = async (req, res, next) => {
  try {
    const access = await petAccessService.updateAccess(
      req.params.petId,
      req.params.userId,
      req.body,
      req.user
    );
    return res.status(200).json(access);
  } catch (error) {
    next(error);
  }
};

const revokeAccess = async (req, res, next) => {
  try {
    await petAccessService.revokeAccess(req.params.petId, req.params.userId, req.user);
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  grantAccess,
  listAccess,
  updateAccess,
  revokeAccess,
};