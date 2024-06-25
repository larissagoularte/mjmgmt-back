const User=require("../models/user");
const jwt=require("jsonwebtoken");
const bcrypt=require("bcrypt");
const validator = require("validator");
require('cookie-parser')
require("dotenv").config();
const Blacklist = require("../models/blacklist")
const JWT_SECRET = process.env.JWT_SECRET

const isValidPassword = (password) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
};


exports.register=async(req,res)=>{
    try {
        const { name, email, pass } = req.body;

        if (!(name && email && pass)) {
            return res.status(400).json({ error: "Name, email and password are required." })
        }

        if (!validator.isEmail(email)) {
            return res.status(400).json({ error: "Invalid email." });
        }

        if (!isValidPassword(pass)) {
            return res.status(400).json({ error: "Invalid password. Password must contain at least 8 characters, one uppercase and lowercase letter, one number and special character." });
        }

        const lowerCaseEmail = email.toLowerCase();
        const checkUser = await User.findOne({ email: lowerCaseEmail });
        if(checkUser) {
            return res.status(409).json({ error: "User with this email already exists." });
        }

        hashedPass = await bcrypt.hash(pass, 10);
        const user=await User.create({
            name,
            email: lowerCaseEmail, 
            pass: hashedPass
        }) 

        res.status(201).json(user);
    } catch(error) {
        console.error("Error during registration:", error);
        res.status(500).json({ error: "Internal server error." });
    }
}

exports.login = async (req, res) => {
    try {
        const { email, pass } = req.body;

        if (!(email && pass)) {
            return res.status(400).json({ error: "Email and password are required for login." });
        }

        const lowerCaseEmail = email.toLowerCase();
        console.log(email)
        console.log(lowerCaseEmail)
        const user = await User.findOne({ email: lowerCaseEmail });
        if (!user) {
            return res.status(400).json({ error: "Invalid email or password." });
        }

        const passCompare = await bcrypt.compare(pass, user.pass);

        if (passCompare) {
            const token = jwt.sign(
                {
                    userId: user._id,
                    email: user.email,
                    name: user.name
                },
                JWT_SECRET, 
                {
                    expiresIn: '1d'
                }
            );

            res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });

            return res.status(200).json({ id: user._id, email: user.email, name: user.name });
        } else {
            return res.status(400).json({ error: "Invalid email or password." });
        }
    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ error: "Internal server error." });
    }
};

exports.logout = async (req, res) => {
    try {
        const token = req.cookies.token;
        console.log('Token from cookie:', token); 

        if(token) {
            const decoded = jwt.decode(token);
            console.log('Decoded token:', decoded); // Debugging output
            if (!decoded) {
                return res.status(400).json({ error: "Invalid token" });
            }

            const expiresAt = new Date(decoded.exp * 1000);

            await Blacklist.create({ token, expiresAt });

            console.log('Token blacklisted successfully:', token);

            res.clearCookie('token', { httpOnly: true, secure: process.env.NODE_ENV === 'production' });

            return res.status(200).json({ message: "Successfully logged out" });
        } else {
            return res.status(400).json({ error: "No token provided" });
        }
    } catch (error) {
        console.error('Error during logout:', error);
        return res.status(500).json({ error: "Internal server error" });
    }
};