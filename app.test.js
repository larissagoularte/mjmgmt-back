const request = require('supertest');
const mongoose = require('mongoose');
const User = require('./models/user');
const Listing = require('./models/listing');
const Blacklist = require('./models/blacklist');
const app = require('./app');
const jwt = require('jsonwebtoken'); 
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const JWT_SECRET=process.env.JWT_SECRET
const url=process.env.DATABASE

describe('Auth', () => {
    beforeAll(async () => {
        await mongoose.connect(url);
    });

    afterAll(async () => {
        await User.deleteMany({});
        await Blacklist.deleteMany({});
        await mongoose.connection.close();
    });

    describe('Registration', () => {
        it('should register a new user', async () => {
            const response = await request(app)
                .post('/auth/register')
                .send({
                    name: 'User Teste',
                    email: 'userteste@email.com',
                    pass: 'Test@1234'
                });
            
                expect(response.statusCode).toBe(201);
                expect(response.body).toHaveProperty('email', 'userteste@email.com');
        })

        it('should not register a user with an invalid email', async () => {
            const response = await request(app)
                .post('/auth/register')
                .send({ 
                    name: 'User Teste',
                    email: 'invalid-email', 
                    pass: 'Test@1234' });
    
            console.log('Invalid Email Register Response:', response.body);
            expect(response.statusCode).toBe(400);
            expect(response.body).toHaveProperty('error', 'Invalid email.');
        });

        it('should not register a user with an invalid password', async () => {
            const response = await request(app)
                .post('/auth/register')
                .send({ 
                    name: 'User teste',
                    email: 'testuser2@example.com', 
                    pass: 'password' });
    
            console.log('Invalid Password Register Response:', response.status, response.body, response.text);
            expect(response.statusCode).toBe(400);
            expect(response.body).toHaveProperty('error', 'Invalid password. Password must contain at least 8 characters, one uppercase and lowercase letter, one number and special character.');
        });

        it('should not register a user with a duplicate email', async () => {
            await request(app)
                .post('/auth/register')
                .send({ 
                    name: 'User teste',
                    email: 'duplicateuser@example.com', 
                    pass: 'Test@1234' 
                });
    
            const response = await request(app)
                .post('/auth/register')
                .send({ 
                    name: 'User teste 2',
                    email: 'duplicateuser@example.com', 
                    pass: 'Test@1234' 
                });
    
            console.log('Duplicate Register Response:', response.status, response.body, response.text);
            expect(response.statusCode).toBe(409);
            expect(response.body).toHaveProperty('error', 'User with this email already exists.');
        });
    })

    describe('Login', () => {
        it('should login the user and set a cookie', async () => {
            const response = await request(app)
              .post('/auth/login')
              .send({
                email: 'userteste@email.com',
                pass: 'Test@1234'
              });

            
            expect(response.statusCode).toBe(200);
            expect(response.headers['set-cookie']).toBeDefined();
          });

          it('should not allow an unregistered user to login', async () => {
            const response = await request(app)
                .post('/auth/login')
                .send({ 
                    email: 'unregistered@example.com', 
                    pass: 'Test@1234' 
                });
    
            expect(response.statusCode).toBe(400);
            expect(response.body).toHaveProperty('error', 'Invalid email or password.');
        });

        it('should not allow login with wrong password', async () => {   
            const response = await request(app)
                .post('/auth/login')
                .send({ 
                    email: 'userteste@email.com', 
                    pass: 'WrongPassword' 
                });
    
            expect(response.statusCode).toBe(400);
            expect(response.body).toHaveProperty('error', 'Invalid email or password.');
        });

        it('should login with case insensitive email', async () => {
            await request(app)
                .post('/auth/register')
                .send({ 
                    name: 'User teste',
                    email: 'CaseTest@example.com', 
                    pass: 'Test@1234' 
                });
    
            const response = await request(app)
                .post('/auth/login')
                .send({ 
                    email: 'casetest@example.com', 
                    pass: 'Test@1234' 
                });
                
            expect(response.statusCode).toBe(200);
            expect(response.headers['set-cookie']).toBeDefined();
        });
    })

    describe('Logout', () => {
        it('should logout the user and blacklist the token', async () => {
            const loginResponse = await request(app)
                .post('/auth/login')
                .send({
                    email: 'userteste@email.com',
                    pass: 'Test@1234'
                });

            const cookies = loginResponse.headers['set-cookie'];
            console.log('Login Set-Cookie Header:', cookies);
            expect(cookies).toBeDefined(); 

            const logoutResponse = await request(app)
                .post('/auth/logout')
                .set('Cookie', cookies)
                .send();

            console.log('Logout Response:', logoutResponse.body); 
            expect(logoutResponse.statusCode).toBe(200);
            expect(logoutResponse.body).toHaveProperty('message', 'Successfully logged out');

            const protectedResponse = await request(app)
                .get('/protected-route')
                .set('Cookie', cookies)
                .send();

            expect(protectedResponse.statusCode).toBe(401);
            expect(protectedResponse.body).toHaveProperty('error', 'Token is blacklisted');

        });

    })

    describe('Protected Routes', () => {
        it('should not allow access to protected route without token', async () => {
            const response = await request(app)
                .get('/protected-route')
                .send();

            expect(response.statusCode).toBe(401);
        });

        it('should not allow access to protected route with invalid token', async () => {
            const response = await request(app)
                .get('/protected-route')
                .set('Cookie', 'token=invalidtoken')
                .send();

            expect(response.statusCode).toBe(401);
        });
    })
});


describe('Listings', () => {
    let token;
    let userId;
    let listingId;


    beforeAll(async () => {
        await mongoose.connect(url);

        const userResponse = await request(app)
            .post('/auth/register')
            .send({ 
                name: 'User Test',
                email: 'testuser@example.com', 
                pass: 'Test@1234' 
            });

        userId = userResponse.body._id;

        const loginResponse = await request(app)
            .post('/auth/login')
            .send({ 
                email: 'testuser@example.com', 
                pass: 'Test@1234' 
            });

        token = loginResponse.headers['set-cookie'];

    });

    afterAll(async () => {
        await Listing.deleteMany({});
        await User.deleteMany({});
        await mongoose.connection.close();
    });
    
    describe('Add Listing', () => {
        it('should add a new listing', async () => {
            const response = await request(app)
                .post('/listings/add')
                .set('Cookie', token)
                .field('title', 'Test Listing')
                .field('description', 'A test listing description')
                .field('rent', 1000)
                .field('rooms', 'T2')
                .field('location', 'Test Location')
                .field('status', 'available')
                .attach('images', path.resolve(__dirname, 'image3.jpg'));
    
            expect(response.statusCode).toBe(201);
            expect(response.body).toHaveProperty('title', 'Test Listing');
            expect(response.body).toHaveProperty('description', 'A test listing description');
            expect(response.body).toHaveProperty('rent', 1000);
            expect(response.body).toHaveProperty('rooms', 'T2');
            expect(response.body).toHaveProperty('location', 'Test Location');
            expect(response.body).toHaveProperty('status', 'available');
            expect(response.body.images).toBeDefined();
            expect(response.body.images.length).toBeGreaterThan(0);
        });
    
        it('should return 400 for missing fields', async () => {
            const response = await request(app)
                .post('/listings/add')
                .set('Cookie', token)
                .field('title', 'Test Listing')
                .field('description', '')
                .field('rent', 1000)
                .field('rooms', 'T2')
                .field('location', 'Test Location')
                .field('status', 'available');
    
            expect(response.statusCode).toBe(400);
            expect(response.body).toHaveProperty('error', 'All fields are required.');
        });
    
        it('should return 400 for invalid data types', async () => {
            const response = await request(app)
                .post('/listings/add')
                .set('Cookie', token)
                .field('title', 'Test title') 
                .field('description', 'A test listing description')
                .field('rent', 'invalid rent') 
                .field('rooms', 'T2')
                .field('location', 'Test Location')
                .field('status', 'available')
                .attach('images', path.resolve(__dirname, 'image3.jpg'));
    
            expect(response.statusCode).toBe(400);
            expect(response.body).toHaveProperty('error', 'Invalid data types.');
        });
    
        it('should return 400 for invalid enum values', async () => {
            const response = await request(app)
                .post('/listings/add')
                .set('Cookie', token)
                .field('title', 'Test Listing')
                .field('description', 'A test listing description')
                .field('rent', '1000')
                .field('rooms', 'T10') 
                .field('location', 'Test Location')
                .field('status', 'invalid') 
                .attach('images', path.resolve(__dirname, 'image3.jpg')); 
    
            expect(response.statusCode).toBe(400);
            expect(response.body).toHaveProperty('error', 'Invalid enum values.');
        });
    
        it('should return 400 if no images are provided', async () => {
            const response = await request(app)
                .post('/listings/add')
                .set('Cookie', token)
                .field('title', 'Test Listing')
                .field('description', 'A test listing description')
                .field('rent', '1000')
                .field('rooms', 'T2')
                .field('location', 'Test Location')
                .field('status', 'available');
    
            expect(response.statusCode).toBe(400);
            expect(response.body).toHaveProperty('error', 'At least one image is required.');
        });
    
        it('should return 401 if user ID is missing in token', async () => {
            const response = await request(app)
                .post('/listings/add')
                .send({
                    title: 'Test Listing',
                    description: 'A test listing description',
                    rent: 1000,
                    rooms: 'T2',
                    location: 'Test Location',
                    status: 'available'
                });
    
            expect(response.statusCode).toBe(401);
            expect(response.body).toHaveProperty('error', 'Unauthorized');
        });
    })
    
    describe('Fetch Listings', () => {
        it('should fetch all listings for the authenticated user', async () => {
            const response = await request(app)
                .get('/listings')
                .set('Cookie', token);
    
            console.log('Response status:', response.statusCode);
            console.log('Response body:', response.body); 
    
            expect(response.statusCode).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);
            expect(response.body[0]).toHaveProperty('title', 'Test Listing');
        });

        it('should return 404 if no listings are found', async () => {
            await Listing.deleteMany({});
    
            const response = await request(app)
                .get('/listings')
                .set('Cookie', token);
    
            expect(response.statusCode).toBe(404);
            expect(response.body).toHaveProperty('error', 'No listings found for this user.');
        });

        it('should return 401 if the user is not authenticated', async () => {
            const response = await request(app)
                .get('/listings');
    
            expect(response.statusCode).toBe(401);
            expect(response.body).toHaveProperty('error', 'Unauthorized');
        });
    })

    describe('Fetch Listing by Id', () => {
        it('should fetch an available listing for non-authenticated users', async () => {
            const listingResponse = await request(app)
                .post('/listings/add')
                .set('Cookie', token)
                .field('title', 'Test Listing')
                .field('description', 'A test listing description')
                .field('rent', 1000)
                .field('rooms', 'T2')
                .field('location', 'Test Location')
                .field('status', 'available')
                .attach('images', path.resolve(__dirname, 'image3.jpg')); 

            listingId = listingResponse.body._id;

            const response = await request(app)
                .get(`/listings/${listingId}`);
            
            
            console.log('Response status:', response.statusCode);
            
            console.log('Response body:', response.body);
        
            expect(response.statusCode).toBe(200);
            expect(response.body).toHaveProperty('title', 'Test Listing');
        });

        it('should return 404 if the listing is not found', async () => {
            const nonExistentListingId = '60c72b2f9b1e8a5f6c2f8e9c'; 
        
            const response = await request(app)
                .get(`/listings/${nonExistentListingId}`);
            
            console.log('Response status:', response.statusCode);
            console.log('Response body:', response.body);
        
            expect(response.statusCode).toBe(404);
            expect(response.body).toHaveProperty('error', 'Listing not found.');
        });

        it('should return 401 for unauthorized access to an unavailable listing', async () => {
            const listingResponse = await request(app)
                .post('/listings/add')
                .set('Cookie', token)
                .field('title', 'Unavailable Listing')
                .field('description', 'A test listing description')
                .field('rent', 1000)
                .field('rooms', 'T2')
                .field('location', 'Test Location')
                .field('status', 'unavailable')
                .attach('images', path.resolve(__dirname, 'image3.jpg')); 
        
            const listingId = listingResponse.body._id;
        
            const response = await request(app)
                .get(`/listings/${listingId}`);
        
            console.log('Response status:', response.statusCode);
            console.log('Response body:', response.body);
        
            expect(response.statusCode).toBe(401);
            expect(response.body).toHaveProperty('error', 'Unauthorized');
        });
    })

    describe('Update Listing', () => {
        it('should update the listing for the authenticated user', async () => {
            const listingResponse = await request(app)
                .post('/listings/add')
                .set('Cookie', token)
                .field('title', 'Original Listing')
                .field('description', 'Original description')
                .field('rent', 1000)
                .field('rooms', 'T2')
                .field('location', 'Original Location')
                .field('status', 'available')
                .attach('images', path.resolve(__dirname, 'image3.jpg')); 
        
            const listingId = listingResponse.body._id;
        
            const updateData = {
                data: JSON.stringify({
                    title: 'Updated Listing',
                    description: 'Updated description',
                    rent: 1200,
                    rooms: 'T3',
                    location: 'Updated Location',
                    status: 'available',
                    imagesRemove: []
                })
            };
        
            const response = await request(app)
                .put(`/listings/${listingId}`)
                .set('Cookie', token)
                .field('data', updateData.data);
        
            console.log('Response status:', response.statusCode);
            console.log('Response body:', response.body);
        
            expect(response.statusCode).toBe(200);
            expect(response.body).toHaveProperty('title', 'Updated Listing');
        });
        
    })

    describe('Remove Listing', () => {
        it('should remove the listing for the authenticated user', async () => {
            const listingResponse = await request(app)
                .post('/listings/add')
                .set('Cookie', token)
                .field('title', 'Listing to be deleted')
                .field('description', 'Description of listing to be deleted')
                .field('rent', 1000)
                .field('rooms', 'T2')
                .field('location', 'Location of listing to be deleted')
                .field('status', 'available')
                .attach('images', path.resolve(__dirname, 'image3.jpg'));
        
            const listingId = listingResponse.body._id;
        
            const response = await request(app)
                .delete(`/listings/${listingId}`)
                .set('Cookie', token);
        
            console.log('Response status:', response.statusCode);
            console.log('Response body:', response.body);
        
            expect(response.statusCode).toBe(200);
            expect(response.body).toHaveProperty('message', 'Listing succesfully removed.');
        });

        it('should return 404 if the listing is not found', async () => {
            const nonExistentListingId = '60c72b2f9b1e8a5f6c2f8e9c';
        
            const response = await request(app)
                .delete(`/listings/${nonExistentListingId}`)
                .set('Cookie', token);
        
            console.log('Response status:', response.statusCode);
            console.log('Response body:', response.body);
        
            expect(response.statusCode).toBe(404);
            expect(response.body).toHaveProperty('error', 'Listing not found.');
        });
    })
});

