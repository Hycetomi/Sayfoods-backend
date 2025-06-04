import createHttpError from "http-errors";
import FoodShareModel from "../models/foodShare.js";
import ProductModel from "../models/product.js";
import UserModel from "../models/user.js";
import OrderShareModel from "../models/orderShare.js";

export const CreateFoodShare = async (req, res, next) => {
  try {
    const { _id } = req.session.user;
    const { productName, portion } = req.body;
    if (!productName || !portion || portion.length === 0) {
      throw createHttpError(400, "Missing parameters");
    }

    const existingProduct = await ProductModel.findOne({ name: productName });

    if (!existingProduct) {
      throw createHttpError(
        401,
        "You can't create this food share as the food item does not exist"
      );
    }

    const existingFoodShare = await FoodShareModel.findOne({ productName });
    if (existingFoodShare) {
      throw createHttpError(400, "Food share item already exist");
    }

    await FoodShareModel.create({
      productName,
      portion,
      userId: _id,
    });

    res.status(201).json({ message: "Food share item created successfully" });
  } catch (error) {
    next(error);
  }
};

export const UpdateFoodShare = async (req, res, next) => {
  try {
    const { id, productName, portion } = req.body;
    if (id || !productName || !portion) {
      throw createHttpError(400, "Missing parameters");
    }

    const existingFoodShare = await FoodShareModel.findById(id);
    if (!existingFoodShare) {
      throw createHttpError(
        404,
        "Food share item not found or may have been deleted"
      );
    }

    if (productName !== existingFoodShare.productName) {
      const existingProduct = await ProductModel.findOne({ name: productName });
      if (!existingProduct) {
        throw createHttpError(
          401,
          `You can't update this food share item name to ${productName} as the food item does not exist`
        );
      }

      const foodShareWithNewName = await FoodShareModel.findOne({
        productName,
      });
      if (foodShareWithNewName) {
        throw createHttpError(
          400,
          "Food share name already exists. Please choose a different name."
        );
      }
    }

    const updatedFoodShare = await FoodShareModel.findByIdAndUpdate(id, {
      productName,
      portion,
    });

    res.status(200).json(updatedFoodShare);
  } catch (error) {
    next(error);
  }
};

export const DeleteFoodShare = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deletedFoodShare = await FoodShareModel.findByIdAndDelete(id);

    if (!deletedFoodShare) {
      throw createHttpError(
        404,
        "Food share not found or may have been deleted"
      );
    }

    res.status(200).json(deletedFoodShare._id);
  } catch (error) {
    next(error);
  }
};

export const GetFoodShares = async (_req, res, next) => {
  try {
    const foodShares = await FoodShareModel.find();
    res.status(200).json(foodShares);
  } catch (error) {
    next(error);
  }
};

export const GetAllProductsNames = async (req, res, next) => {
  try {
    const products = await ProductModel.find({}, { name: 1, _id: 0 });

    const formatted = products.map((product) => ({
      key: product.name,
      value: product.name,
    }));

    res.status(200).json(formatted);
  } catch (error) {
    next(error);
  }
};

export const GetFoodShare = async (req, res, next) => {
  try {
    const { productName } = req.params;
    const foodShare = await FoodShareModel.findOne({ productName });

    if (!foodShare) {
      throw createHttpError(
        400,
        "Food share item not found. Most likely have been deleted"
      );
    }

    res.status(200).json(foodShare);
  } catch (error) {
    next(error);
  }
};

export const CreateOrderShare = async (req, res, next) => {
  try {
    const userId = req.session.user._id;
    const user = await UserModel.findById(userId);
    if (!user) {
      throw createHttpError(404, "Seems your account has been deleted");
    }

    const { productName, portion, name, address, phone } = req.body;
    if (!productName || !portion || !name || !address || !phone) {
      throw createHttpError(400, `Missing required fields`);
    }

    const checkOrderShareIsInFoodShare = await FoodShareModel.findOne({
      productName,
    });
    if (!checkOrderShareIsInFoodShare) {
      throw createHttpError(
        400,
        "This item no longer exist as a food share item"
      );
    }

    const orderShare = new OrderShareModel({
      productName,
      portion,
      name,
      address,
      phone,
      userId,
      status: "sent",
    });

    await orderShare.save();
    res.status(201).json({ message: "Food share item created successfully" });
  } catch (error) {
    next(error);
  }
};

export const GetAllOrderShares = async (_req, res, next) => {
  try {
    const allOrderShares = await OrderShareModel.find();
    res.status(200).json({ orderShares: allOrderShares });
  } catch (error) {
    next(error);
  }
};
