import { Schema, model } from "mongoose";

const orderSchema = new Schema(
  {
    orderItems: [
      {
        name: { type: String, required: true },
        price: { type: Number, required: true, min: 0 },
        image: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        productId: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
      },
    ],
    shippingAddress: {
      fullName: { type: String, required: true, trim: true },
      email: { type: String, required: true },
      state: { type: String, required: true, trim: true },
      address: { type: String, required: true, trim: true },
      country: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true },
      postalCode: { type: String, required: true, trim: true },
      phone: { type: String },
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    priceDetails: {
      subTotal: { type: Number, required: true, min: 0 },
      taxPrice: { type: Number, default: 0, min: 0 },
      shippingPrice: { type: Number, default: 0, min: 0 },
      totalPrice: { type: Number, required: true, min: 0 },
    },
    orderStatus: {
      type: String,
      required: true,
      enum: ["not_ordered", "processing", "shipped", "delivered", "cancelled"],
      default: "not_ordered",
    },
    paymentMethod: {
      type: String,
      enum: ["card", "bank_transfer", "ussd", "bank"],
    },
    paymentResult: {
      reference: { type: String }, // Paystack transaction reference
      status: { type: String }, // e.g., "success", "failed", "pending"
      gatewayResponse: { type: String }, // Paystack's response message
      paidAt: { type: Date }, // When payment was confirmed
      channel: { type: String }, // Specific channel used (e.g., "card", "bank_transfer", "ussd")
      email: { type: String }, // Customer email used for payments4
      amountPaid: { type: Number },
    },
    access_code: { type: String },
    access_code_createdAt: { type: Date },
    isPaid: { type: Boolean, default: false },
    paidAt: { type: Date },
    isDelivered: { type: Boolean, default: false },
    deliveredAt: { type: Date },
    transactionReference: { type: String }, // Paystack reference
  },
  { timestamps: true }
);

orderSchema.index(
  { transactionReference: 1 },
  {
    unique: true,
    partialFilterExpression: {
      transactionReference: { $exists: true, $ne: null },
    },
  }
);
orderSchema.index({ orderStatus: 1 }); // For filtering by status
orderSchema.index({ userId: 1, createdAt: -1 }); // For user order history

export default model("Order", orderSchema);
