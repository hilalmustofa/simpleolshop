const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const checkAuth = require("../middleware/check-auth");

router.post("/signup", (req, res, next) => {
  User.find({ email: req.body.email })
    .exec()
    .then((user) => {
      if (user.length >= 1) {
        return res.status(422).json({
          code: 422,
          message: "Email is already registered",
        });
      } else {
        bcrypt.hash(req.body.password, 10, (err, hash) => {
          if (err) {
            return res.status(500).json({
              error: err,
            });
          } else {
            const newUser = new User({
              _id: new mongoose.Types.ObjectId(),
              email: req.body.email,
              password: hash,
            });
            newUser
              .save()
              .then((result) => {
                res.status(201).json({
                  code: 201,
                  message: "User created",
                  user: {
                    _id: result._id,
                    email: result.email,
                  }
                });
              })
              .catch((err) => {
                console.log(err);
                res.status(500).json({
                  error: err,
                });
              });
          }
        });
      }
    });
});


router.get("/", (req, res, next) => {
  const per_page = parseInt(req.query.per_page) || 10;
  const page = parseInt(req.query.page) || 1;

  User.find()
    .skip((page - 1) * per_page)
    .limit(per_page)
    .select("_id email")
    .exec()
    .then((users) => {
      User.countDocuments().exec((err, count) => {
        if (err) {
          console.error(err);
          return res.status(500).json({
            error: err,
          });
        }

        res.status(200).json({
          code: 200,
          users: users.map((user) => {
            return {
              _id: user._id,
              email: user.email,
            };
          }),
          total: count,
          page: page,
          per_page: per_page,
          message: "Success get all users",
        });
      });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({
        error: err,
      });
    });
});


router.post("/login", (req, res, next) => {
  User.find({ email: req.body.email })
    .exec()
    .then((user) => {
      if (user.length < 1) {
        return res.status(401).json({
          code: 401,
          message: "Email is not registered",
        });
      }
      bcrypt.compare(req.body.password, user[0].password, (err, result) => {
        if (err) {
          return res.status(401).json({
            code: 401,
            message: "Auth failed",
          });
        }
        if (result) {
          const token = jwt.sign(
            {
              email: user[0].email,
              user: user[0]._id,
            },
            "secret",
            {
              expiresIn: "10h",
            }
          );
          return res.status(200).json({
            code: 200,
            token: token,
            message: "User logged in successfully",
          });
        }
        return res.status(401).json({
          message: "Incorrect password",
        });
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({
        error: err,
      });
    });
});

router.delete("/:userId", checkAuth, (req, res, next) => {
  User.remove({ _id: req.params.userId })
    .exec()
    .then((result) => {
      if (result.deletedCount >= 1) {
        res.status(200).json({
          code: 200,
          message: "User successfully deleted!",
        });
      } else {
        res.status(404).json({
          code: 404,
          message: "User not found",
        });
      }
    });
});

module.exports = router;
