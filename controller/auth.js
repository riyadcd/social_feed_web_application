const { validationResult } = require('express-validator/check');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/user');

exports.signup = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error('Validation failed.');
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }

    const { email, name, password } = req.body;

    const hashedPw = await bcrypt.hash(password, 12);

    const user = await User.create({
      email: email,
      password: hashedPw,
      name: name
    });

    res.status(201).json({
      message: 'User created!',
      userId: user.id // ✅ Sequelize uses id (not _id)
    });

  } catch (err) {
    err.statusCode = err.statusCode || 500;
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({
      where: { email: email } // ✅ REQUIRED in Sequelize
    });

    if (!user) {
      const error = new Error('A user with this email could not be found.');
      error.statusCode = 401;
      throw error;
    }

    const isEqual = await bcrypt.compare(password, user.password);

    if (!isEqual) {
      const error = new Error('Wrong password!');
      error.statusCode = 401;
      throw error;
    }

    const token = jwt.sign(
      {
        email: user.email,
        userId: user.id // ✅ not _id
      },
      'somesupersecretsecret',
      { expiresIn: '1h' }
    );

    res.status(200).json({
      token: token,
      userId: user.id
    });

  } catch (err) {
    err.statusCode = err.statusCode || 500;
    next(err);
  }
};