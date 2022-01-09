const adminMiddleware = require("../helper/adminMiddleware"),
    loginMiddleware = require("../helper/loginMiddleWare"),
    express=require("express"),
    app=express.Router(),
    Movie=require("../db/Models/Movies"),
    multer=require("multer"),
    User=require("../db/Models/User");


class MovieCustomStorage {
    _handleFile(req, file, cb) {
        let temp=0;
        file.stream.on("data",(chunk)=>{
            temp+=Buffer.byteLength(chunk);
            console.log(temp);
        })
        file.stream.pipe(req.googleClient.bucket("movie-videos").file(req.params.movieId+".mp4").createWriteStream());
        // 
        file.stream.on("end",()=>{
            console.log(`${req.params.movieId+".mp4"} uploaded succesfully`);
            cb(null,{});
        })
        file.stream.on("error",(err)=>{
            console.log(err.message);
            cb(null,{});
        })
    }
}


class TrailerCustomStorage {
    _handleFile(req, file, cb) {
        try{
            let temp=0;
            // throw new Error("errr on handler function trailer");
            file.stream.on("data",(chunk)=>{
                temp+=Buffer.byteLength(chunk);
                console.log(temp);
            })
            file.stream.pipe(req.googleClient.bucket("trailer-videos").file(req.params.movieId+".mp4").createWriteStream());
            // 
            file.stream.on("end",()=>{
                console.log(`${req.params.movieId+".mp4"} uploaded succesfully`);
                cb(null,{});
            })
            file.stream.on("error",(err)=>{
                console.log(err.message);
                cb(null,{});
            })
        }catch(err){
            cb(err);
        }
    }
}


const movieParse = multer({storage:new MovieCustomStorage()});
const trailerParse=multer({storage:new TrailerCustomStorage()});

app.get("/isAdmin",loginMiddleware,adminMiddleware,(req,res)=>{
    res.send();
})

app.post("/movie",loginMiddleware,adminMiddleware,async (req,res)=>{
    try{
        let movie=new Movie(req.body);
        movie=await movie.save();
        res.send(movie);
    }catch(err){
        res.status(404).send(err.message);
    }
})


app.post("/upload/movie/:movieId",loginMiddleware,adminMiddleware,movieParse.single("movie"),(req,res)=>{
    console.log(req.file);
    console.log("movie uploaded")
    res.send();
},()=>{
    console.log("movie upload error")
})


app.post("/upload/trailer/:movieId",trailerParse.single("trailer"),(req,res)=>{
    console.log("trailer uploaded")
    // throw new Error("errorrr")
    res.send();
})


app.get("/users",async (req,res)=>{
    try{
        let users=await User.find({},null,{
            sort:{
                createdAt:-1
            }
        })
        res.send(users);
    }catch(err){
        res.status(400).send(err.message)
    }
})

app.get("/users/:id",async (req,res)=>{
    try{
        let user=await User.findById(req.params.id);
        if(!user)throw new Error("invalid user id");
        user=await user.populate({
            path:"payments",
            select:"-updatedAt",
            options:{
                sort:{
                    createdAt:-1
                }
            }
        })
        res.send(user);
    }catch(err){
        res.status(400).send(err.message);
    }
})

app.get("/userDivisons",async (req,res)=>{
    try{
        let users=await User.find({});
        let preminum=[],standard=[],free=[];
        users.forEach((user)=>{
            user.planDetails=user.getPlan();
            if(user.planDetails.plan==="Standard")standard.push(user);
            else if(user.planDetails.plan==="Preminum")preminum.push(user);
            else free.push(user);
        })
        preminum.sort(function(user1,user2){
            if(user1.planDetails.days>user2.planDetails.days)return -1;
            else if(user1.planDetails.days<user2.planDetails.days)return 1;
            else{
                if(user1.planDetails.hours>user2.planDetails.hours)return -1;
                else 1;
            }
        })
        // console.log(preminum)
        standard.sort(function(user1,user2){
            if(user1.planDetails.days>user2.planDetails.days)return -1;
            else if(user1.planDetails.days<user2.planDetails.days)return 1;
            else{
                if(user1.planDetails.hours>user2.planDetails.hours)return -1;
                else 1;
            }
        })
        res.send({
            preminum,
            standard,
            free
        })
    }catch(err){
        res.status(404).send(err.message);
    }
})


app.get("/getMonthlyData",async (req,res)=>{
    try{    
        let count=await User.aggregate([
            {$project:
                {
                    month: {
                        $month: '$createdAt'
                    },
                    year:{
                        $year:"$createdAt"
                    }
                }
            }
          ])
        res.send(count)
    }catch(err){
        res.status(404).send(err.message);
    }
})

module.exports=app;