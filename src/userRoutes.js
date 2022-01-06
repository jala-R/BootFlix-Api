const express=require("express"),
    app=express.Router(),
    User=require("../db/Models/User"),
    axios=require("axios"),
    loginMiddleware=require("../helper/loginMiddleWare"),
    isEligible=require("../helper/isEligible"),
    crypto=require("crypto");


app.get("/google-auth",(req,res)=>{
    let url=`https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${process.env.GOOGLECLIENTID}&scope=openid%20email%20profile&redirect_uri=${req.protocol}%3A//${req.headers.host}/oauth-google-callback&state=aroundTrip`
    res.send(url)
})



app.get("/oauth-google-callback",async (req,res)=>{
    try{
        let {data}=await axios({
            url:"https://oauth2.googleapis.com/token",
            method:"post",
            headers:{
                "Content-Type": "application/x-www-form-urlencoded"
            },
            data:`code=${req.query.code}&client_id=${process.env.GOOGLECLIENTID}&client_secret=${process.env.GOOGLESECRET}&redirect_uri=${req.protocol}%3A//${req.headers.host}/oauth-google-callback&grant_type=authorization_code`
        })
        let {data:userInfo}=await axios({
            url:"https://www.googleapis.com/oauth2/v2/userinfo",
            method:"get",
            headers:{
                Authorization:`Bearer ${data.access_token}`
            }
        })
        let gid=userInfo.id;
        let user=await User.findOne({gid});
        if(!user){
            let newUser=new User({
                firstName:userInfo.given_name,
                lastName:userInfo.family_name,
                profilePic:userInfo.picture,
                gid
            })
            user=newUser;
            // console.log(user)
        }
        let token=user.createJWTToken();
        await user.save();
        res.cookie("sid",token,{
            httpOnly:true,
            maxAge:1000*60*60*24*365*2,
            sameSite:"none",
            secure:true
        })
        res.send();
    }catch(err){
        res.status(400).send(err.message);
    }
})


app.get("/logout",loginMiddleware,async (req,res)=>{
    try{
        // console.log(req.user)
        let token=req.cookies.sid;
        req.user.logout(token);
        await req.user.save();
        res.clearCookie("sid");
        res.send("logout succesfully");
    }catch(err){
        console.log(err)
        res.status(400).send(err.message);
    }
})


app.get("/movie/:movieId",loginMiddleware,isEligible,(req,res)=>{
    // console.log(req.params)
    res.send(`<video width="320" height="240" controls>
    <source src="/movie/${req.params.movieId}/watch" type="video/mp4">
    Your browser does not support the video tag.
  </video>`)
})

app.get("/movie/:movieId/watch",loginMiddleware,isEligible,async (req,res)=>{
    let start=Number(req.headers.range.slice(6,req.headers.range.length-1));
    let oneMB=10**6;
    
    let response=(await req.googleClient.bucket("movie-videos").file(`${req.params.movieId}.mp4`).getMetadata());
    let fileSize=(response[0].size)
    let end=Math.min(start+oneMB,fileSize-1);
    let chunkSize=end-start+1;
    res.writeHead(206,{
        "Content-Type":"bytes",
        "Content-Length":chunkSize,
        "Content-Range":`bytes ${start}-${end}/${fileSize}`
    })
    let stream=await req.googleClient.bucket("movie-videos").file(`${req.params.movieId}.mp4`).createReadStream({start,end});
    stream.on("end",()=>{
        res.send();
    });
    stream.pipe(res)
    
})


app.get("/trailer/:movieId",loginMiddleware,isEligible,(req,res)=>{
    // console.log(req.params)
    res.send(`<video width="320" height="240" controls>
    <source src="/trailer/${req.params.movieId}/watch" type="video/mp4">
    Your browser does not support the video tag.
  </video>`)
})

app.get("/trailer/:movieId/watch",loginMiddleware,isEligible,async (req,res)=>{
    let start=Number(req.headers.range.slice(6,req.headers.range.length-1));
    let oneMB=10**6;
    
    let response=(await req.googleClient.bucket("trailer-videos").file(`${req.params.movieId}.mp4`).getMetadata());
    let fileSize=(response[0].size)
    let end=Math.min(start+oneMB,fileSize-1);
    let chunkSize=end-start+1;
    res.writeHead(206,{
        "Content-Type":"bytes",
        "Content-Length":chunkSize,
        "Content-Range":`bytes ${start}-${end}/${fileSize}`
    })
    let stream=await req.googleClient.bucket("trailer-videos").file(`${req.params.movieId}.mp4`).createReadStream({start,end});
    stream.on("end",()=>{
        res.send();
    });
    stream.pipe(res)
    
})

app.get("/upgradePlan/:toPlan",async (req,res)=>{
    try{
        let price;
        if(req.params.toPlan==="Preminum")price=200;
        else if(req.params.toPlan==="Standard")price=100;
        else throw new Error("invalid plan");
        let {data}=await axios({
            method:"post",
            url:"https://api.razorpay.com/v1/orders",
            data:{
                "amount":price,
                "currency":"INR"
            },
            headers:{
                "Content-Type":"application/json",
                "Authorization":"Basic "+Buffer.from(process.env.RAZORPAYID + ':' + process.env.RAZORPAYSECRET).toString('base64')
            }
        })
        data.clientId=process.env.RAZORPAYID;
        res.send(data)

    }catch(err){
        res.status(404).send(err.message);
    }
})

app.post("/payment-succesfull",loginMiddleware,async (req,res)=>{
   try{
        // console.log(req.body)
        var hmac = crypto.createHmac('sha256', process.env.RAZORPAYSECRET);
        let data=hmac.update(req.body.razorpay_order_id+"|"+req.body.razorpay_payment_id).digest('hex');
        // console.log(data)
        // console.log(req.body.razorpay_signature)
        if(req.body.razorpay_signature!==data)throw new Error("invalid signature") ;
        let {data:orderDetails}=await axios({
            method:"get",
            url:`https://api.razorpay.com/v1/orders/${req.body.razorpay_order_id}`,
            headers:{
                "Content-Type":"application/json",
                "Authorization":"Basic "+Buffer.from(process.env.RAZORPAYID + ':' + process.env.RAZORPAYSECRET).toString('base64')
            }
        })  
        // console.log(orderDetails)
        if(orderDetails.status!=="paid")throw new Error("not paid yet");
        if(orderDetails.amount_paid==process.env.SATANDARDPRICE)req.user.upgradePlan("Standard");
        else if(orderDetails.amount_paid==process.env.PREMIMUMPRICE)req.user.upgradePlan("Preminum");

        req.user.createPayment(req.body);

        await req.user.save();
        // console.log(req.user)
        res.send();
   }catch(err){
        res.status(404).send(err.message)
   }

})


app.get("/getPaymentList",loginMiddleware,(req,res)=>{
    console.log(req.user.populate("payments"));
    req.send(req.user.payments)
})

app.get("/me",loginMiddleware,(req,res)=>{
    req.user.getPlan()
    res.send(req.user)
})

module.exports=app;