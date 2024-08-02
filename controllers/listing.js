const Listing = require("../models/listing");
const User = require("../models/user");
const fs = require('fs');
const path = require('path');
const { uploadToR2 } = require('../middlewares/upload');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
    }
});

exports.addListing = async (req, res) => {
    const { title, description, rent, rooms, location, status } = req.body;

    try {
        if (!title || !description || !rent || !rooms || !location || !status) {
            ///////////////DEBUG/////////////
            //console.log("Missing fields:", { title, description, rent, rooms, location, status });
            //console.log(title)
            //console.log(description)
            //console.log(rent)
            //console.log(rooms)
            //console.log(location)
            //console.log(status)
            return res.status(400).json({ error: 'All fields are required.' });
        }

        if (typeof title !== 'string' || typeof description !== 'string' || typeof location !== 'string' || typeof Number(rent) !== 'number' || isNaN(Number(rent))) {
            
            ///////////////DEBUG/////////////
            //console.log("Invalid data types:", { title, description, location, rent });
            
            return res.status(400).json({ error: 'Invalid data types.' });
        }

        const validRooms = ['T0', 'T1', 'T2', 'T3', 'T4', 'T5+'];
        const validStatus = ['available', 'unavailable'];

        if (!validRooms.includes(rooms) || !validStatus.includes(status)) {
    
            ///////////////DEBUG/////////////
            //console.error("Invalid enum values:", { rooms, status });
            
            return res.status(400).json({ error: 'Invalid enum values.' });
        }

        if (!req.files || req.files.length === 0) {
            
            ///////////////DEBUG/////////////
            //console.error("No images provided");

            return res.status(400).json({ error: 'At least one image is required.' });
        }

        const userId = req.user._id; 

        if (!userId) {
            
            ///////////////DEBUG/////////////
            //console.error("Unauthorized");
            
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const fileNames = [];
        if (req.files && Array.isArray(req.files)) {
            try {
                for (const file of req.files) {
                    const fileName = await uploadToR2(file);
                    fileNames.push(fileName);
                    
                    ///////////////DEBUG/////////////
                    //console.log('FILENAME:', fileName);
                }

            } catch (error) {
                return res.status(500).json({ message: 'Error uploading files to R2', error: error.message });
            }
        }
        const listing = new Listing({
            title,
            description,
            rooms,
            rent,
            location,
            status,
            media: fileNames,
            user: userId 
        });
        
        ///////////////DEBUG/////////////
        //console.log("Saving listing:", listing);

        const savelisting = await listing.save();

        ///////////////DEBUG/////////////
       //console.log("Listing saved:", savelisting);


        const user = await User.findById(userId);
        if (!user) {

            ///////////////DEBUG/////////////
            //console.error("User not found:", userId);
            
            return res.status(404).json({ error: 'User not found.' });
        }

        user.listings.push(savelisting._id);
        await user.save();

        ///////////////DEBUG/////////////
        //console.log("User updated with new listing");

        res.status(201).json(savelisting);
    } catch (error) {

        ///////////////DEBUG/////////////
        //console.error("Internal server error:", error);
        
        res.status(500).json({ message: 'Internal server error.' });
    }
};

exports.fetchListings = async (req, res) => {
    try {
        const userId = req.user._id;

        const listings = await Listing.find({ user: userId });
        if (!listings || listings.length === 0) {
            return res.status(404).json({ error: 'No listings found for this user.' });
        }
        res.json(listings);
    } catch (error) {
        
        ///////////////DEBUG/////////////
        //console.error('Error fetching listings:', error);
        
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.fetchListingById = async (req, res) => {
    try {
        const listingId = req.params.id;
        const listing = await Listing.findById(listingId);

        if (!listing) {
            console.error(`Listing not found: ${listingId}`);
            return res.status(404).json({ error: 'Listing not found.' });
        }
        
        if (listing.status === 'unavailable') {
            const token = req.cookies.token; 
            if (!token) {
                return res.status(401).json({ message: 'Unauthorized - Listing Unavailable'});
            }
        }

        res.status(200).json(listing);
    } catch (error) {
        console.error('Internal server error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};

exports.updateListing = async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const listing = await Listing.findById(req.params.id);

        if (!listing) {
            return res.status(404).json({ error: 'Listing not found.' });
        }

        if (listing.user.toString() !== userId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        let imageNames = listing.media;

        const { imagesRemove } = JSON.parse(req.body.data);

        await Promise.all(imagesRemove.map(async (imageName) => {
            try {
                const imageKey = decodeURIComponent(imageName);

                const deleteParams = {
                    Bucket: process.env.R2_BUCKET_NAME,
                    Key: imageKey
                };

                const command = new DeleteObjectCommand(deleteParams);
                await s3.send(command);

                console.log(`Deleted image with key: ${imageKey}`);
            } catch (err) {
                console.error(`Failed to delete image ${imageName}:`, err);
                return res.status(500).send({ error: 'Failed to remove image from R2.' });            }
        }));

        imageNames = imageNames.filter(img => !imagesRemove.includes(img));

        if (req.files && req.files.length > 0) {
            const newImages = req.files.map(file => file.filename);
            imagePaths = imagePaths.concat(newImages);
        }

        const validRooms = ['T0', 'T1', 'T2', 'T3', 'T4', 'T5+'];
        const validStatus = ['available', 'unavailable'];

        const updatedData = {
            ...JSON.parse(req.body.data),
            media: imageNames
        };

        if (updatedData.rooms && !validRooms.includes(updatedData.rooms)) {
            return res.status(400).json({ message: 'Invalid rooms' });
        }

        if (updatedData.status && !validStatus.includes(updatedData.status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const updatedListing = await Listing.findByIdAndUpdate(req.params.id, updatedData, { new: true });

        res.json(updatedListing);

    } catch (error) {
        console.log(error);
        res.status(500).send({ message: 'Internal server error.' });
    }
};


exports.removeListing = async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const listing = await Listing.findById(req.params.id);

        if (!listing) {
            return res.status(404).send({ error: 'Listing not found.' });
        }

        if (listing.user.toString() !== userId) {
            return res.status(403).send({ error: 'Nao autorizado' });
        }

        await Promise.all(listing.media.map(async (fileName) => {
            try {
                const imageKey = filename;

                /////////DEBUG////////
                console.log(`Deleting image with key: ${imageKey}`);

                const deleteParams = {
                    Bucket: process.env.R2_BUCKET_NAME,
                    Key: imageKey
                };

                const command = new DeleteObjectCommand(deleteParams);
                await s3.send(command);

                console.log(`Deleted image with key: ${imageKey}`);
            } catch (err) {
                console.error(`Failed to delete image ${fileName}:`, err);
            }
        }));

        await Listing.findByIdAndDelete(req.params.id);

        res.status(200).json({ message: 'Listing succesfully removed.' });
    } catch (error) {
        console.log(error);
        res.status(500).send({ error: 'Internal server error.' });
    }
};

exports.removeImage = async (req, res) => {
    try{
        const userId = req.user._id.toString();
        const {id, imageName} = req.params;
        console.log('--------REMOVE IMAGE USER ID', userId)
        



        if (!imageName) {
            return res.status(400).send({ error: 'Imagem path is required' });
        }

        const listing = await Listing.findById(id);
        if (!listing) {
            return res.status(404).send({ error: 'Listing not found.' });
        }

        if (listing.user.toString() !== userId) {
            return res.status(403).send({ error: 'Unauthorized' });
        }

        const imageKey = decodeURIComponent(imageName); 
        try {
            // Delete image from R2
            const deleteParams = {
                Bucket: process.env.R2_BUCKET_NAME,
                Key: imageKey
            };
            const command = new DeleteObjectCommand(deleteParams);
            await s3.send(command);
            console.log(`Deleted image with key: ${imageKey}`);
        } catch (err) {
            console.error(`Failed to delete image ${imageKey}:`, err);
            return res.status(500).send({ error: 'Failed to remove image from R2.' });
        }

        listing.media = listing.media.filter(img => img !== imageName);
        await listing.save();

        res.status(200).json({ error: 'Image succesffully removed.' });

    }catch(err){
        console.log(err);
        res.status(500).send({ error: 'Failed to remove image.' });
    }
}