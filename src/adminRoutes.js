//TODO
//get monthly new users(done)
//get plan user countin order(done)
//get all users(done)
//get payments of user(done)


//create movie details(done)
//upload movie(done)
//edit movies details(done)
//upload movie trailer(done)
//delelte movie(done)
//delete trailer(done)





const adminMiddleware = require("../helper/adminMiddleware"),
    loginMiddleware = require("../helper/loginMiddleWare"),
    express=require("express"),
    app=express.Router(),
    Movie=require("../db/Models/Movies"),
    multer=require("multer"),
    User=require("../db/Models/User"),
    getAccountAge=require("../helper/getAccountAge");



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
})


app.post("/upload/trailer/:movieId",trailerParse.single("trailer"),(req,res)=>{
    console.log("trailer uploaded")
    // throw new Error("errorrr")
    res.send();
})

app.put("/movies/:movieId",loginMiddleware,adminMiddleware,async (req,res)=>{
    try{
        let movie=await Movie.findById(req.params.movieId);
        if(!movie)throw new Error("invalid id");
        for(let i in Object.keys(req.body)){
            movie.i=req.body.i;
        }
        movie=await movie.save();
        res.send(movie)
    }catch(err){
        res.status(404).send(err.message);
    }
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
        let preminum=0,standard=0,free=0;
        let userCountsMonthly=[];
        for(let i=0;i<12;i++)userCountsMonthly[i]=0;
        let today=new Date();
        let curMonth=today.getMonth();
        let curYear=today.getFullYear();
        users.forEach((user)=>{
            let diff=getAccountAge(curMonth,curYear,user.createdAt);
            if(diff<12)userCountsMonthly[diff]++;
            user.planDetails=user.getPlan();
            if(user.planDetails.plan==="Standard")standard++;
            else if(user.planDetails.plan==="Preminum")preminum++;
            else free++;
        })




        res.send({
            currentPlanPopulation:{
                preminum,
                standard,
                free
            },
            userCountsMonthly
        })
        
    }catch(err){
        res.status(404).send(err.message);
    }
})


app.get("/getMonthlyNewUser",async (req,res)=>{
    try{    
        let {count}=await User.aggregate([
            {$project:
                {
                    month: {
                        $month: '$createdAt'
                    },
                    year:{
                        $year:"$createdAt"
                    },
                    count:{
                        $sum:1
                    }
                }
            },
            {
                $group:{
                    _id:null,
                    count:{$sum:1}
                }
            }
          ])
        res.send(count)
    }catch(err){
        res.status(404).send(err.message);
    }
})

app.delete("/movie/:movieId",loginMiddleware,adminMiddleware,async (req,res)=>{
    try{
        let movie=await Movie.findById(req.params.movieId);
        if(!movie)throw new Error("invalid movieid");
        await movie.removeMovie(req.googleClient);
        await movie.removeTrailer(req.googleClient);
        await movie.remove();
        res.send();
    }catch(err){
        res,status(400).send(err.message)
    }
})

app.delete("/movieVideo/:movieId",loginMiddleware,adminMiddleware,async (req,res)=>{
    try{
        let movie=await Movie.findById(req.params.movieId);
        if(!movie)throw new Error("invalid movieid");
        await movie.removeMovie(req.googleClient);
        res.send();
    }catch(err){
        res,status(400).send(err.message)
    }
})

app.delete("/movieTrailer/:movieId",loginMiddleware,adminMiddleware,async (req,res)=>{
    try{
        let movie=await Movie.findById(req.params.movieId);
        if(!movie)throw new Error("invalid movieid");
        await movie.removeTrailer(req.googleClient);
        res.send();
    }catch(err){
        res,status(400).send(err.message)
    }
})





module.exports=app;