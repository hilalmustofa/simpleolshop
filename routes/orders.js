const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Order = require("../models/order");
const Product = require("../models/product");
const checkAuth = require("../middleware/check-auth");

router.get("/", checkAuth, (req, res, next) => {
  const per_page = parseInt(req.query.per_page) || 10;
  const page = parseInt(req.query.page) || 1;
  const searchTerm = req.query.name;

  let query = Order.find().populate({
    path: 'product',
    match: searchTerm ? { name: { $regex: searchTerm, $options: "i" } } : {}
  });

  query
    .select("product quantity _id")
    .skip((page - 1) * per_page)
    .limit(per_page)
    .exec()
    .then((result) => {
      const response = {
        code: 200,
        orders: result.map((order) => {
          const productData = order.product ? {
            id: order.product._id,
            name: order.product.name,
            description: order.product.description,
            price: order.product.price,
            picture: process.env.baseurl + "/" + order.product.picture,
          } : null;

          return {
            id: order._id,
            product: productData,
            quantity: order.quantity,
          };
        }),
        page: page,
        per_page: per_page,
        total: result.length
      };

      res.status(200).json(response);
    })
    .catch((err) => {
      res.status(500).json({
        error: err.toString(),
      });
    });
});



router.post("/", checkAuth, (req, res, next) => {
  Product.findById(req.body.product)
    .then((product) => {
      if (!product) {
        return res.status(404).json({
          code: 404,
          error: "Product not found",
        });
      } else {
        const order = new Order({
          _id: mongoose.Types.ObjectId(),
          product: req.body.product,
          quantity: req.body.quantity,
        });
        return order.save()
          .then((result) => {
            const productData = {
              id: product._id,
              name: product.name,
              description: product.description,
              price: product.price,
              picture: process.env.baseurl + "/" + product.picture,
            };

            res.status(201).json({
              code: 201,
              orderId: result.id,
              product: productData,
              quantity: result.quantity,
              message: "Order placed, thank you",
            });
          });
      }
    })
    .catch((err) => {
      res.status(500).json({
        error: err.message,
      });
    });
});


router.get("/:orderId", checkAuth, (req, res, next) => {
  Order.findById(req.params.orderId)
    .populate('product')
    .exec()
    .then((order) => {
      console.log(order);
      if (!order) {
        return res.status(404).json({
          code: 404,
          message: "Order not found",
        });
      }

      const response = {
        code: 200,
        order: {
          id: order._id,
          product: {
            id: order.product._id,
            name: order.product.name,
            description: order.product.description,
            price: order.product.price,
            picture: process.env.baseurl + "/" + order.product.picture,
          },
          quantity: order.quantity
        },
        message: "Get single order sucess",
      };

      res.status(200).json(response);
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
          code: 404,
          message: "Order not found",
        });
      }
      res.status(200).json({
        code: 200,
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
