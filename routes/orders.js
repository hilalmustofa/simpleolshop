const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Order = require("../models/order");
const Product = require("../models/product");
const checkAuth = require("../middleware/check-auth");

router.get("/", checkAuth, (req, res, next) => {
  Order.find()
    .select("product quantity _id")
    .exec()
    .then((result) => {
      res.status(200).json({
        count: result.length,
        orders: result.map((result) => {
          return {
            id: result.id,
            product: result.product,
            quantity: result.quantity,
          };
        }),
      });
    })
    .catch((err) => {
      res.status(500).json({
        error: err,
      });
    });
});

router.post("/", checkAuth, (req, res, next) => {
  Product.findById(req.body.product).then((product) => {
    if (!product) {
      return res.status(404).json({
        error: "Product not found",
      });
    } else {
      const order = new Order({
        _id: mongoose.Types.ObjectId(),
        product: req.body.product,
        quantity: req.body.quantity,
      });
      return order.save().then((result) => {
        console.log(result);
        res.status(201).json({
          message: "Order placed, thank you",
          orderId: result.id,
          product: result.product,
          quantity: result.quantity,
        });
      });
    }
  });
});

router.get("/:orderId", checkAuth, (req, res, next) => {
  Order.findById(req.params.orderId)
    .exec()
    .then((order) => {
      console.log(order);
      if (!order) {
        return res.status(404).json({
          message: "Order not found",
        });
      }
      res.status(200).json({
        order: order,
      });
    })
    .catch((err) => {
      res.status(500).json({
        error: err,
      });
    });
});

router.delete("/:orderId", checkAuth, (req, res, next) => {
  Order.deleteOne({ _id: req.params.orderId })
    .exec()
    .then((order) => {
      if (!order) {
        return res.status(404).json({
          message: "Order not found",
        });
      }
      res.status(200).json({
        message: "Order deleted successfully",
      });
    })
    .catch((err) => {
      res.status(500).json({
        error: err,
      });
    });
});

module.exports = router;
