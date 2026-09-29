const userService = require('../services/userService');

const getErrorStatus = (error, fallback = 400) => {
  const msg = error.message || '';

  if (msg.includes('not found')) return 404;
  if (msg.includes('Authentication required')) return 401;
  if (
    msg.includes('Access denied') ||
    msg.includes('You can only') ||
    msg.includes('Only an admin') ||
    msg.includes('Moderators can only') ||
    msg.includes('Admins cannot') ||
    msg.includes('You do not have permission')
  ) {
    return 403;
  }

  return fallback;
};

const createUser = async (req, res) => {
  try {
    const newUser = await userService.createUser(req.body, req.user);
    res.status(201).json(newUser);
  } catch (error) {
    res.status(getErrorStatus(error)).json({ error: error.message });
  }
};

const getUsers = async (req, res) => {
  try {
    const users = await userService.getAllUsers(req.user);
    res.status(200).json(users);
  } catch (error) {
    res.status(getErrorStatus(error, 500)).json({ error: error.message });
  }
};

const getUserById = async (req, res) => {
  try {
    const result = await userService.getUserById(req.params.id, req.user);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(getErrorStatus(error)).json({ error: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedUser = await userService.updateUser(id, req.body, req.user);
    return res.status(200).json(updatedUser);
  } catch (error) {
    return res.status(getErrorStatus(error)).json({ error: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await userService.deleteUser(id, req.user);
    res.status(200).json(result);
  } catch (error) {
    res.status(getErrorStatus(error)).json({ error: error.message });
  }
};

const getDeletedUsersLog = async (req, res) => {
  try {
    const logs = await userService.getDeletedUsersLog(req.user);
    return res.status(200).json(logs);
  } catch (error) {
    return res.status(getErrorStatus(error, 403)).json({ error: error.message });
  }
};

// ---- PLAN TEMP ---- //

const updateUserPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedUser = await userService.updateUserPlan(id, req.body, req.user);
    return res.status(200).json(updatedUser);
  } catch (error) {
    return res.status(getErrorStatus(error)).json({ error: error.message });
  }
};

module.exports = {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getDeletedUsersLog,
  updateUserPlan,
};