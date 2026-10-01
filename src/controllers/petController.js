const petService = require('../services/petService');

const create = async (req, res, next) => {
  try {
    const newPet = await petService.createPet(req.body, req.user);
    return res.status(201).json(newPet);
  } catch (error) {
    next(error);
  }
};

const getAll = async (req, res, next) => {
  try {
    const pets = await petService.getAllPets(req.query, req.user);
    return res.status(200).json(pets);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const pet = await petService.getPetById(req.params.id, req.user);
    return res.status(200).json(pet);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const updatedPet = await petService.updatePet(req.params.id, req.body, req.user);
    return res.status(200).json(updatedPet);
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    await petService.deletePet(req.params.id, req.user);
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  create,
  getAll,
  getById,
  update,
  delete: remove,
};