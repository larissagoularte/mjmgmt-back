const express=require("express")
const router=express.Router()
const authController=require("../controllers/auth")
const { isAuthenticated } = require('../middlewares/auth');


router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', isAuthenticated, authController.logout);
module.exports=router