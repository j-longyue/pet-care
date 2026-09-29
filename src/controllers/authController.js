const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const userRepository = require("../repositories/userRepository");
const passwordResetService = require("../services/passwordResetService");

const DUMMY_HASH = "$2a$10$CwTycUXWue0Thq9StjUM0uJ8i8/8xI.pQrsB3z2m6WQ8XmyKfDeMy";

const login = async (req, res) => {
  const { identifier, email, username, password } = req.body;
  const loginInput = identifier || email || username;

  if (typeof loginInput !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "E-mail/username and password are required." });
  }

  const trimmedInput = loginInput.trim();

  if (!trimmedInput || !password) {
    return res.status(400).json({ error: "E-mail/username and password are required." });
  }

  try {
    const user = await userRepository.findByEmailOrUsername(trimmedInput.toLowerCase(), trimmedInput);

    if (!user) {
      await bcrypt.compare(password, DUMMY_HASH);
      return res.status(401).json({ error: "Invalid e-mail, username or password." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid e-mail, username or password." });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error("CRITICAL ERROR: JWT_SECRET not defined in environment variables.");
      return res.status(500).json({ error: "Internal server configuration error." });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, jwtSecret, {
      expiresIn: "2d",
    });

    return res.status(200).json({
      message: "Login successful.",
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({ error: "Unexpected error during authentication." });
  }
};

// ---- RESET PASSWORD ---- //

const forgotPassword = async (req, res) => {
  try {
    const { identifier, email, username } = req.body;
    const loginInput = identifier || email || username;

    if (typeof loginInput !== "string" || !loginInput.trim()) {
      throw new Error("Enter your e-mail or username.");
    }

    const result = await passwordResetService.requestPasswordReset(loginInput.trim());
    return res.status(200).json(result);
  } catch (error) {
    console.error("Forgot password error:", error.message);
    return res.status(400).json({ error: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (typeof token !== "string" || !token.trim() || typeof newPassword !== "string") {
      throw new Error("Invalid token or new password.");
    }

    const result = await passwordResetService.resetPassword(token, newPassword);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

module.exports = { login, forgotPassword, resetPassword };