import createHttpError from "http-errors";
import UserModel from "../models/user.js";

export const auth = async (req, _res, next) => {
  try {
    if (!req.session.user?._id) {
      throw createHttpError(401, "Authentication failed: No session found");
    }
    next();
  } catch (error) {
    next(error);
  }
};

export const authAdmin = async (req, _res, next) => {
  try {
    if (!req.session.user?.isAdmin) {
      throw createHttpError(401, "Only an admin can perform this action");
    }

    const userExists = await UserModel.findById(req.session.user._id);
    if (!userExists) {
      throw createHttpError(401, "This account does not exist");
    }

    next();
  } catch (error) {
    next(error);
  }
};
