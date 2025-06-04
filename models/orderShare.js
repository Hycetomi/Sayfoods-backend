import { Schema, model } from "mongoose";

const orderShareSchema = new Schema({
  productName: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  portion: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  phone: {
    type: Number,
    required: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  status: {
    type: String,
    required: true,
    enum: ["sent", "rejected", "accepted"],
    default: "sent",
  },
});

export default model("OrderSharing", orderShareSchema);
