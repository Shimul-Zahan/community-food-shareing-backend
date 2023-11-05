const express = require('express');
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;
require('dotenv').config();

// console.log(process.env.DB_NAME)
// console.log(process.env.DB_PASS)

const cors = require('cors');
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_NAME}:${process.env.DB_PASS}@shimulclaster1.85diumq.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        // .limit(6)

        const allFoods = client.db("communityFoodSharingDB").collection('allFoods');
        const requestFoods = client.db("communityFoodSharingDB").collection('requestFoods');

        app.get('/all-foods', async (req, res) => {
            const count = await allFoods.estimatedDocumentCount();
            const result = await allFoods.find().sort({ quantity: -1 }).toArray();
            res.send(result);
        })
        
        app.get('/requested-foods', async (req, res) => {
            const email = req.query.email;
            const result = await requestFoods.find({ userEmail: email }).toArray();
            res.send(result);
        })

        app.get('/manage-foods', async (req, res) => {
            const email = req.query.email;
            // console.log(email)
            const result = await requestFoods.find({ donorEmail: email }).toArray();
            res.send(result);
        })

        app.get('/view-details/:id', async (req, res) => {
            const id = req.params.id;
            console.log("Id", id)
            const query = { _id: new ObjectId(id) };
            const result = await allFoods.findOne(query);
            res.send(result)
            console.log("data", result)
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
