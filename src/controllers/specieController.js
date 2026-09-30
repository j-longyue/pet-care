const specieService = require('../services/specieService');
const { AppError } = require('../utils/errors');

const handleError = (res, error) => {
  if (error instanceof AppError) {
    return res.status(error.status).json({ error: error.message });
  }

  console.error('Unexpected error in specieController:', error);
  return res.status(500).json({ error: 'Internal server error.' });
};

const createSpecie = async (req, res) => {
  try {
    const specie = await specieService.createSpecie(req.body, req.user);
    return res.status(201).json(specie);
  } catch (error) {
    return handleError(res, error);
  }
};

const getSpecies = async (req, res) => {
  try {
    const result = await specieService.getAllSpecies(req.user, req.query);
    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const getSpecieById = async (req, res) => {
  try {
    const specie = await specieService.getSpecieById(req.params.id, req.user);
    return res.status(200).json(specie);
  } catch (error) {
    return handleError(res, error);
  }
};

const deleteSpecie = async (req, res) => {
  try {
    const result = await specieService.deleteSpecie(req.params.id, req.user);
    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const getDeletedSpeciesLog = async (req, res) => {
  try {
    const result = await specieService.getDeletedSpeciesLog(req.user, req.query);
    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  createSpecie,
  getSpecies,
  getSpecieById,
  deleteSpecie,
  getDeletedSpeciesLog,
};