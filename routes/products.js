const express = require("express");
const { check, validationResult } = require("express-validator");
const router = express.Router();
const mongoose = require("mongoose");
const Product = require("../models/product");
const multer = require("multer");
require("dotenv").config();
const checkAuth = require("../middleware/check-auth");
const rateLimit = require('express-rate-limit')

const apiLimiter = rateLimit({
	windowMs: 3 * 60 * 1000, // 3 minutes
	max: 9, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
})

const formatRupiah = (money) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(money);
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

function handleUploadError(multerUploadFunction) {
  return (req, res, next) =>
    multerUploadFunction(req, res, err => {
      // handle Multer error
      if (err && err.name && err.name === 'MulterError') {
        return res.status(500).send({
          error: err.name,
          message: `File upload error: ${err.message}`,
        });
      }
      // handle other errors
      if (err) {
        return res.status(422).send({
          error: 'file upload error',
          message: `File format is not supported, gambar wae nde max 5mb`,
        });
      }
      next();
    });
}

const uploadFilter = (req, file, cb) => {
  if (file.mimetype == "image/jpeg" || file.mimetype === "image/png") {
    cb(null, true);
  } else {
    cb(null, false);
    return cb(new Error("invalid mimtype"));
  }
};
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 5,
  },
  fileFilter: uploadFilter,
});

const checkFile = handleUploadError(upload.single('picture'));

router.get("/", (req, res, next) => {
  Product.find()
    .select("name description price _id product picture")
    .exec()
    .then((result) => {
      const response = {
        count: result.length,
        products: result.map((result) => {
          return {
            id: result.id,
            name: result.name,
            description: result.description,
            price: result.price,
            picture: process.env.baseurl + "/" + result.picture,
          };
        }),
      };
      if (result.length >= 0) {
        res.status(200).json(response);
      } else {
        res.status(404).json({
          message: "Product not found",
        });
      }
    });
});

router.post("/",apiLimiter,
  [checkAuth, checkFile,
    check("name", "name length should be 3 to 50 characters").isLength({
      min: 3,
      max: 50,
    }),
    check("description", "price length should be 3 to 20 characters").isLength({
      min: 3,
      max: 200,
    }),
    check("price", "price length should be 3 to 20 characters").isLength({
      min: 3,
      max: 20,
    }),
  ],
  (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: "Minimal chars is 3 for all fields",
      });
    }

    const product = new Product({
      _id: new mongoose.Types.ObjectId(),
      product: new mongoose.Types.ObjectId(),
      name: req.body.name,
      description: req.body.description,
      price: formatRupiah(req.body.price),
      picture: req.file.path,
    });
    product
      .save()
      .then((result) => {
        console.log(result);
        res.status(201).json({
          message: "Product created successfully",
          product: {
            id: result.id,
            name: result.name,
            description: result.description,
            price: result.price,
            picture: process.env.baseurl + "/" + result.picture.replace("\\","/"),
          },
        });
      })
      .catch((error) => {
        console.log(error);
      });
  });

router.get("/:id", (req, res, next) => {
  const id = req.params.id;
  Product.findById(id)
    .select("name description price id picture")
    .exec()
    .then((result) => {
      if (result) {
        res.status(200).json({
          message: "Get single product sucess",
          product: {
            id: result.id,
            name: result.name,
            description: result.description,
            price: result.price,
            picture: process.env.baseurl + "/" + result.picture,
          },
        });
      } else {
        res.status(404).json({ message: "Product not found" });
      }
    });
});

router.put(
  "/:id",
  checkAuth,
  [
    check("name", "name length should be 5 to 50 characters").isLength({
      min: 3,
      max: 50,
    }),
    check("price", "price length should be 3 to 20 characters").isLength({
      min: 3,
      max: 20,
    }),
  ],
  (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: "Minimal chars is 3 for all fields",
      });
    }

    const id = req.params.id;
    const product = {
      name: req.body.name,
      description: req.body.description,
      price: formatRupiah(req.body.price),
    };
    Product.updateOne({ _id: id }, { $set: product })
      .exec()
      .then((result) => {
        if (result.modifiedCount == 1) {
          res.status(200).json({
            message: "Product edited successfully"
          });
        } else {
          res.status(404).json({
            error: "Error ngab",
            message: "Product not found"
          });
        }
      });
  }
);

router.delete("/:id", checkAuth, (req, res, next) => {
  const id = req.params.id;
  Product.deleteOne({ _id: id })
    .exec()
    .then((result) => {
      if (result.deletedCount == 1) {
        res.status(200).json({
          message: "Product deleted successfully",
        });
      } else {
        res.status(422).json({
          error: "Error ngab",
          message: "Check your productId",
        });
      }
    });
});

module.exports = router;
