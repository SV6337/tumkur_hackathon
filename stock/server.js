// server.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MongoDB connection URI
const uri = 'mongodb://localhost:27017'; // Use local MongoDB
const client = new MongoClient(uri);

// POST route to update stock
app.post('/update-stock', async (req, res) => {
    try {
        const { product, quantity } = req.body;

        if (!product || !quantity) {
            return res.status(400).json({ error: 'Product and quantity are required.' });
        }

        const database = client.db('stock_management'); // Use the same database created
        const collection = database.collection('products');

        // Update the stock quantity
        const result = await collection.updateOne(
            { name: product }, // Filter
            { $inc: { stock: quantity } } // Update operation
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Product not found.' });
        }

        res.status(200).json({ message: 'Stock updated successfully!' });
    } catch (error) {
        console.error('Error updating stock:', error);
        res.status(500).json({ error: 'An error occurred while updating stock.' });
    }
});

// Start the server
client.connect()
    .then(() => {
        app.listen(port, () => {
            console.log(`Server is running on http://localhost:${port}`);
        });
    })
    .catch(error => {
        console.error('Database connection error:', error);
    });
