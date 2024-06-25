const mongoose = require('mongoose');
require("dotenv").config();
const app = require('./app'); 
const cors = require('cors');

app.use(cors());

const url = process.env.DATABASE
async function connectToDB(){
    try{
       await mongoose.connect(url)
       console.log('Connected to DB using Mongoose :)')
    } catch (err){
        console.error('Failed to connect to DB using Mongoose :(', err);
    }
}

connectToDB();


const port = process.env.PORT || 9000;
app.listen(port, () => {
    console.log('MJManagement running on port ' + port);
});