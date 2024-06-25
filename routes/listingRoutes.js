const express = require("express");
const router = express.Router();
const listingController = require("../controllers/listing");
const { isAuthenticated } = require("../middlewares/auth");
const upload = require('../middlewares/upload');

router.post('/add', isAuthenticated, upload, listingController.addListing);
router.get('/', isAuthenticated, listingController.fetchListings);
router.get('/:id', listingController.fetchListingById);
router.put('/:id', isAuthenticated, upload, listingController.updateListing);
router.delete('/:id', isAuthenticated, listingController.removeListing);
router.delete('/:id/images/:image', isAuthenticated, listingController.removeImage);


module.exports=router