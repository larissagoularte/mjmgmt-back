require('dotenv').config(); 
const multer = require('multer');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');


const s3 = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
    }
});

const uploadToR2 = async (file) => {
    const uniqueFilename = `${uuidv4()}-${file.originalname}`;

    const uploadParams = {
        Bucket: process.env.R2_BUCKET_NAME,
        Key: uniqueFilename,
        Body: file.buffer,
        ACL: 'public-read',
        ContentType: file.mimetype
    };

    try {
        const command = new PutObjectCommand(uploadParams);
        const data = await s3.send(command);
        console.log(`File uploaded successfully: ${data}`);
        const fileUrl = `${process.env.R2_PUBLIC_ENDPOINT}/${uniqueFilename}`;

        return fileUrl;
    } catch (err) {
        console.log(`${process.env.R2_ENDPOINT}/${uniqueFilename}`);
        throw new Error(`Error uploading file to R2: ${err.message}`);
    }
};

const storage = multer.memoryStorage(); 

const upload = multer({
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 500 }, // 500MB file size limit
    fileFilter: (req, file, cb) => {
        const allowedImageTypes = ['jpg', 'jpeg', 'png'];
        const allowedVideoTypes = ['mp4', 'avi', 'mov', 'mkv', 'webm'];
        const extname = file.mimetype.split('/')[1].toLowerCase();

        if (allowedImageTypes.includes(extname) || allowedVideoTypes.includes(extname)) {
            cb(null, true);
        } else {
            cb(new Error('Only image and video files are allowed!'), false);
        }
    }
});
  
module.exports = { upload, uploadToR2 };
