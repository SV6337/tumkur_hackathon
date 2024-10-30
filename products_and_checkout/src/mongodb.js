const mongoose = require("mongoose");

// Connect to MongoDB
mongoose.connect("mongodb://localhost:27017/Login")
    .then(() => {
        console.log("MongoDB connected");
    })
    .catch(() => {
        console.log("Failed to connect to MongoDB");
    });

// Define the schema
const LogInSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    gmail: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    verificationCode: {
        type: String,  // This field stores the code temporarily
        required: false
    },
    isApproved: {
        type: Boolean,
        default: false  // Default to "not approved"
    }
});


LogInSchema.virtual('isPasswordReset').get(function() {
    return this._isPasswordReset || false;
}).set(function(value) {
    this._isPasswordReset = value;
});



// Create the collection model
const collection = new mongoose.model("Collection1", LogInSchema);


// Export the collection model
module.exports = collection;

