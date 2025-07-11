import UserModel from "../models/user.js";
import ProductModel from "../models/product.js";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import { categories, categoryMap } from "../data.js";
import createHttpError from "http-errors";

dotenv.config();
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const GetProducts = async (req, res, next) => {
  try {
    const page = parseInt(req.params.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const [products, totalProducts] = await Promise.all([
      ProductModel.find()
        .sort({ createdAt: -1, _id: 1 })
        .skip(skip)
        .limit(limit),
      ProductModel.countDocuments(),
    ]);

    const totalPages = Math.ceil(totalProducts / limit);
    const hasMore = page < totalPages;

    res.status(200).json({
      products,
      currentPage: page,
      totalPages,
      hasMore,
    });
  } catch (error) {
    next(error);
  }
};

export const CreateProduct = async (req, res, next) => {
  try {
    const { _id } = req.session.user;
    const { name, description, price, category, image, stock, discount } =
      req.body;

    const requiredFields = { name, description, price, category, image, stock };
    for (const [field, value] of Object.entries(requiredFields)) {
      if (!value) {
        throw createHttpError(400, `${field} is required`);
      }
    }

    const normalizedName = name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ")
      .replace(/[^\w\s]/g, "");

    const existingProduct = await ProductModel.findOne({
      name: {
        $regex: new RegExp(
          `^${normalizedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
          "i"
        ),
      },
    });
    if (existingProduct) {
      throw createHttpError(
        400,
        "A product with this name (or very similar) already exists"
      );
    }

    const formattedCategory = categoryMap.get(
      category.toLowerCase().replace(/\s+/g, "")
    );
    if (!formattedCategory) {
      const validCategories = Array.from(categoryMap.values()).join(", ");
      throw createHttpError(
        400,
        `Invalid category. Valid options are: ${validCategories}`
      );
    }

    let imageUrl;
    try {
      const uploadResult = await cloudinary.uploader.upload(image, {
        folder: "SAYFOOD",
        resource_type: "image",
        format: "webp",
      });
      imageUrl = uploadResult.secure_url;
    } catch (uploadError) {
      throw createHttpError(500, "Failed to upload image to Cloudinary");
    }

    await ProductModel.create({
      name: name.trim(),
      description,
      price,
      category: formattedCategory,
      image: imageUrl,
      stock,
      discount,
      creator: _id,
    });

    res.status(201).json({ message: "Product created successfully" });
  } catch (error) {
    next(error);
  }
};

export const GetProduct = async (req, res, next) => {
  try {
    const { name } = req.params;
    const product = await ProductModel.findOne({ name });

    if (!product) {
      throw createHttpError(
        400,
        "Product not found. Most likely have been deleted"
      );
    }

    res.status(200).json(product);
  } catch (error) {
    next(error);
  }
};

export const EditProduct = async (req, res, next) => {
  try {
    const { _id, name, description, price, category, image, stock, discount } =
      req.body;

    const requiredFields = {
      _id,
      name,
      description,
      price,
      category,
      image,
      stock,
    };
    for (const [field, value] of Object.entries(requiredFields)) {
      if (!value) {
        throw createHttpError(400, `${field} is required`);
      }
    }

    const existingProduct = await ProductModel.findById(_id);
    if (!existingProduct) {
      throw createHttpError(404, "Product not found or may have been deleted");
    }

    if (name !== existingProduct.name) {
      const productWithNewName = await ProductModel.findOne({ name });
      if (productWithNewName) {
        throw createHttpError(
          400,
          "Product name already exists. Please choose a different name."
        );
      }
    }

    const formattedCategory = categoryMap.get(
      category.toLowerCase().replace(/\s+/g, "")
    );
    if (!formattedCategory) {
      const validCategories = Array.from(categoryMap.values()).join(", ");
      throw createHttpError(
        400,
        `Invalid category. Valid options are: ${validCategories}`
      );
    }

    let imageUrl = image;
    if (image && !image.includes("res.cloudinary.com")) {
      try {
        const uploadResult = await cloudinary.uploader.upload(image, {
          folder: "SAYFOOD",
          resource_type: "image",
        });
        imageUrl = uploadResult.secure_url;
      } catch (uploadError) {
        throw createHttpError(500, "Failed to upload image to Cloudinary");
      }
    }

    const updatedProduct = await ProductModel.findByIdAndUpdate(
      _id,
      {
        name,
        description,
        price: Number(price),
        category: formattedCategory,
        image: imageUrl,
        stock: Number(stock),
        discount: discount ? Number(discount) : 0,
      },
      { new: true, runValidators: true }
    );

    res.status(200).json(updatedProduct);
  } catch (error) {
    next(error);
  }
};

export const DeleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const deletedProduct = await ProductModel.findByIdAndDelete(id);
    if (!deletedProduct) {
      throw createHttpError(404, "Product not found or may have been deleted");
    }

    res.status(200).json(deletedProduct._id);
  } catch (error) {
    next(error);
  }
};

export const GetProductsByCategory = async (req, res, next) => {
  try {
    const { page = 1 } = req.query;
    const limit = 4;

    const { category } = req.params;
    const formattedCategory = categoryMap.get(
      category.toLowerCase().replace(/\s+/g, "")
    );
    if (!formattedCategory) {
      const validCategories = Array.from(categoryMap.values()).join(", ");
      throw createHttpError(
        400,
        `Invalid category. Valid options are: ${validCategories}`
      );
    }

    const pageNumber = parseInt(page);
    const pageSize = parseInt(limit);
    const skip = (pageNumber - 1) * pageSize;

    const products = await ProductModel.find({ category: formattedCategory })
      .sort({ createdAt: -1, _id: 1 })
      .skip(skip)
      .limit(pageSize);

    const totalProducts = await ProductModel.countDocuments({
      category: formattedCategory,
    });
    const totalPages = Math.ceil(totalProducts / limit);
    const hasMore = page < totalPages;

    res.status(200).json({
      products,
      currentPage: pageNumber,
      totalPages,
      hasMore,
    });
  } catch (error) {
    next(error);
  }
};

export const GetRandomCategory = async (req, res, next) => {
  try {
    const shuffled = categories.sort(() => 0.5 - Math.random());

    for (let i = 0; i < shuffled.length; i++) {
      const catKey = shuffled[i];

      const count = await ProductModel.countDocuments({ category: catKey });
      if (count >= 3) {
        const limit = Math.min(count, 6);
        const products = await ProductModel.find({ category: catKey })
          .limit(limit)
          .sort({ createdAt: -1, _id: 1 });
        return res.status(200).json({
          category: catKey,
          products,
        });
      }
    }

    throw createHttpError(404, "No category with enough products found");
  } catch (error) {
    next(error);
  }
};

export const SearchProducts = async (req, res, next) => {
  try {
    const search = req.query.search;
    const page = parseInt(req.query.page) || 1;
    const limit = 1;
    const skip = (page - 1) * limit;

    if (!search || typeof search !== "string" || search.trim().length < 2) {
      throw createHttpError(
        400,
        "Search term must be at least 2 characters long"
      );
    }

    // Add secondary sort criteria (_id) to ensure consistent ordering
    const [productsSearch, totalProductsSearch] = await Promise.all([
      ProductModel.find(
        { $text: { $search: search } },
        { score: { $meta: "textScore" } }
      )
        .sort({ score: { $meta: "textScore" }, _id: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ProductModel.countDocuments({ $text: { $search: search } }),
    ]);

    const totalPages = Math.ceil(totalProductsSearch / limit);
    const hasMore = page < totalPages;

    res.status(200).json({
      products: productsSearch,
      currentPage: page,
      totalPages,
      hasMore,
    });
  } catch (error) {
    next(error);
  }
};
