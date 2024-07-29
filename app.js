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


app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


app.use(cors({
    origin: 'https://mjmgmt-front.pages.dev',
    credentials: true,
    allowedHeaders: "Content-Type, Accept, Origin, Timestamp",
    preflightContinue: false,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  }));

app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

app.use('/listings', listingRouter);
app.use('/auth', authRouter);
app.use('/', protectedRoute);


module.exports = app;