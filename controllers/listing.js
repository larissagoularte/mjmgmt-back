const Listing = require("../models/listing");
const User = require("../models/user");
const fs = require('fs');
const path = require('path');


exports.addListing = async (req, res) => {
    const { title, description, rent, rooms, location, status } = req.body;

    try {
        if (!title || !description || !rent || !rooms || !location || !status) {
            console.log("Missing fields:", { title, description, rent, rooms, location, status });
            console.log(title)
            console.log(description)
            console.log(rent)
            console.log(rooms)
            console.log(location)
            console.log(status)

            return res.status(400).json({ error: 'All fields are required.' });
        }

        if (typeof title !== 'string' || typeof description !== 'string' || typeof location !== 'string' || typeof Number(rent) !== 'number' || isNaN(Number(rent))) {
            console.log("Invalid data types:", { title, description, location, rent });
            return res.status(400).json({ error: 'Invalid data types.' });
        }

        const validRooms = ['T0', 'T1', 'T2', 'T3', 'T4', 'T5+'];
        const validStatus = ['available', 'unavailable'];

        if (!validRooms.includes(rooms) || !validStatus.includes(status)) {
            console.error("Invalid enum values:", { rooms, status });
            return res.status(400).json({ error: 'Invalid enum values.' });
        }

        if (!req.files || req.files.length === 0) {
            console.error("No images provided");

            return res.status(400).json({ error: 'At least one image is required.' });
        }

        const userId = req.user._id; 

        if (!userId) {
            console.error("Unauthorized");
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const imagePaths = req.files.map(file => `/uploads/${file.filename}`);

        const listing = new Listing({
            title,
            description,
            rooms,
            rent,
            location,
            status,
            images: imagePaths,
            user: userId 
        });

        console.log("Saving listing:", listing);

        const savelisting = await listing.save();

        console.log("Listing saved:", savelisting);


        const user = await User.findById(userId);
        if (!user) {
            console.error("User not found:", userId);
            return res.status(404).json({ error: 'User not found.' });
        }

        user.listings.push(savelisting._id);
        await user.save();

        console.log("User updated with new listing");

        res.status(201).json(savelisting);
    } catch (error) {
        console.error("Internal server error:", error);
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
        console.error('Error fetching listings:', error);
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

        if (listing.status === 'available') {
            return res.status(200).json(listing);
        }

        const userId = req.user?._id;


        if (!userId) {
            console.error('Unauthorized access attempt to unavailable listing.');
            return res.status(401).json({ error: 'Unauthorized' });
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

        let imagePaths = listing.images; 
        const { imagesRemove } = JSON.parse(req.body.data);

        await Promise.all(imagesRemove.map(async (image) => {
            try {
                const imagePath = path.isAbsolute(image) ? image : path.join(UPLOADS_DIR, image);
                if (fs.existsSync(imagePath)) {
                    await fs.promises.unlink('../' + imagePath);
                    console.log(`Deleted image: ${imagePath}`);
                } else {
                    console.log(`Image not found at path: ${imagePath}`);
                }
            } catch (err) {
                console.error(`Failed to delete image ${image}:`, err);
            }
        }));

        imagePaths = imagePaths.filter(img => !imagesRemove.includes(img));

        if (req.files && req.files.length > 0) {
            const newImages = req.files.map(file => `/uploads/${file.filename}`);
            imagePaths = imagePaths.concat(newImages);
        }

        const validRooms = ['T0', 'T1', 'T2', 'T3', 'T4', 'T5+'];
        const validStatus = ['available', 'unavailable'];

        const updatedData = {
            ...JSON.parse(req.body.data),
            images: imagePaths
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

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

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

        await Promise.all(listing.images.map(async (image) => {
            try {
                const decodedImage = decodeURIComponent(image);
                const imagePath = path.isAbsolute(image) ? image : path.join(UPLOADS_DIR, decodedImage);                console.log(`Deleting image at path: ${imagePath}`);
                await fs.promises.unlink(imagePath);
                console.log(`Deleted image: ${imagePath}`);
            } catch (err) {
                console.error(`Failed to delete image ${image}:`, err);
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
        const userId = req.user._id;
        const {id, image} = req.params;


        if (!image) {
            return res.status(400).send({ error: 'Imagem path is required' });
        }

        const listing = await Listing.findById(id);
        if (!listing) {
            return res.status(404).send({ error: 'Listing not found.' });
        }

        if (listing.user.toString() !== userId) {
            return res.status(403).send({ error: 'Unauthorized' });
        }

        const decodedImage = decodeURIComponent(image);
        const imagePath = path.isAbsolute(image) ? image : path.join(UPLOADS_DIR, decodedImage);
        try {
            await fs.promises.unlink(imagePath);
            console.log(`Deleted image: ${imagePath}`);
        } catch (err) {
            console.error(`Failed to delete image ${imagePath}:`, err);
            return res.status(500).send({ error: 'Failed to remove image.' });
        }

        listing.images = listing.images.filter(img => img !== image);
        await listing.save();

        res.status(200).json({ error: 'Image succesffully removed.' });

    }catch(err){
        console.log(err);
        res.status(500).send({ error: 'Failed to remove image.' });
    }
}