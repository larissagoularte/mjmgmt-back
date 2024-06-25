const express = require('express');
const listingRouter = require('./routes/listingRoutes');
const authRouter = require('./routes/authRoutes');
const protectedRoute = require('./routes/protectedTestRoute');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const passport = require('./middlewares/passport');
const cookieParser = require('cookie-parser');

const app = express();

const allowedOrigins = ['http://localhost:3000', 'http://192.168.1.157:3000'];


app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


app.use(cors({
    origin: function(origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

app.use('/listings', listingRouter);
app.use('/auth', authRouter);
app.use('/', protectedRoute);


module.exports = app;