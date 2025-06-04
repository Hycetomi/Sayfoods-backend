import { Schema, model } from "mongoose";

const shareSchema = new Schema({
  productName: {
    type: String,
    required: true,
    unique: true,
  },
  portion: {
    type: [String],
    required: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

export default model("Sharing", shareSchema);
