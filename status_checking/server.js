const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = 3002;

app.use(bodyParser.json());
app.use(cors());
app.use(express.static('public'));

mongoose.connect('mongodb://127.0.0.1:27017/stock_management')
  .then(() => console.log('MongoDB connected...'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Order Schema
const orderSchema = new mongoose.Schema({
  orderNumber: String,
  name: String,
  email: String,
  address: String,
  items: [{ name: String, quantity: Number, price: Number }],
  totalAmount: Number,
  status: String, // Current status
  statusUpdates: [{ // Array to track status changes
    status: String,
    timestamp: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', orderSchema);

// Route to fetch order details by order number for the customer
app.get('/order/track/:orderNumber', async (req, res) => {
  const { orderNumber } = req.params;

  try {
    const order = await Order.findOne({ orderNumber });
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    // Return the order details including the current status
    res.json({
      orderNumber: order.orderNumber,
      name: order.name,
      email: order.email,
      address: order.address,
      items: order.items,
      totalAmount: order.totalAmount,
      status: order.status, // Ensure the status is included
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving order status.' });
  }
});

// Route to update order status
app.post('/order/update-status', async (req, res) => {
  const { orderNumber, newStatus } = req.body;

  try {
    const order = await Order.findOne({ orderNumber });
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    // Update the order status
    order.status = newStatus;
    order.statusUpdates.push({ status: newStatus }); // Optional: store status updates if needed
    await order.save();

    res.json({ message: 'Order status updated successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating order status.' });
  }
});

// Route to fetch bill details by order number for the admin
app.get('/admin/order/:orderNumber', async (req, res) => {
  const { orderNumber } = req.params;

  try {
    const order = await Order.findOne({ orderNumber });
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving order details.' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
