const express = require("express");
const http = require("http"); // Include http for the server
const path = require("path");
const hbs = require("hbs"); // Handlebars
const nodemailer = require("nodemailer"); // Reset password library
const crypto = require("crypto");
const bcrypt = require("bcrypt"); // Password encoding
const session = require('express-session'); // For session handling
const flash = require('connect-flash'); // For flash messages
const socketIo = require("socket.io"); // For real-time communication

// Import the mongoose model from mongodb.js
const collection = require("./mongodb");

const templatePath = path.join(__dirname, '../tempelates'); // Corrected variable name
console.log("Template Path:", templatePath);

const app = express(); // Declare app only once
const server = http.createServer(app); // Create an HTTP server
const io = socketIo(server); // Initialize Socket.IO

// Middleware
app.use(express.json());
app.set("view engine", "hbs");
app.set("views", templatePath); // Updated to use "tempelates"
app.use(express.urlencoded({ extended: false }));
app.use(session({
    secret: 'yourSecret',
    resave: false,
    saveUninitialized: true
}));
app.use(flash());
app.use(express.static(path.join(__dirname, '../'))); // Serve static files from the parent directory

// Email Transporter Setup with your email and password
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'vass200405@gmail.com', // Replace with your email
        pass: 'zofw znbt glis ugqk' // Replace with your actual email password
    },
    tls: {
        rejectUnauthorized: false // Ignore certificate errors
    }
});

// Routes
app.get("/", (req, res) => {
    res.render("login"); // Render the login page
});

app.get("/signup", (req, res) => {
    res.render("signup"); // Render the signup page
});

app.get("/forgot-password", (req, res) => {
    res.render("forgot-password"); // Render the forgot password page
});

app.get("/admin", async (req, res) => {
    try {
        const users = await collection.find(); // Fetch all users
        console.log("Fetched Users:", users); // Check the fetched users
        res.render("admin", { users }); // Render admin page with users
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).send("Error loading admin page");
    }
});

app.get("/home", async (req, res) => {
    const userName = req.query.name;
    console.log("User name from query:", userName); // Log to debug

    try {
        const user = await collection.findOne({ name: userName });
        if (user) {
            return res.redirect(`/profile?name=${user.name}`);
        } else {
            res.status(404).send("User not found");
        }
    } catch (error) {
        console.error("Error loading home page:", error);
        res.status(500).send("Error loading home page");
    }
});


app.get("/profile", async (req, res) => {
    const userName = req.query.name;
    console.log("Requested user:", userName); // Log the query name

    try {
        const user = await collection.findOne({ name: userName });
        if (user) {
            console.log("User found:", user); // Verify user data
            res.render("profile", { user });
        } else {
            res.status(404).send("User not found");
        }
    } catch (error) {
        console.error("Error loading profile page:", error);
        res.status(500).send("Error loading profile page");
    }
});



app.post("/signup", async (req, res) => {
    const { name, password, gmail, phone, gstNumber, registrationDate } = req.body;
    console.log("Signup Data:", req.body);
    const passwordRegex = /^(?=.*[!@#$%^&*])(?=.{8,})/; // Password validation regex

    if (!passwordRegex.test(password)) {
        return res.status(400).send("Password must be at least 8 characters long and contain at least one special character.");
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10); // Hash the password
        const newUser = await collection.create({ 
            name, 
            password: hashedPassword, 
            gmail, 
            phone,  
            gstNumber,
            registrationDate
        });

        console.log("New User Created: ", newUser);
        res.render("home", { naming: newUser.name }); // Redirect to home after signup
    } catch (error) {
        console.error("Error creating user: ", error);
        res.status(500).send("Error signing up");
    }
});

app.post("/login", async (req, res) => {
    const { name, password } = req.body;
    try {
        const user = await collection.findOne({ name });
        if (user && await bcrypt.compare(password, user.password)) {
            // Redirect to homepage.html
            return res.redirect("\homepage.html"); // Change this if necessary
        } else {
            res.send("Incorrect username or password");
        }
    } catch (error) {
        console.error("Error during login: ", error);
        res.status(500).send("Error logging in");
    }
});

// Step 1: Generate and send 4-digit verification code
app.post("/forgot-password", async (req, res) => {
    const { gmail } = req.body;

    try {
        const user = await collection.findOne({ gmail });
        if (user) {
            const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
            user.verificationCode = verificationCode;  // Save code temporarily in user (adjust if needed in your schema)
            await user.save();

            const mailOptions = {
                from: 'vass200405@gmail.com',
                to: gmail,
                subject: 'Your Password Reset Code',
                text: `Your password reset code is: ${verificationCode}`
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.log("Error sending email:", error);
                    res.status(500).send("Error sending verification code");
                } else {
                    console.log("Email sent: " + info.response);
                    res.render("verify-code", { gmail });
                }
            });
        } else {
            res.send("No account associated with this Gmail");
        }
    } catch (error) {
        console.error("Error during password reset:", error);
        res.status(500).send("An error occurred");
    }
});

// Step 2: Verify Code
app.post("/verify-code", async (req, res) => {
    const { gmail, code } = req.body;

    try {
        const user = await collection.findOne({ gmail });
        if (user && user.verificationCode === code) {
            delete user.verificationCode;
            await user.save();
            res.render("reset-password", { gmail });
        } else {
            res.send("Incorrect code. Please try again.");
        }
    } catch (error) {
        console.error("Error verifying code:", error);
        res.status(500).send("An error occurred");
    }
});

// Step 3: Reset Password with Conditional Requirement
app.post("/reset-password", async (req, res) => {
    const { gmail, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        // Update only password and unset verificationCode
        await collection.updateOne(
            { gmail },
            { $set: { password: hashedPassword }, $unset: { verificationCode: "" } }, // Unset verificationCode after use
            { runValidators: false, context: 'query' }
        );

        res.redirect("/"); // Redirect to login page after password reset
    } catch (error) {
        console.error("Error updating password:", error);
        res.status(500).send("An error occurred");
    }
});

app.post("/approve-reject", async (req, res) => {
    const { userId, action } = req.body;

    try {
        const isApproved = action === "approve";
        await collection.findByIdAndUpdate(userId, { isApproved });
        res.redirect("/admin"); // Redirect back to admin page to refresh status
    } catch (error) {
        console.error("Error updating approval status:", error);
        res.status(500).send("Error updating profile status");
    }
});

// Chat functionality
io.on('connection', (socket) => {
    console.log("New client connected");

    socket.on('joinRoom', (userId) => {
        socket.join(userId); // Join the user's room
    });

    socket.on('sendMessage', ({ userId, message, userName }) => {
        // Broadcast the message to the user's room, including the username
        socket.to(userId).emit('receiveMessage', { userName, message });
    });

    socket.on('adminMessage', ({ userId, message }) => {
        io.to(userId).emit('receiveMessage', { userName: 'Admin', message });
    });

    // Handle client disconnect
    socket.on('disconnect', () => {
        console.log("Client disconnected");
    });
});

// Start server
server.listen(3000, () => {
    console.log("Server is running on port 3000");
});
