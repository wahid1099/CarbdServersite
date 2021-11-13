const express=require('express');
const app = express();
const cors=require('cors');
require('dotenv').config();
const {MongoClient}=require('mongodb');
const ObjectId = require('mongodb').ObjectId;

const admin = require("firebase-admin");
const port=process.env.PORT || 8000;

//middleware
app.use(cors());
app.use(express.json());


//firebase admin connection
// const serviceAccount = require("path/to/serviceAccountKey.json");
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

//connecting server to mongo db
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.byzxg.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

///
async function verifyToken(req,res, next){
    if(req.headers?.authorization?.startsWith('Bearer ')){
        const token=req.headers.authorization.split(' ')[1];
        try{
            const decodedUser=await admin.auth().verifyIdToken(token);
            req.decodedEmail=decodedUser.email;
        }
        catch{

        }
    }
    next();
}

////////////--------------------///////////////////////////////////////////

async function run(){
    try{ client
    //making connection with database

     await client.connect();
     //console.log('database connected');
        //creating database and collections
     const database = client.db('CarAgency');
     const carCollection = database.collection('Cars');
     const reviewCollection = database.collection('reviews');
     const userCollection=database.collection('users');
     const carbuyCollection=database.collection('Carpurchased');


     //getting all cars api
     app.get('/cars',async (req,res) => {
         const cursor =carCollection.find({});
         const cars=await cursor.toArray();
         res.send(cars);
     });
   //getting all users reviews
     app.get('/reviews',async (req,res) => {
        const cursor =reviewCollection.find({});
        const reviewws=await cursor.toArray();
        res.send(reviewws);

     });
        //getting cars with dynamic id
        app.get('/cars/:id',async (req,res) => {
            const id=req.params.id;
            const query={_id:ObjectId(id)};
            const cars=await carCollection.findOne(query);
            res.send(cars);
        });

     //inserting data to database collection
     app.post('/addcars',async (req,res) => {
         const newcars=req.body;
         const result=await carCollection.insertOne(newcars);
         //console.log(result);
         res.send(result);
     });

   //adding review to database
     app.post('/addreview',async (req,res) => {
        const reviewws=req.body;
        const result=await reviewCollection.insertOne(reviewws);
        //console.log(result);
        res.send(result);
    });
     //car buying collection
     app.post('/buycar',async (req,res)=>{
            const carbuy=req.body;
            const carresult=await carbuyCollection.insertOne(carbuy);
           // console.log(carresult);
            res.json(carresult);
     });
     //specific user order by his email
  
     //getting user all appointments
     app.get('/carorderd', async (req, res) => {
        const email = req.query.email;
        const query = { useremail: email }
       // console.log(query);
        const cursor = carbuyCollection.find(query);
        const carbought = await cursor.toArray();
        res.json(carbought);
    })

//getting all orders
 //alluser orders
     app.get('/allorder',async (req, res) => {
    const cursor=carbuyCollection.find({});
    const carbuy=await cursor.toArray();
    res.send(carbuy);
    });

     //deleting user car booked for buyings 
     app.delete('/delteOrder/:id',async (req,res)=>{
         const id=req.params.id;
         const query={_id:ObjectId(id)};
         const result=await carbuyCollection.deleteOne(query);
         res.json(result);
     });
      //deleting user car item for buyings 
      app.delete('/deletecar/:id',async (req,res)=>{
        const id=req.params.id;
        const query={_id:ObjectId(id)};
        const result=await carCollection.deleteOne(query);
        res.json(result);
    });
      
            ///getting admins database
            app.get('/users/:email',async (req, res)=>{
                const email=req.params.email;
                const query={email: email};
                const user=await userCollection.findOne(query);
                let isAdmin =false;
                if(user?.role==='admin') {
                    isAdmin = true;
                }
                res.json({admin: isAdmin});
            
            
                });


         //adding user data to databse
           app.post('/users',async (req, res) => {
            const user=req.body;
            const result = await userCollection.insertOne(user);
            res.json(result);
            });
        ///adding already exists users  data to database
        app.put('/users',async (req, res) => {
            const user = req.body;
            const filter={email: user.email};
           // console.log(filter);
            const options = {upsert: true};
            const updateDoc={$set:user};
            const result=await userCollection.updateOne(filter,updateDoc,options);
            res.json(result);
        });
             ////////////////////////////////making admin and giving 
             app.put('/users/admin', verifyToken,async(req,res) => {
                const user=req.body;
                const requester=req.decodedEmail;
                if(requester){
                    const requesterAccount=await userCollection.findOne({email:requester});
                    if(requesterAccount.role=='admin'){
                        const filter = { email: user.email };
                        const updateDoc = { $set: { role: 'admin' } };
                        const result = await userCollection.updateOne(filter, updateDoc);
                        res.json(result);
    
                    }
                }
                else {
                    res.status(403).json({ message: 'you do not have access to make admin' })
                }
    
            })
    


            
            
            


    }



    finally{}
}

run().catch(console.dir);


app.get('/',(req,res)=>{
    res.send('Cars server is running');
});


app.listen(port,()=>{
    console.log('server in listening on port '+port);
});

