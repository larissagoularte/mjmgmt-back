const express = require("express");
const router = express.Router();
const listingController = require("../controllers/listing");
const { isAuthenticated } = require("../middlewares/auth");
const { upload, uploadToR2 } = require('../middlewares/upload');

router.post('/add', isAuthenticated, upload.array('media', 20), listingController.addListing);
router.get('/', isAuthenticated, listingController.fetchListings);
router.get('/:id', listingController.fetchListingById);
router.put('/:id', isAuthenticated, upload.array('media', 20), listingController.updateListing);
router.delete('/:id', isAuthenticated, listingController.removeListing);
router.delete('/:id/:imageName', isAuthenticated, listingController.removeImage);


module.exports=router