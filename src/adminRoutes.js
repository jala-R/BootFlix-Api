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
    bcrypt=require("bcryptjs"),
    fs=require("fs"),
    {Readable}=require("stream");

function getFileExtensions(str){
    let ans=str.slice(str.indexOf("/")+1);
    return ans;
}

class MovieCustomStorage {
    _handleFile(req, file, cb) {
        let temp=0;
        file.stream.once("data",(chunk)=>{
            // temp+=Buffer.byteLength(chunk);
            console.log(`${req.params.movieId}.mp4 movie uploading......`);
        })
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
            // let temp=0;
            // throw new Error("errr on handler function trailer");
            file.stream.once("data",(chunk)=>{
                // temp+=Buffer.byteLength(chunk);
                console.log(`${req.params.movieId}.mp4 trailer uploading......`);
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

// app.get("/isAdmin",logadminMiddleware,adminMiddleware,(req,res)=>{
//     res.send();
// })

app.post("/movie",loginMiddleware,adminMiddleware,async (req,res)=>{
    try{
        let movie=new Movie(req.body);
        movie=await movie.save();
        res.send(movie);
    }catch(err){
        res.status(404).send(err.message);
    }
})


app.post("/upload/movie/:movieId",loginMiddleware,adminMiddleware,movieParse.single("movie"),async (req,res)=>{

    try{
        let movie=await Movie.findById(req.params.movieId);
        movie.movieUploded=true;
        movie.save();
        console.log("movie uploaded....");
        res.send();
    }catch(err){
        res.status(404).send(err.message);
    }
})


app.post("/upload/trailer/:movieId",loginMiddleware,adminMiddleware,trailerParse.single("trailer"),async (req,res)=>{
    try{
        let movie=await Movie.findById(req.params.movieId);
        movie.trailerUploded=true;
        movie.save();
        console.log("trailer uploaded....");
        res.send();
    }catch(err){
        res.status(404).send(err.message);
    }
})

app.put("/movie/:movieId",loginMiddleware,adminMiddleware,async (req,res)=>{
    try{
        // console.log("lollll")
        let movie=await Movie.findById(req.params.movieId);
        if(!movie)throw new Error("invalid id");
        Object.keys(req.body).forEach(data=>{
            movie.set(data,req.body[data]);
        })
        // console.log(movie)
        movie=await movie.save();
        res.send(movie)
    }catch(err){
        res.status(404).send(err.message);
    }
})

app.get("/users",loginMiddleware,adminMiddleware,async (req,res)=>{
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

app.get("/usersTop5",loginMiddleware,adminMiddleware,async (req,res)=>{
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

app.get("/paymentssTop5",loginMiddleware,adminMiddleware,async (req,res)=>{
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

app.get("/getMonthlyUsers",loginMiddleware,adminMiddleware,async (req,res)=>{
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

app.get("/users/:id",loginMiddleware,adminMiddleware,async (req,res)=>{
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

app.get("/userDivisons",loginMiddleware,adminMiddleware,async (req,res)=>{
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
        res.status(400).send(err.message)
    }
})

app.delete("/movieVideo/:movieId",loginMiddleware,adminMiddleware,async (req,res)=>{
    try{
        let movie=await Movie.findById(req.params.movieId);
        if(!movie)throw new Error("invalid movieid");
        await movie.removeMovie(req.googleClient);
        // console.log("lolllll")
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
        res.status(400).send(err.message)
    }
})

app.delete("/user/:id",loginMiddleware,adminMiddleware,async (req,res)=>{
    try{
        let user=await User.findById(req.params.id);
        if(!user)throw new Error("invalid id");
        await user.remove();
        res.send();
    }catch(err){
        res.status(404).send(err.message);
    }
})

app.get("/getAllPayments",loginMiddleware,adminMiddleware,async (req,res)=>{
    try{
        let payments=await Payment.find({},null,{
            sort:{
                createdAt:-1
            }
        })
        for(let i=0;i<payments.length;i++){
            await payments[i].populate({
                path:"userId",
            })
        }
        res.send(payments)
    }catch(err){
        res.status(404).send(err.message);
    }
})



app.post("/adminLogoutAll",async (req,res)=>{
    try{
        let admin=await User.findOne({handle:req.body.email});
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





class ImageCustomStorage {
    _handleFile(req, file, cb) {
        let fileName=`${req.params.movieId}-${file.fieldname}.${getFileExtensions(file.mimetype)}`;

        file.stream.once("data",(chunk)=>{
            console.log(`${fileName} uploading....`)
        })

        file.stream.pipe(req.googleClient.bucket("movie-images").file(fileName).createWriteStream());

        // file.stream.pipe(req.googleClient.bucket("movie-videos").file(req.params.movieId+".mp4").createWriteStream());
        // // 
        file.stream.on("end",()=>{
            console.log(`uploaded succesfully`);
            if(!req.savedFiles){
                req.savedFiles={}
            }
            req.savedFiles[file.fieldname]=fileName;
            cb(null,{});
        })

        file.stream.on("error",(err)=>{
            console.log(err.message);
            cb(null,{});
        })
    }
}

app.post("/upload-movie-images/:movieId",loginMiddleware,adminMiddleware,multer({storage:new ImageCustomStorage()}).fields([
    {
        name:"image",
        maxCount:1
    },
    {
        name:"titleImage",
        maxCount:1
    },
    {
        name:"thumnailImage",
        maxCount:1
    }
]),async (req,res)=>{
    try{
        let movie=await Movie.findById(req.params.movieId);
        if(!movie)throw new Error("invalid movieid");
        movie.image=req.savedFiles.image;
        movie.titleImage=req.savedFiles.titleImage;
        movie.thumnailImage=req.savedFiles.thumnailImage;
        await movie.save();
        res.send(req.savedFiles);
    }catch(err){
        res.status(404).send(err.message)
    }
},(err,req,res,next)=>{
    res.status(404).send(err.message);
})





module.exports=app;