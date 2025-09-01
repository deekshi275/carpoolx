const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/carpool', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('MongoDB Connected');
    // Start server only after MongoDB connects
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Visit http://localhost:${PORT} in your browser`);
    });
})
.catch(err => {
    console.error('MongoDB Connection Error:', err);
    process.exit(1); // Exit if cannot connect to database
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

// User Schema
const userSchema = new mongoose.Schema({
    fullname: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Add Ride Schema
const rideSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['car', 'bike'],
        required: true
    },
    from: {
        type: String,
        required: true
    },
    to: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    time: {
        type: String,
        required: true
    },
    seats: {
        type: Number,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    description: {
        type: String
    },
    // Add driver details
    driverName: {
        type: String,
        required: true
    },
    driverPhone: {
        type: String,
        required: true
    },
    driverLicense: {
        type: String,
        required: true
    },
    // Add vehicle details
    vehicleType: {
        type: String,
        required: true
    },
    vehicleModel: {
        type: String,
        required: true
    },
    vehicleNumber: {
        type: String,
        required: true
    },
    vehicleColor: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'cancelled'],
        default: 'active'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Ride = mongoose.model('Ride', rideSchema);

// Add booking schema
const bookingSchema = new mongoose.Schema({
    rideId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ride',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    passengerName: {
        type: String,
        required: true
    },
    passengerPhone: {
        type: String,
        required: true
    },
    passengerEmail: {
        type: String,
        required: true
    },
    seatsBooked: {
        type: Number,
        required: true,
        default: 1
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Booking = mongoose.model('Booking', bookingSchema);

// Add Booking Request Schema
const bookingRequestSchema = new mongoose.Schema({
    rideId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ride',
        required: true
    },
    passengerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    passengerName: {
        type: String,
        required: true
    },
    passengerPhone: {
        type: String,
        required: true
    },
    passengerEmail: {
        type: String,
        required: true
    },
    seatsBooked: {
        type: Number,
        required: true,
        default: 1
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const BookingRequest = mongoose.model('BookingRequest', bookingRequestSchema);

// Create a constant for JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Create email transporter
let transporter = null;
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
} else {
    console.log('Email configuration not found. Email notifications will be disabled.');
}

// Initialize Twilio client
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
    twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
    );
} else {
    console.log('Twilio configuration not found. SMS notifications will be disabled.');
}

// Function to send SMS notification
async function sendSMSNotification(phoneNumber, message) {
    try {
        if (twilioClient) {
            await twilioClient.messages.create({
                body: message,
                to: phoneNumber,
                from: process.env.TWILIO_PHONE_NUMBER
            });
            console.log('SMS notification sent successfully');
        } else {
            console.log('Twilio client not configured, skipping SMS notification');
        }
    } catch (error) {
        console.error('Error sending SMS notification:', error);
    }
}

// Function to send booking confirmation email
async function sendBookingConfirmationEmail(passengerEmail, passengerName, rideDetails) {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: passengerEmail,
        subject: 'Your Ride Booking Has Been Confirmed!',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2c3e50;">Booking Confirmation</h2>
                <p>Dear ${passengerName},</p>
                <p>Your ride booking request has been accepted! Here are your ride details:</p>
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>From:</strong> ${rideDetails.from}</p>
                    <p><strong>To:</strong> ${rideDetails.to}</p>
                    <p><strong>Date:</strong> ${new Date(rideDetails.date).toLocaleDateString()}</p>
                    <p><strong>Time:</strong> ${rideDetails.time}</p>
                    <p><strong>Seats Booked:</strong> ${rideDetails.seatsBooked}</p>
                    <p><strong>Price per Seat:</strong> ₹${rideDetails.pricePerSeat}</p>
                    <p><strong>Total Amount:</strong> ₹${rideDetails.seatsBooked * rideDetails.pricePerSeat}</p>
                </div>
                <p>Please arrive at the pickup location 10 minutes before the scheduled time.</p>
                <p>If you have any questions, please contact the driver directly.</p>
                <p>Thank you for using our service!</p>
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
                    <p>This is an automated message, please do not reply to this email.</p>
                </div>
            </div>
        `
    };

    try {
        if (transporter) {
            await transporter.sendMail(mailOptions);
            console.log('Booking confirmation email sent to:', passengerEmail);
        } else {
            console.log('Email transporter not configured, skipping email notification');
        }
    } catch (error) {
        console.error('Error sending booking confirmation email:', error);
    }
}

// Function to send booking status email
async function sendBookingStatusEmail(passengerEmail, passengerName, rideDetails, status) {
    const subject = status === 'accepted' 
        ? '🎉 Your Ride Booking Has Been Confirmed!' 
        : 'Your Ride Booking Request Status Update';

    const statusMessage = status === 'accepted'
        ? 'Your ride booking request has been accepted! Here are your ride details:'
        : 'Your ride booking request has been rejected. Here are the details of the requested ride:';

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: passengerEmail,
        subject: subject,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
                <div style="background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <h2 style="color: #2c3e50; margin-bottom: 20px; text-align: center;">
                        ${status === 'accepted' ? '🎉 Booking Confirmed!' : 'Booking Status Update'}
                    </h2>
                    
                    <p style="color: #34495e; font-size: 16px;">Dear ${passengerName},</p>
                    
                    <p style="color: #34495e; font-size: 16px;">${statusMessage}</p>
                    
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #2c3e50; margin-bottom: 15px;">Ride Details:</h3>
                        <p><strong>From:</strong> ${rideDetails.from}</p>
                        <p><strong>To:</strong> ${rideDetails.to}</p>
                        <p><strong>Date:</strong> ${new Date(rideDetails.date).toLocaleDateString()}</p>
                        <p><strong>Time:</strong> ${rideDetails.time}</p>
                        <p><strong>Seats Booked:</strong> ${rideDetails.seatsBooked}</p>
                        <p><strong>Price per Seat:</strong> ₹${rideDetails.pricePerSeat}</p>
                        ${status === 'accepted' ? `
                            <p><strong>Total Amount:</strong> ₹${rideDetails.seatsBooked * rideDetails.pricePerSeat}</p>
                            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
                                <h3 style="color: #2c3e50; margin-bottom: 15px;">Driver Details:</h3>
                                <p><strong>Name:</strong> ${rideDetails.driverName}</p>
                                <p><strong>Phone:</strong> ${rideDetails.driverPhone}</p>
                                <p><strong>Vehicle:</strong> ${rideDetails.vehicleType} - ${rideDetails.vehicleModel}</p>
                                <p><strong>Vehicle Number:</strong> ${rideDetails.vehicleNumber}</p>
                            </div>
                        ` : ''}
                    </div>

                    ${status === 'accepted' ? `
                        <div style="background-color: #e8f5e9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <p style="color: #2e7d32; margin: 0;">
                                <strong>Important:</strong> Please arrive at the pickup location 10 minutes before the scheduled time.
                            </p>
                        </div>
                    ` : `
                        <div style="background-color: #ffebee; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <p style="color: #c62828; margin: 0;">
                                You can try booking another ride that better suits your needs.
                            </p>
                        </div>
                    `}

                    <p style="color: #34495e; font-size: 16px;">Thank you for using our service!</p>
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
                        <p>This is an automated message, please do not reply to this email.</p>
                        <p>If you have any questions, please contact our support team.</p>
                    </div>
                </div>
            </div>
        `
    };

    try {
        if (transporter) {
            await transporter.sendMail(mailOptions);
            console.log(`Booking ${status} email sent to:`, passengerEmail);
        } else {
            console.log('Email transporter not configured, skipping email notification');
        }
    } catch (error) {
        console.error(`Error sending booking ${status} email:`, error);
    }
}

// API Routes
app.post('/api/register', async (req, res) => {
    try {
        const { fullname, email, password, phone } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Validate phone number format (basic validation)
        const phoneRegex = /^\d{10}$/;
        if (!phoneRegex.test(phone)) {
            return res.status(400).json({ message: 'Phone number must be 10 digits' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        const user = new User({
            fullname,
            email,
            password: hashedPassword,
            phone
        });

        await user.save();

        // Create JWT token
        const token = jwt.sign(
            { userId: user._id },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({ 
            token,
            redirect: '/login' // Add redirect information
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Create JWT token
        const token = jwt.sign(
            { userId: user._id },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ token });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Protected route middleware
const auth = (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};

// Protected route example
app.get('/api/user', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Token verification error:', error);
        return res.status(401).json({ message: 'Invalid token' });
    }
};

// Profile endpoint
app.get('/api/profile', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ message: 'Error fetching profile' });
    }
});

// Add route for publishing rides
app.post('/api/rides', verifyToken, async (req, res) => {
    console.log('Received ride publish request:', req.body);
    
    try {
        const { 
            type, 
            from, 
            to, 
            date, 
            time, 
            seats, 
            price, 
            description,
            // Driver details
            driverName,
            driverPhone,
            driverLicense,
            // Vehicle details
            vehicleType,
            vehicleModel,
            vehicleNumber,
            vehicleColor
        } = req.body;
        
        // Log the received data
        console.log('Processing ride data:', {
            type,
            from,
            to,
            date,
            time,
            seats,
            price,
            description,
            driverName,
            driverPhone,
            driverLicense,
            vehicleType,
            vehicleModel,
            vehicleNumber,
            vehicleColor
        });

        // Validate required fields
        if (!type || !from || !to || !date || !time || !seats || !price || 
            !driverName || !driverPhone || !driverLicense || 
            !vehicleType || !vehicleModel || !vehicleNumber || !vehicleColor) {
            console.log('Missing required fields');
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Convert seats and price to numbers
        const seatsNum = parseInt(seats, 10);
        const priceNum = parseFloat(price);

        // Validate seats based on ride type
        if (type === 'car' && (seatsNum < 1 || seatsNum > 4)) {
            console.log('Invalid car seats:', seatsNum);
            return res.status(400).json({ message: 'Car rides can have 1-4 seats' });
        }
        if (type === 'bike' && (seatsNum < 1 || seatsNum > 2)) {
            console.log('Invalid bike seats:', seatsNum);
            return res.status(400).json({ message: 'Bike rides can have 1-2 seats' });
        }

        // Validate date and time
        const rideDateTime = new Date(`${date}T${time}`);
        const now = new Date();
        
        if (rideDateTime < now) {
            console.log('Invalid date/time - past date:', rideDateTime);
            return res.status(400).json({ message: 'Cannot create rides in the past' });
        }

        // Create new ride with all details
        const ride = new Ride({
            userId: req.user.userId,
            type,
            from,
            to,
            date: rideDateTime,
            time,
            seats: seatsNum,
            price: priceNum,
            description: description || '',
            // Add driver details
            driverName,
            driverPhone,
            driverLicense,
            // Add vehicle details
            vehicleType,
            vehicleModel,
            vehicleNumber,
            vehicleColor,
            status: 'active',
            createdAt: new Date()
        });

        console.log('Attempting to save ride to MongoDB:', ride);

        // Save to MongoDB
        const savedRide = await ride.save();
        
        // Log successful ride creation
        console.log('Successfully saved ride to MongoDB:', {
            id: savedRide._id,
            type: savedRide.type,
            from: savedRide.from,
            to: savedRide.to,
            date: savedRide.date,
            time: savedRide.time,
            seats: savedRide.seats,
            price: savedRide.price,
            driverName: savedRide.driverName,
            vehicleType: savedRide.vehicleType
        });

        res.status(201).json({ 
            message: 'Ride published successfully', 
            ride: savedRide 
        });
    } catch (error) {
        console.error('Error publishing ride:', error);
        
        // Handle specific MongoDB errors
        if (error.name === 'ValidationError') {
            console.log('MongoDB validation error:', error.errors);
            return res.status(400).json({ 
                message: 'Invalid ride data',
                details: Object.values(error.errors).map(err => err.message)
            });
        }
        
        if (error.name === 'MongoError' && error.code === 11000) {
            console.log('MongoDB duplicate key error');
            return res.status(400).json({ 
                message: 'Duplicate ride entry'
            });
        }

        res.status(500).json({ 
            message: 'Error publishing ride',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Add route to get user's rides
app.get('/api/rides', verifyToken, async (req, res) => {
    try {
        const rides = await Ride.find({ userId: req.user.userId })
            .sort({ date: 1, time: 1 })
            .select('-__v'); // Exclude version key

        res.json(rides);
    } catch (error) {
        console.error('Error fetching rides:', error);
        res.status(500).json({ message: 'Error fetching rides' });
    }
});

// Add route to get all active rides
app.get('/api/rides/active', async (req, res) => {
    try {
        const rides = await Ride.find({ 
            status: 'active',
            date: { $gte: new Date() } // Only future rides
        })
        .sort({ date: 1, time: 1 })
        .select('-__v'); // Exclude version key

        res.json(rides);
    } catch (error) {
        console.error('Error fetching active rides:', error);
        res.status(500).json({ message: 'Error fetching active rides' });
    }
});

// Add search endpoint for rides
app.get('/api/rides/search', async (req, res) => {
    try {
        const { from, to, date, type } = req.query;
        
        // Build search query
        const query = {
            status: 'active',
            date: {
                $gte: new Date(date)
            }
        };

        // Add location filters if provided
        if (from) {
            query.from = { $regex: from, $options: 'i' }; // Case-insensitive search
        }
        if (to) {
            query.to = { $regex: to, $options: 'i' }; // Case-insensitive search
        }
        if (type && type !== 'all') {
            query.type = type;
        }

        // Find matching rides
        const rides = await Ride.find(query)
            .sort({ date: 1, time: 1 })
            .select('-__v');

        // For each ride, get the number of pending bookings
        const ridesWithPendingBookings = await Promise.all(rides.map(async (ride) => {
            const pendingBookings = await BookingRequest.countDocuments({
                rideId: ride._id,
                status: 'pending'
            });
            
            // Create a new object with the ride data and pending bookings count
            return {
                ...ride.toObject(),
                pendingBookings
            };
        }));

        res.json(ridesWithPendingBookings);
    } catch (error) {
        console.error('Error searching rides:', error);
        res.status(500).json({ message: 'Error searching rides' });
    }
});

// Update booking endpoint to create a booking request
app.post('/api/rides/:rideId/book', verifyToken, async (req, res) => {
    try {
        const { passengerName, passengerPhone, passengerEmail, seatsBooked } = req.body;
        
        // Validate required fields
        if (!passengerName || !passengerPhone || !passengerEmail) {
            return res.status(400).json({ message: 'Passenger details are required' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(passengerEmail)) {
            return res.status(400).json({ message: 'Invalid email format' });
        }

        // Validate phone number format (basic validation)
        const phoneRegex = /^\d{10}$/;
        if (!phoneRegex.test(passengerPhone)) {
            return res.status(400).json({ message: 'Phone number must be 10 digits' });
        }

        const ride = await Ride.findById(req.params.rideId);
        
        if (!ride) {
            return res.status(404).json({ message: 'Ride not found' });
        }

        if (ride.status !== 'active') {
            return res.status(400).json({ message: 'Ride is not available' });
        }

        const seatsToBook = seatsBooked || 1;
        if (ride.seats < seatsToBook) {
            return res.status(400).json({ message: 'Not enough seats available' });
        }

        // Create booking request with passenger data
        const bookingRequest = new BookingRequest({
            rideId: ride._id,
            passengerId: req.user.userId,
            passengerName,
            passengerPhone,
            passengerEmail,
            seatsBooked: seatsToBook,
            status: 'pending',
            createdAt: new Date()
        });

        // Save to MongoDB
        const savedRequest = await bookingRequest.save();

        // Log successful request creation
        console.log('Booking request created:', {
            id: savedRequest._id,
            rideId: savedRequest.rideId,
            passengerName: savedRequest.passengerName,
            seatsBooked: savedRequest.seatsBooked,
            status: savedRequest.status
        });

        res.status(201).json({ 
            message: 'Booking request sent successfully', 
            bookingRequest: savedRequest
        });
    } catch (error) {
        console.error('Error creating booking request:', error);
        
        // Handle specific MongoDB errors
        if (error.name === 'ValidationError') {
            return res.status(400).json({ 
                message: 'Invalid booking request data',
                details: Object.values(error.errors).map(err => err.message)
            });
        }
        
        res.status(500).json({ message: 'Error creating booking request' });
    }
});

// Add endpoint to get booking requests for a ride
app.get('/api/rides/:rideId/booking-requests', verifyToken, async (req, res) => {
    try {
        const ride = await Ride.findById(req.params.rideId);
        
        if (!ride) {
            return res.status(404).json({ message: 'Ride not found' });
        }

        // Check if the user is the ride publisher
        if (ride.userId.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Not authorized to view booking requests' });
        }

        const bookingRequests = await BookingRequest.find({ rideId: ride._id })
            .sort({ createdAt: -1 });

        res.json(bookingRequests);
    } catch (error) {
        console.error('Error fetching booking requests:', error);
        res.status(500).json({ message: 'Error fetching booking requests' });
    }
});

// Update the booking request response endpoint
app.post('/api/booking-requests/:requestId/respond', verifyToken, async (req, res) => {
    try {
        console.log('Booking request response endpoint called');
        console.log('User ID:', req.user.userId);
        console.log('Request body:', req.body);
        
        const { requestId } = req.params;
        const { status, message } = req.body;
        
        console.log('Request ID:', requestId);
        console.log('Status:', status);
        console.log('Message:', message);

        const bookingRequest = await BookingRequest.findById(requestId)
            .populate('rideId');

        console.log('Found booking request:', bookingRequest);

        if (!bookingRequest) {
            console.log('Booking request not found for ID:', requestId);
            return res.status(404).json({ message: 'Booking request not found' });
        }

        // Check if the user is the ride owner
        console.log('Booking request ride owner:', bookingRequest.rideId.userId.toString());
        console.log('Current user:', req.user.userId);
        console.log('Authorization check:', bookingRequest.rideId.userId.toString() === req.user.userId);
        
        if (bookingRequest.rideId.userId.toString() !== req.user.userId) {
            console.log('Authorization failed - user not authorized');
            return res.status(403).json({ message: 'Not authorized to respond to this request' });
        }

        // Update booking request status and message
        bookingRequest.status = status;
        bookingRequest.driverMessage = message || (status === 'accepted' ? 
            'Your booking request has been accepted!' : 
            'Your booking request has been rejected.');
        await bookingRequest.save();

        // Prepare ride details for email
        const rideDetails = {
            from: bookingRequest.rideId.from,
            to: bookingRequest.rideId.to,
            date: bookingRequest.rideId.date,
            time: bookingRequest.rideId.time,
            seatsBooked: bookingRequest.seatsBooked,
            pricePerSeat: bookingRequest.rideId.price,
            driverName: bookingRequest.rideId.driverName,
            driverPhone: bookingRequest.rideId.driverPhone,
            vehicleType: bookingRequest.rideId.vehicleType,
            vehicleModel: bookingRequest.rideId.vehicleModel,
            vehicleNumber: bookingRequest.rideId.vehicleNumber,
            message: bookingRequest.driverMessage
        };

        if (status === 'accepted') {
            // Create booking
            const booking = new Booking({
                rideId: bookingRequest.rideId._id,
                userId: bookingRequest.passengerId,
                passengerName: bookingRequest.passengerName,
                passengerPhone: bookingRequest.passengerPhone,
                passengerEmail: bookingRequest.passengerEmail,
                seatsBooked: bookingRequest.seatsBooked,
                status: 'confirmed'
            });
            await booking.save();

            // Update ride seats
            bookingRequest.rideId.seats -= bookingRequest.seatsBooked;
            if (bookingRequest.rideId.seats === 0) {
                bookingRequest.rideId.status = 'completed';
            }
            await bookingRequest.rideId.save();

            // Send acceptance email
            try {
                await sendBookingStatusEmail(
                    bookingRequest.passengerEmail,
                    bookingRequest.passengerName,
                    rideDetails,
                    'accepted'
                );
            } catch (emailError) {
                console.error('Failed to send acceptance email:', emailError);
            }

            // Send SMS notification as fallback
            try {
                const smsMessage = `🎉 Your booking request has been ACCEPTED! Ride: ${rideDetails.from} to ${rideDetails.to} on ${new Date(rideDetails.date).toLocaleDateString()} at ${rideDetails.time}. Driver: ${rideDetails.driverName} (${rideDetails.driverPhone})`;
                await sendSMSNotification(bookingRequest.passengerPhone, smsMessage);
            } catch (smsError) {
                console.error('Failed to send SMS notification:', smsError);
            }

        } else if (status === 'rejected') {
            // Send rejection email
            try {
                await sendBookingStatusEmail(
                    bookingRequest.passengerEmail,
                    bookingRequest.passengerName,
                    rideDetails,
                    'rejected'
                );
            } catch (emailError) {
                console.error('Failed to send rejection email:', emailError);
            }

            // Send SMS notification as fallback
            try {
                const smsMessage = `❌ Your booking request has been REJECTED. Ride: ${rideDetails.from} to ${rideDetails.to} on ${new Date(rideDetails.date).toLocaleDateString()} at ${rideDetails.time}.`;
                await sendSMSNotification(bookingRequest.passengerPhone, smsMessage);
            } catch (smsError) {
                console.error('Failed to send SMS notification:', smsError);
            }
        }

        // Return the updated booking request with ride details
        const updatedRequest = await BookingRequest.findById(requestId)
            .populate('rideId')
            .lean();

        res.json({ 
            message: 'Booking request updated successfully',
            status: status,
            driverMessage: bookingRequest.driverMessage,
            bookingRequest: updatedRequest
        });
    } catch (error) {
        console.error('Error responding to booking request:', error);
        res.status(500).json({ message: 'Error responding to booking request' });
    }
});

// Add endpoint to get user's booking requests
app.get('/api/booking-requests', verifyToken, async (req, res) => {
    try {
        const bookingRequests = await BookingRequest.find({ passengerId: req.user.userId })
            .populate('rideId')
            .sort({ createdAt: -1 });
        res.json(bookingRequests);
    } catch (error) {
        console.error('Error fetching booking requests:', error);
        res.status(500).json({ message: 'Error fetching booking requests' });
    }
});

// Add endpoint to get user's bookings
app.get('/api/bookings', verifyToken, async (req, res) => {
    try {
        const bookings = await Booking.find({ userId: req.user.userId })
            .populate('rideId')
            .sort({ createdAt: -1 });
        res.json(bookings);
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ message: 'Error fetching bookings' });
    }
});

// Add route for notifications page
app.get('/notifications', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'notifications.html'));
});

// Add route for requests page
app.get('/requests', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'requests.html'));
});

// Add route for booking status page
app.get('/booking-status', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'booking-status.html'));
});

// Page Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/profile', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

// Add route for header.js
app.get('/header.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'header.js'));
});



// Add API endpoint to fetch user's booking requests
app.get('/api/booking-requests/user', verifyToken, async (req, res) => {
    try {
        console.log('Fetching booking requests for user:', req.user.userId);
        
        if (!req.user || !req.user.userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        const requests = await BookingRequest.find({ passengerId: req.user.userId })
            .populate({
                path: 'rideId',
                select: 'from to date time price driverName driverPhone vehicleType vehicleModel vehicleNumber'
            })
            .sort({ createdAt: -1 });

        console.log('Found booking requests:', requests.length);

        // Transform the data to include ride details directly
        const transformedRequests = requests.map(request => {
            const ride = request.rideId;
            return {
                _id: request._id,
                status: request.status,
                seatsBooked: request.seatsBooked,
                createdAt: request.createdAt,
                driverMessage: request.driverMessage || getDefaultMessage(request.status),
                ride: ride ? {
                    from: ride.from,
                    to: ride.to,
                    date: ride.date,
                    time: ride.time,
                    price: ride.price,
                    driverName: ride.driverName,
                    driverPhone: ride.driverPhone,
                    vehicleType: ride.vehicleType,
                    vehicleModel: ride.vehicleModel,
                    vehicleNumber: ride.vehicleNumber
                } : null
            };
        });

        console.log('Transformed requests:', transformedRequests);
        
        // Set headers before sending response
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).json(transformedRequests);
    } catch (error) {
        console.error('Error fetching user booking requests:', error);
        res.setHeader('Content-Type', 'application/json');
        return res.status(500).json({ 
            message: 'Error fetching booking requests',
            error: error.message 
        });
    }
});

// Helper function to get default message based on status
function getDefaultMessage(status) {
    switch(status) {
        case 'accepted':
            return 'Your booking request has been accepted!';
        case 'rejected':
            return 'Your booking request has been rejected.';
        case 'pending':
            return 'Your booking request is pending approval.';
        default:
            return 'Status update for your booking request.';
    }
}

// Handle 404 - Page not found
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Add endpoint to fetch booking data
app.get('/api/bookings/user/:userId', auth, async (req, res) => {
    try {
        const bookings = await Booking.find({ userId: req.params.userId })
            .populate('rideId')
            .sort({ createdAt: -1 });

        res.json(bookings);
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ message: 'Error fetching bookings' });
    }
});

// Add endpoint to fetch booking requests with status
app.get('/api/booking-requests/status/:userId', auth, async (req, res) => {
    try {
        const bookingRequests = await BookingRequest.find({ passengerId: req.params.userId })
            .populate('rideId')
            .sort({ createdAt: -1 });

        res.json(bookingRequests);
    } catch (error) {
        console.error('Error fetching booking requests:', error);
        res.status(500).json({ message: 'Error fetching booking requests' });
    }
});

// Add route for passenger requests page
app.get('/passenger-requests', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'passenger-requests.html'));
});

// Add route for notifications page
app.get('/notifications', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'notifications.html'));
});

// Add route for requests page
app.get('/requests', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'requests.html'));
}); 