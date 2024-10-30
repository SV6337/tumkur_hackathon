const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');


const app = express();
const PORT = 3003;


app.use(bodyParser.json());
app.use(cors());
app.use(express.static('public'));


mongoose.connect('mongodb://127.0.0.1:27017/stock_management')
  .then(() => console.log('MongoDB connected...'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });


const productSchema = new mongoose.Schema({
  name: String,
  stock: Number,
  price: Number
});
const Product = mongoose.model('Product', productSchema);


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
  createdAt: { type: Date, default: Date.now },
  recurring: { type: Boolean, default: false }, // New field for recurring order
  frequency: { type: String } // New field for frequency (e.g., daily, weekly)
});


const Order = mongoose.model('Order', orderSchema);


let cart = [];


app.get('/products', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching products.' });
  }
});


app.post('/cart/add', async (req, res) => {
  const { name, quantity } = req.body;
  const product = await Product.findOne({ name });


  if (!product || product.stock < quantity) {
    return res.status(400).json({ message: 'Insufficient stock or product not found.' });
  }


  product.stock -= quantity;
  await product.save();


  const cartItem = cart.find(item => item.name === name);
  cartItem ? (cartItem.quantity += quantity) : cart.push({ name, quantity, price: product.price });


  res.json({ message: `${quantity} ${name} added to cart.` });
});


app.get('/cart', (req, res) => {
  let total = 0;
  cart.forEach(item => total += item.quantity * item.price);
  res.json({ cart, total });
});


app.post('/cart/remove', async (req, res) => {
  const { name } = req.body;
  const cartItem = cart.find(item => item.name === name);
  const product = await Product.findOne({ name });


  if (!cartItem || !product) return res.status(404).json({ message: 'Item not found.' });


  product.stock += cartItem.quantity;
  await product.save();


  cart = cart.filter(item => item.name !== name);
  res.json({ message: `${name} removed from cart.` });
});


app.post('/cart/checkout', async (req, res) => {
  const { name, email, address, recurring, frequency } = req.body; // Include recurring and frequency
  const orderNumber = `ORD-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;


  const sgstRate = 0.025; // 2.5%
  const cgstRate = 0.025; // 2.5%
  const deliveryCharges = 25;


  let totalAmount = 0;
  const items = cart.map(item => {
    const itemTotal = item.quantity * item.price;
    totalAmount += itemTotal;
    return { name: item.name, quantity: item.quantity, price: item.price };
  });


  // Calculate SGST, CGST, and Grand Total
  const sgstAmount = totalAmount * sgstRate; // Calculate SGST
  const cgstAmount = totalAmount * cgstRate; // Calculate CGST
  const grandTotal = totalAmount + sgstAmount + cgstAmount + deliveryCharges; // Grand total including SGST, CGST, and delivery charges


  const order = new Order({
    orderNumber,
    name,
    email,
    address,
    items,
    totalAmount: grandTotal, // Save grand total
    status: 'Order Placed',
    recurring: recurring || false, // Set recurring value
    frequency // Set frequency if provided
  });


  try {
    await order.save();


    // If it's a recurring order, handle the scheduling here
    if (recurring) {
      // Implement logic to handle recurring orders (e.g., schedule next order)
      // For demonstration, we'll just log it. You can use a cron job for scheduling.
      console.log(`Recurring order for ${name} every ${frequency}`);
    }


    cart = []; // Clear the cart after checkout
    res.json({ message: 'Checkout successful.', orderNumber });
  } catch (error) {
    res.status(500).json({ message: 'Error processing order.' });
  }
});


app.get('/order/latest', async (req, res) => {
  try {
    const latestOrder = await Order.findOne().sort({ createdAt: -1 });
    res.json(latestOrder);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving order.' });
  }
});


app.post('/order/update-status', async (req, res) => {
  const { orderNumber, newStatus } = req.body;


  try {
    const order = await Order.findOne({ orderNumber });
    if (!order) return res.status(404).json({ message: 'Order not found.' });


    order.status = newStatus;
    order.statusUpdates.push({ status: newStatus });
    await order.save();


    res.json({ message: 'Order status updated successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating order status.' });
  }
});


app.get('/order/track/:orderNumber', async (req, res) => {
  const { orderNumber } = req.params;


  try {
    const order = await Order.findOne({ orderNumber });
    if (!order) return res.status(404).json({ message: 'Order not found.' });


    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving order status.' });
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


app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});





