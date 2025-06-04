import createHttpError from "http-errors";
import UserModel from "../models/user.js";
import bcrypt from "bcryptjs";

export const SignUp = async (req, res, next) => {
  try {
    const { userName, phone, password } = req.body;

    if (!userName || !phone || !password) {
      throw createHttpError(400, "All field are required");
    }

    const existingUser = await UserModel.findOne({ userName });
    if (existingUser) {
      throw createHttpError(409, "Username/Email already in use");
    }

    const newUser = await UserModel.create({
      userName,
      phone,
      password,
    });

    // Create session
    req.session.user = {
      _id: newUser._id,
      userName: newUser.userName,
      isAdmin: newUser.isAdmin,
    };

    res.status(201).json(req.session.user);
  } catch (error) {
    next(error);
  }
};

export const SignIn = async (req, res, next) => {
  try {
    const { userName, password } = req.body;

    if (!userName || !password) {
      throw createHttpError(400, "All field are required");
    }

    const existingUser = await UserModel.findOne({ userName });
    if (!existingUser) {
      throw createHttpError(409, "Invalid credentials");
    }

    const matchPassword = await existingUser.matchPassword(password);
    if (!matchPassword) {
      throw createHttpError(409, "Invalid credentials");
    }

    // Create session
    req.session.user = {
      _id: existingUser._id,
      userName: existingUser.userName,
      isAdmin: existingUser.isAdmin,
    };

    res.status(200).json(req.session.user);
  } catch (error) {
    next(error);
  }
};

export const LogOut = async (req, res, next) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        throw createHttpError(400, "Failed to log out");
      }
    });

    res.clearCookie("SAYFOODS");
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
};

export const GetUserDetails = async (req, res, next) => {
  try {
    const userId = req.session.user._id;
    const user = await UserModel.findById(userId).select("-password");
    if (!user) {
      throw createHttpError(404, "Seems your account has been deleted");
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
};

export const EditUserDetails = async (req, res, next) => {
  try {
    const userId = req.session.user._id;

    const { userName, phone, country, state, city, address, postalCode } =
      req.body;
    if (!userName || !phone) {
      throw createHttpError(400, "Username and phone is compulsory");
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      throw createHttpError(404, "Seems your account has been deleted");
    }

    if (userName !== user.userName) {
      const userNameExists = await UserModel.findOne({
        userName,
      });
      if (userNameExists) {
        throw createHttpError(409, "Username already in use");
      }
      // create new session because userName changed
      req.session.user = {
        _id: user._id,
        userName,
        isAdmin: user.isAdmin,
      };
    }

    const updateProfile = await UserModel.findByIdAndUpdate(
      userId,
      {
        userName,
        phone,
        country,
        state,
        city,
        address,
        postalCode,
      },
      { new: true }
    ).select("-password");

    res.status(200).json(updateProfile);
  } catch (error) {
    next(error);
  }
};

export const ChangePassword = async (req, res, next) => {
  try {
    const userId = req.session.user._id;
    const { newPassword, oldPassword } = req.body;

    const user = await UserModel.findById(userId);
    if (!user) {
      throw createHttpError(404, "Seems your account has been deleted");
    }

    const matchPassword = await user.matchPassword(oldPassword);
    if (!matchPassword) {
      throw createHttpError(400, "Password is not correct");
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);

    await UserModel.findByIdAndUpdate(
      userId,
      { password: hash },
      { new: true }
    );

    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    next(error);
  }
};
