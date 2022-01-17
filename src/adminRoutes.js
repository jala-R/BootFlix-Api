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
    getAccountAge=require("../helper/getAccountAge"),
    Payment=require("../db/Models/payment"),
    bcrypt=require("bcryptjs");



class MovieCustomStorage {
    _handleFile(req, file, cb) {
        let temp=0;
        file.stream.on("data",(chunk)=>{
            temp+=Buffer.byteLength(chunk);
            console.log(temp);
        })
        // file.stream.pipe(req.googleClient.bucket("movie-videos").file(req.params.movieId+".mp4").createWriteStream());
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
            // file.stream.pipe(req.googleClient.bucket("trailer-videos").file(req.params.movieId+".mp4").createWriteStream());
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


app.post("/upload/movie/:movieId",movieParse.single("movie"),(req,res)=>{
    console.log(req.headers)
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

app.get("/usersTop5",async (req,res)=>{
    try{
        let users=await User.find({},null,{
            sort:{
                createdAt:-1
            },
            limit:5
        })
        res.send(users);
    }catch(err){
        res.status(400).send(err.message)
    }
})

app.get("/paymentssTop5",async (req,res)=>{
    try{
        let payments=await Payment.find({},null,{
            sort:{
                createdAt:-1
            },
            limit:5
        })
        for(let i=0;i<payments.length;i++){
            (await payments[i].populate({
                path:"userId",
                select:"firstName lastName profilePic"
            }));
            // console.log(i);
        }
        res.send(payments);
    }catch(err){
        res.status(400).send(err.message)
    }
})

app.get("/getMonthlyUsers",async (req,res)=>{
    try{
        let today=new Date();
        let curMonth=today.getMonth();
        let curYear=today.getFullYear();
        let users=await User.find({});
        let monthsRec=[];
        for(let i=0;i<12;i++){
            monthsRec[i]={
                count:0,
                month:1+(curMonth-i+12)%12
            }
        }
        users.forEach((user)=>{
            let diff=getAccountAge(curMonth,curYear,user.createdAt);
            monthsRec[diff].count++;
        })
        res.send(monthsRec)

    }catch(err){
        res.status(404).send(err.message);
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
        let today=new Date();
        let curMonth=today.getMonth();
        let curYear=today.getFullYear();
        for(let i=0;i<12;i++)userCountsMonthly[i]={
            count:0,
            month:1+((curMonth-i+12)%12)
        };
        let prevMonthUsers=0,curMonthUsers=0
        users.forEach((user)=>{
            let diff=getAccountAge(curMonth,curYear,user.createdAt);
            if(diff==0)curMonthUsers++;
            else if(diff==1)prevMonthUsers++;
            user.planDetails=user.getPlan();
            if(user.planDetails.plan==="Standard")standard++;
            else if(user.planDetails.plan==="Preminum")preminum++;
            else free++;
        })


        let payments=await Payment.find({});

        let totalRevenue=0,prevMonthRevenue=0,curMonthRevenue=0;
        payments.forEach((payment)=>{
            let diff=getAccountAge(curMonth,curYear,payment.createdAt);
            if(diff===0){
                curMonthRevenue+=(payment.toPlan==="Standard")?Number(process.env.SATANDARDPRICE)/100:((payment.toPlan==="Preminum")?Number(process.env.PREMIMUMPRICE)/100:0);
            }else if(diff===1){
                prevMonthRevenue+=(payment.toPlan==="Standard")?Number(process.env.SATANDARDPRICE)/100:((payment.toPlan==="Preminum")?Number(process.env.PREMIMUMPRICE)/100:0);
            }
            totalRevenue+=(payment.toPlan==="Standard")?Number(process.env.SATANDARDPRICE)/100:((payment.toPlan==="Preminum")?Number(process.env.PREMIMUMPRICE)/100:0);
            
        })
        let userComparision=prevMonthUsers==0?curMonthUsers*100:100*(curMonthUsers-prevMonthUsers)/prevMonthUsers;
        let revenueComparision=prevMonthRevenue==0?curMonthRevenue*100:100*(curMonthRevenue-prevMonthRevenue)/prevMonthRevenue

        res.send({
            curMonthRevenue,
            curMonthUsers,
            totalUsers:preminum+standard+free,
            totalSubcribers:preminum+standard,
            totalRevenue,
            userComparision:userComparision.toFixed(2),
            revenueComparision:revenueComparision.toFixed(2)
            
        })
        
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

app.delete("/movieVideo/:movieId",async (req,res)=>{
    try{
        let movie=await Movie.findById(req.params.movieId);
        if(!movie)throw new Error("invalid movieid");
        await movie.removeMovie(req.googleClient);
        console.log("lolllll")
        res.send();
    }catch(err){
        res.status(400).send(err.message)
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

app.delete("/user/:id",async (req,res)=>{
    try{
        let user=await User.findById(req.params.id);
        if(!user)throw new Error("invalid id");
        await user.remove();
        res.send();
    }catch(err){
        res.status(404).send(err.message);
    }
})

app.get("/getAllPayments",async (req,res)=>{
    try{
        let payments=await Payment.find({},null,{
            sort:{
                createdAt:-1
            }
        })
        res.send(payments)
    }catch(err){
        res.status(404).send(err.message);
    }
})



app.post("/adminLogoutAll",async (req,res)=>{
    try{
        let admin=await User.findOne({email:req.body.email});
        if(!admin||!admin.isAdmin)throw new Error("forbidden actions");
        let response=await bcrypt.compare(req.body.password,admin.password);
        if(!response)throw new Error("invalid credentials");
        admin.logoutAll();
        let token=admin.createJWTToken(res);
        admin=await admin.save();
        res.cookie("sid",token,{
            httpOnly:true,
            maxAge:1000*60*60*24*365*2,
            sameSite:"none",
            secure:true,
            path:"/"
        })
        res.send(admin);
    }catch(err){
        res.status(404).send(err.message);
    }
})

module.exports=app;