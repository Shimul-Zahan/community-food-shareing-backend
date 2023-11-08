const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const cookieparse = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;
require('dotenv').config();

// console.log(process.env.DB_NAME)
// console.log(process.env.DB_PASS)

const cors = require('cors');
app.use(cors({
    origin: [
        'http://localhost:5173'
    ],
    credentials: true,
}));
app.use(express.json());
app.use(cookieparse())

const uri = `mongodb+srv://${process.env.DB_NAME}:${process.env.DB_PASS}@shimulclaster1.85diumq.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const security = (req, res, next) => {
    const token = req.cookies?.token
    // console.log("cookies token",token)
    if (!token) {
        return res.status(401).send({ message: 'Unauthorized access' })
    }
    jwt.verify(token, process.env.SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).send({message: 'Access forbiden'})
        }
        req.decode = decoded
        next();
    })
}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        // .limit(6)

        const allFoods = client.db("communityFoodSharingDB").collection('allFoods');
        const requestFoods = client.db("communityFoodSharingDB").collection('requestFoods');

        app.get('/all-foods', security, async (req, res) => {
            const count = await allFoods.estimatedDocumentCount();
            const result = await allFoods.find().sort({ quantity: -1 }).toArray();
            res.send(result);
        })

        app.get('/requested-foods', async (req, res) => {
            const email = req.query.email;
            const result = await requestFoods.find({ userEmail: email }).toArray();
            res.send(result);
        })

        app.get('/all-requested-foods', async (req, res) => {
            const result = await requestFoods.find().toArray();
            res.send(result);
        })

        app.get('/manage-foods', async (req, res) => {
            const userEmail = req.query.email;
            // console.log(userEmail)
            const result = await allFoods.find({ donorEmail: userEmail }).toArray();
            res.send(result)
            // console.log(result);
        })

        app.get('/view-details/:id', async (req, res) => {
            const id = req.params.id;
            // console.log("Id", id)
            const query = { _id: new ObjectId(id) };
            const result = await allFoods.findOne(query);
            res.send(result)
            // console.log("data", result)
        })

        app.get('/manage-single-food/:id', async (req, res) => {
            const id = req.params.id;
            // console.log(id);
            const result = await requestFoods.findOne({ foodId: id })
            res.send(result);
            // console.log(result);
        })

        app.get('/avaiable-foods', async (req, res) => {
            const search = req.query.search;
            if (search) {
                const regex = new RegExp(`\\b${search}`, 'iu');
                const result = await allFoods.find({ foodName: regex }).toArray();
                return res.send(result);
            } else {
                const result = await allFoods.find().toArray();
                return res.send(result);
            }
        })

        app.get('/avaiable-food', async (req, res) => {
            const sort = req.query.sort;
            if (sort == 'ascending') {
                const result = await allFoods.find().sort({ expiredDate: 1 }).toArray();
                return res.send(result)
            }
            const result = await allFoods.find().sort({ expiredDate: -1 }).toArray();
            res.send(result)
        })

        app.post('/add-food', async (req, res) => {
            const food = req.body;
            const result = await allFoods.insertOne(food);
            res.send(result);
        })

        app.post('/requested-foods', async (req, res) => {
            const food = req.body;
            const result = await requestFoods.insertOne(food);
            res.send(result);
        })

        app.put('/update-food/:id', async (req, res) => {
            const updateFood = req.body;
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    foodImage: updateFood.foodImage,
                    foodName: updateFood.foodName,
                    quantity: updateFood.quantity,
                    additionalNotes: updateFood.additionalNotes,
                    status: updateFood.status,
                    donatorImage: updateFood.donatorImage,
                    donatorName: updateFood.donatorName,
                    donorEmail: updateFood.donorEmail,
                    pickupLocation: updateFood.pickupLocation,
                    expiredDate: updateFood.expiredDate,
                },
            };
            const result = await allFoods.updateOne(filter, updateDoc, options);
            res.send(result);
        })

        app.patch('/approve-request/:id', async (req, res) => {
            const updateStatus = req.body;
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    status: updateStatus.status,
                },
            };
            const result = await requestFoods.updateOne(filter, updateDoc);
            console.log(result)
            res.send(result);
        })
        app.delete('/delete-food/:id', async (req, res) => {
            const id = req.params.id;
            const result = await allFoods.deleteOne({ _id: new ObjectId(id) });
            res.send(result);
        })

        app.delete('/delete-requested-food/:id', async (req, res) => {
            const id = req.params.id;
            const result = await requestFoods.deleteOne({ _id: new ObjectId(id) });
            res.send(result);
        })

        app.post('/jwt', (req, res) => {
            const email = req.body;
            const token = jwt.sign(email, process.env.SECRET, { expiresIn: '10h' })
            // console.log(token)
            res.cookie('token', token, {
                httpOnly: true,
                secure: false,
            }).send({ success: token })
        })

        app.post('/logout', (req, res) => {
            const user = req.body;
            res.clearCookie('token', {maxAge: 0}).send({success: true})
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.listen(port, () => {
    console.log(`Server running at ${port}`)
})
