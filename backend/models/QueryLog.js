import mongoose from "mongoose";
const QueryLogSchema = new mongoose.Schema({
  query: { type: String, required: true },
  answer: { type: String, required: true },
  model: { type: String, required: true },
  meta: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now },
});
export default mongoose.models.QueryLog ||
  mongoose.model("QueryLog", QueryLogSchema);
