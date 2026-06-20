const fs = require('fs');
const path = require('path');

const { check, validationResult } = require('express-validator');

const Post = require('../models/post');
const User = require('../models/user');
const io = require('../socket');

exports.getPosts = async (req, res, next) => {
  try {
    const currentPage = req.query.page || 1;
    const perPage = 2;

    const totalItems = await Post.count();

    const posts = await Post.findAll({
      populate:('creator'),
      offset: (currentPage - 1) * perPage,
      limit: perPage,
      include: User // optional (join)
    });

    res.status(200).json({
      message: 'Fetched posts successfully.',
      posts: posts,
      totalItems: totalItems
    });
  } catch (err) {
    err.statusCode = 500;
    next(err);
  }
};

exports.createPost = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error('Validation failed');
      error.statusCode = 422;
      throw error;
    }

    if (!req.file) {
      const error = new Error('No image provided.');
      error.statusCode = 422;
      throw error;
    }

    const imageUrl = req.file.path;
    const { title, content } = req.body;

    const user = await User.findByPk(req.userId);

    if (!user) {
      throw new Error('User not found');
    }

    const post = await user.createPost({
      title,
      content,
      imageUrl
    });
    io.getIo().emit('posts', {
      action: 'create',
      post: post,
      creator: {id: req.userId,name: user.name}
    })
    res.status(201).json({
      message: 'Post created successfully!',
      post: post,
      creator: { id: user.id, name: user.name }
    });

  } catch (err) {
    err.statusCode = err.statusCode || 500;
    next(err);
  }
};

exports.getPost = async (req, res, next) => {
  try {
    const post = await Post.findByPk(req.params.postId);

    if (!post) {
      const error = new Error('Could not find post.');
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({
      message: 'Post fetched.',
      post: post
    });

  } catch (err) {
    err.statusCode = err.statusCode || 500;
    next(err);
  }
};

exports.updatePost = async (req, res, next) => {
  try {
    const postId = req.params.postId;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error('Validation failed.');
      error.statusCode = 422;
      throw error;
    }

    const { title, content } = req.body;
    let imageUrl = req.body.image;

    if (req.file) {
      imageUrl = req.file.path;
    }

    if (!imageUrl) {
      const error = new Error('No file picked.');
      error.statusCode = 422;
      throw error;
    }

    const post = await Post.findByPk(postId);

    if (!post) {
      const error = new Error('Post not found.');
      error.statusCode = 404;
      throw error;
    }

    if (post.userId !== req.userId) {
      const error = new Error('Not authorized!');
      error.statusCode = 403;
      throw error;
    }

    if (imageUrl !== post.imageUrl) {
      clearImage(post.imageUrl);
    }

    post.title = title;
    post.content = content;
    post.imageUrl = imageUrl;

    const result = await post.save();

    io.getIo().emit('posts',{ action: 'update', post: result})

    res.status(200).json({
      message: 'Post updated!',
      post: result
    });

  } catch (err) {
    err.statusCode = err.statusCode || 500;
    next(err);
  }
};

exports.deletePost = async (req, res, next) => {
  try {
    const postId = req.params.postId;

    const post = await Post.findByPk(postId);

    if (!post) {
      const error = new Error('Post not found.');
      error.statusCode = 404;
      throw error;
    }

    if (post.userId !== req.userId) {
      const error = new Error('Not authorized!');
      error.statusCode = 403;
      throw error;
    }

    clearImage(post.imageUrl);

    await post.destroy(); // ✅ delete

    res.status(200).json({
      message: 'Deleted post.'
    });

  } catch (err) {
    err.statusCode = err.statusCode || 500;
    next(err);
  }
};

const clearImage = filePath => {
  filePath = path.join(__dirname, '..', filePath);
  fs.unlink(filePath, err => console.log(err));
};
