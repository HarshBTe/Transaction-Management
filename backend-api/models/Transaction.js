const mongoose = require('mongoose');


const transactionSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  title: { type: String, required: true },
  price: { type: Number, required: true },
  description: { type: String },
  category: { type: String },
  image: { type: String },
  sold: { type: Boolean, required: true },
  dateOfSale: { type: Date, required: true }, // ✅ Ensure Date type
});

module.exports = mongoose.model('Transaction', transactionSchema);

