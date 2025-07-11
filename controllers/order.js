import UserModel from "../models/user.js";
import ProductModel from "../models/product.js";
import OrderModel from "../models/order.js";
import createHttpError from "http-errors";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const PAYSTACK_KEY =
  process.env.NODE_ENV === "development"
    ? process.env.PAYSTACK_TEST_SECRET_KEY
    : process.env.PAYSTACK_LIVE_SECRET_KEY;

export const CreateOrder = async (req, res, next) => {
  try {
    const userId = req.session.user._id;
    const user = await UserModel.findById(userId);
    if (!user) {
      throw createHttpError(404, "Seems your account has been deleted");
    }

    const { orderItems, shippingAddress, priceDetails } = req.body;
    if (
      !orderItems ||
      !orderItems.length ||
      !shippingAddress ||
      !priceDetails
    ) {
      throw createHttpError(400, `Missing required fields`);
    }

    //validate every orderItem exists
    const invalidItems = [];
    for (const item of orderItems) {
      const existItem = await ProductModel.findById(item.productId);
      if (!existItem) {
        invalidItems.push(item.name);
      }
    }
    if (invalidItems.length > 0) {
      throw createHttpError(
        400,
        `Product(s) not found: ${invalidItems.join(
          ", "
        )}. Please remove these items from your cart.`
      );
    }

    const order = new OrderModel({
      orderItems,
      shippingAddress,
      userId,
      priceDetails,
      orderStatus: "not_ordered",
    });

    const createdOrder = await order.save();
    res.status(201).json(createdOrder._id);
  } catch (error) {
    next(error);
  }
};

export const InitializePayment = async (req, res, next) => {
  try {
    const { orderId, email } = req.body;
    if (!orderId || !email) {
      throw createHttpError(400, `Missing orderId or email`);
    }

    const order = await OrderModel.findById(orderId);
    if (!order) {
      throw createHttpError(404, `Order not found`);
    }
    if (order.isPaid) {
      throw createHttpError(400, `Order already paid`);
    }

    if (
      order.access_code &&
      new Date().getTime() - new Date(order.access_code_createdAt).getTime() <
        8 * 60 * 60 * 1000
    ) {
      console.log("access code came from here");
      return res.json({
        access_code: order.access_code,
      });
    }

    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email,
        amount: order.priceDetails.totalPrice * 100, // Convert to kobo
        channels: ["card", "bank_transfer", "ussd", "bank"],
        reference: `SAYFOODS_${order._id}_${Date.now()}`,
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    const { reference, access_code } = response.data.data;
    order.access_code = access_code;
    order.access_code_createdAt = new Date();
    order.transactionReference = reference;
    order.paymentResult = {
      ...order.paymentResult,
      status: "pending",
      reference,
    };
    await order.save();

    res.json({
      access_code,
    });
  } catch (error) {
    next(error);
  }
};

export const VerifyPayment = async (req, res, next) => {
  try {
    const { reference } = req.body;
    if (!reference) {
      throw createHttpError(400, `Reference is required`);
    }

    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_KEY}`,
        },
      }
    );

    const { status, amount, customer, gateway_response, channel } =
      response.data.data;

    const order = await OrderModel.findOne({
      transactionReference: reference,
    });
    if (!order) {
      throw createHttpError(400, `Order not found`);
    }

    if (status === "success") {
      order.isPaid = true;
      order.paidAt = new Date();
      order.orderStatus = "processing";
      order.paymentMethod = channel;
      order.paymentResult = {
        reference,
        status,
        gatewayResponse: gateway_response,
        paidAt: new Date(),
        channel,
        email: customer.email,
        amountPaid: amount / 100,
      };
      await order.save();
      res.json("Verification Successful");
    } else {
      order.paymentResult = {
        ...order.paymentResult,
        status: status === "pending" ? "pending" : "failed",
        gatewayResponse: gateway_response,
        channel,
        email: customer.email,
      };
      await order.save();
      throw createHttpError(
        400,
        `Payment is ${status}. Please try again later if pending.`
      );
    }
  } catch (error) {
    next(error);
  }
};

export const GetOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await OrderModel.findById(id)
      .select("-access_code -access_code_createdAt")
      .populate("userId", "_id userName isAdmin");
    if (!order) {
      throw createHttpError(404, "Order not found");
    }
    res.json(order);
  } catch (error) {
    next(error);
  }
};

export const GetUserOrders = async (req, res, next) => {
  try {
    const page = parseInt(req.params.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const userId = req.session.user._id;
    const user = await UserModel.findById(userId);
    if (!user) {
      throw createHttpError(404, "Seems your account has been deleted");
    }

    const [orders, totalProducts] = await Promise.all([
      OrderModel.find({ userId })
        .select("-access_code -access_code_createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("userId", "_id userName isAdmin"),
      OrderModel.countDocuments({ userId }),
    ]);

    const totalPages = Math.ceil(totalProducts / limit);
    const hasMore = page < totalPages;

    res.status(200).json({
      orders,
      currentPage: page,
      totalPages,
      hasMore,
    });
  } catch (error) {
    next(error);
  }
};

export const GetDashboardData = async (req, res, next) => {
  try {
    const [
      userCount,
      orderCount,
      orderPendingCount,
      orderShippedCount,
      orderDeliveredCount,
      orderCancelledCount,
    ] = await Promise.all([
      UserModel.countDocuments(),
      OrderModel.countDocuments({
        orderStatus: {
          $in: ["shipped", "delivered", "processing", "cancelled"],
        },
      }),
      OrderModel.countDocuments({ orderStatus: "processing" }),
      OrderModel.countDocuments({ orderStatus: "shipped" }),
      OrderModel.countDocuments({ orderStatus: "delivered" }),
      OrderModel.countDocuments({ orderStatus: "cancelled" }),
    ]);

    const revenue = await OrderModel.aggregate([
      {
        $match: {
          orderStatus: { $in: ["shipped", "delivered", "processing"] },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$paymentResult.amountPaid" },
        },
      },
    ]);
    const totalRevenue = revenue[0]?.totalRevenue || 0;

    res.status(200).json({
      userCount,
      orderCount,
      orderPendingCount,
      orderShippedCount,
      orderDeliveredCount,
      orderCancelledCount,
      totalRevenue,
    });
  } catch (error) {
    next(error);
  }
};

export const GetAllOrders = async (req, res, next) => {
  try {
    const page = parseInt(req.params.page) || 1;
    const status = req.query.status;

    const limit = 5;
    const skip = (page - 1) * limit;

    const validStatuses = ["shipped", "delivered", "processing", "cancelled"];
    let query = {};
    if (status && status !== "") {
      if (!validStatuses.includes(status)) {
        throw createHttpError(
          400,
          `Invalid status. Must be one of: ${validStatuses.join(", ")}`
        );
      }
      query = { orderStatus: status };
    } else {
      query = { orderStatus: { $in: validStatuses } };
    }

    const [orders, totalProducts] = await Promise.all([
      OrderModel.find(query)
        .select("-access_code -access_code_createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("userId", "_id userName isAdmin"),
      OrderModel.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalProducts / limit);
    const hasMore = page < totalPages;

    res.status(200).json({
      orders,
      currentPage: page,
      totalPages,
      hasMore,
    });
  } catch (error) {
    next(error);
  }
};

export const UpdateOrderStatus = async (req, res, next) => {
  try {
    const { status, orderId } = req.query;
    if (!orderId || !status) {
      throw createHttpError(400, "Missing orderId or status");
    }

    const validStatuses = ["processing", "shipped", "delivered", "cancelled"];
    if (!validStatuses.includes(status)) {
      throw createHttpError(
        400,
        "Invalid status. Must be one of: " + validStatuses.join(", ")
      );
    }

    const order = await OrderModel.findById(orderId)
      .select("-access_code -access_code_createdAt")
      .populate("userId", "_id userName isAdmin");
    if (!order) {
      throw createHttpError(400, "Order not found");
    }

    if (status === "delivered") {
      (order.orderStatus = status), (order.isDelivered = true);
      order.deliveredAt = new Date();
    } else {
      (order.orderStatus = status), (order.isDelivered = false);
      order.deliveredAt = null;
    }

    const updatedOrder = await order.save();

    res.status(200).json(updatedOrder);
  } catch (error) {
    next(error);
  }
};

export const SearchOrder = async (req, res, next) => {
  try {
    const { orderId } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    if (!orderId || typeof orderId !== "string" || orderId.trim().length < 4) {
      throw createHttpError(400, "Search term must be at least 4 characters");
    }

    const matchStage = {
      $match: {
        $and: [
          {
            $expr: {
              $regexMatch: {
                input: { $toString: "$_id" },
                regex: orderId,
                options: "i",
              },
            },
          },
          {
            orderStatus: { $ne: "not_ordered" },
          },
        ],
      },
    };

    const [orders, totalOrders] = await Promise.all([
      OrderModel.aggregate([
        matchStage,
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
      ]),
      OrderModel.aggregate([matchStage, { $count: "count" }]),
    ]);

    const totalCount = totalOrders[0]?.count || 0;
    const totalPages = Math.ceil(totalCount / limit);
    const hasMore = page < totalPages;

    res.status(200).json({
      orders,
      currentPage: page,
      totalPages,
      hasMore,
    });
  } catch (error) {
    next(error);
  }
};
