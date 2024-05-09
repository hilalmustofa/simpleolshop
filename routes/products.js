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
  windowMs: 3 * 60 * 1000,
  max: 9,
  standardHeaders: true,
  legacyHeaders: false,
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
      if (err && err.name && err.name === 'MulterError') {
        return res.status(500).send({
          error: err.name,
          message: `File upload error: ${err.message}`,
        });
      }
      if (err) {
        return res.status(422).send({
          error: 'file upload error',
          message: `File format is not supported, gambar aja cuy max 1mb`,
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
    fileSize: 1024 * 1024 * 1,
  },
  fileFilter: uploadFilter,
});

const checkFile = handleUploadError(upload.single('picture'));

router.get("/", (req, res, next) => {
  const per_page = parseInt(req.query.per_page) || 10;
  const page = parseInt(req.query.page) || 1;
  const searchTerm = req.query.name;

  let query = Product.find();
  if (searchTerm) {
    query = query.find({ name: { $regex: searchTerm, $options: "i" } });
  }

  query
    .skip((page - 1) * per_page)
    .limit(per_page)
    .select("name description price _id picture")
    .exec()
    .then((products) => {
      Product.countDocuments(query).exec((err, count) => {
        if (err) {
          console.error(err);
          return res.status(500).json({
            error: err,
          });
        }

        const response = {
          code: 200,
          products: products.map((product) => {
            return {
              id: product._id,
              name: product.name,
              description: product.description,
              price: product.price,
              picture: process.env.baseurl + "/" + product.picture,
            };
          }),
          total: count,
          per_page: per_page,
          page: page,
        };
        res.status(200).json(response);
      });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({
        error: err,
      });
    });
});


router.post("/", apiLimiter,
  [checkAuth, checkFile,
    check("name", "name length should be 3 to 50 characters").isLength({
      min: 3,
      max: 50,
    }),
    check("description", "description length should be 3 to 300 characters").isLength({
      min: 3,
      max: 300,
    }),
    check("price", "price length should be 3 to 20 characters").isLength({
      min: 3,
      max: 20,
    }),
  ],
  (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(error => error.msg);
      return res.status(422).json({ code: 422, message: errorMessages[0] });
    }

    Product.findOne({ name: req.body.name })
      .exec()
      .then((existingProduct) => {
        if (existingProduct) {
          return res.status(422).json({
            code: 422,
            message: "Product name already exists",
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
              code: 201,
              product: {
                id: result.id,
                name: result.name,
                description: result.description,
                price: result.price,
                picture: process.env.baseurl + "/" + result.picture.replace("\\", "/"),
              },
              message: "Product created successfully",
            });
          })
          .catch((error) => {
            console.log(error);
            res.status(500).json({ error: error.message });
          });
      })
      .catch((error) => {
        console.log(error);
        res.status(500).json({ error: error.message });
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
          code: 200,
          product: {
            id: result.id,
            name: result.name,
            description: result.description,
            price: result.price,
            picture: process.env.baseurl + "/" + result.picture,
          },
          message: "Get single product sucess",
        });
      } else {
        res.status(404).json({ message: "Product not found" });
      }
    });
});

router.put("/:id",
  [
    checkAuth,
    check("name", "name length should be 5 to 50 characters").isLength({
      min: 5,
      max: 50,
    }),
    check("description", "description length should be 3 to 300 characters").isLength({
      min: 3,
      max: 300,
    }),
    check("price", "price length should be 3 to 20 characters").isLength({
      min: 3,
      max: 20,
    }),
  ],
  (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(error => error.msg);
      return res.status(422).json({ code: 422, message: errorMessages[0] });
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
            code: 200,
            message: "Product edited successfully"
          });
        } else {
          res.status(404).json({
            code: 404,
            message: "Product not found"
          });
        }
      })
      .catch((err) => {
        res.status(500).json({
          error: err.message,
        });
      });
  }
);

const checkHeader = (req, res, next) => {
  const headerName = "X-Destroy-Signature";
  const headerValue = "gaskeun";

  if (req.headers[headerName.toLowerCase()] !== headerValue) {
    return res.status(403).json({
      code: 403,
      message: "Forbidden: Access to this endpoint is not allowed",
    });
  }
  
  next();
};


router.delete("/destroy", checkAuth, checkHeader, (req, res, next) => {
  Product.deleteMany({})
    .exec()
    .then((result) => {
      if (result.deletedCount > 0) {
        res.status(200).json({
          code: 200,
          message: "All products deleted successfully",
        });
      } else {
        res.status(404).json({
          code: 404,
          message: "There are no products to delete",
        });
      }
    })
    .catch((err) => {
      res.status(500).json({
        error: err.message,
      });
    });
});

router.delete("/:id", checkAuth, (req, res, next) => {
  const id = req.params.id;
  Product.deleteOne({ _id: id })
    .exec()
    .then((result) => {
      if (result.deletedCount == 1) {
        res.status(200).json({
          code: 200,
          message: "Product deleted successfully",
        });
      } else {
        res.status(422).json({
          code: 422,
          message: "Error ngap, Check your productId",
        });
      }
    });
});




module.exports = router;
