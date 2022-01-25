const express=require("express"),
    app=express.Router(),
    User=require("../db/Models/User"),
    axios=require("axios"),
    loginMiddleware=require("../helper/loginMiddleWare"),
    isEligible=require("../helper/isEligible"),
    crypto=require("crypto"),
    Movie=require("../db/Models/Movies");


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
                gid,
                handle:userInfo.email
            })
            user=newUser;
            // console.log(user)
        }
        let token=user.createJWTToken(res);
        await user.save();
        res.cookie("sid",token,{
            httpOnly:true,
            maxAge:1000*60*60*24*365*2,
            sameSite:"none",
            secure:true,
            path:"/"
        })
        res.redirect("https://bootflix.herokuapp.com");
    }catch(err){
        if(err.message==="SLR")return res.redirect("https://bootflix.herokuapp.com/logoutall")
        res.status(400).send(err.message);
    }
})


app.get("/logout",loginMiddleware,async (req,res)=>{
    try{
        // console.log(req.user)
        let token=req.cookies.sid;
        req.user.logout(token);
        await req.user.save();
        res.clearCookie("sid",{
            path:"/",
            sameSite:"none",
            secure:true
        });
        res.send("logout succesfully");
    }catch(err){
        // console.log(err)
        res.status(400).send(err.message);
    }
})


// app.get("/movie/:movieId",(req,res)=>{
//     // console.log(req.params)
//     res.send(`<video width="320" height="240" controls>
//     <source src="/movie/${req.params.movieId}/watch" type="video/mp4">
//     Your browser does not support the video tag.
//   </video>`)
// })

app.get("/movie/:movieId/watch",async (req,res)=>{
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
        if(orderDetails.amount_paid==process.env.SATANDARDPRICE){req.user.upgradePlan("Standard");req.body.toPlan="Standard"}
        else if(orderDetails.amount_paid==process.env.PREMIMUMPRICE){req.user.upgradePlan("Preminum");req.body.toPlan="Preminum"}

        await req.user.createPayment(req.body);

        await req.user.save();
        // console.log(req.user)
        res.send();
   }catch(err){
        res.status(404).send(err.message)
   }

})


app.get("/getPaymentList",loginMiddleware,async (req,res)=>{
    // console.log(req.user.payments);
    await (req.user.populate({
        path:"payments",
        select:"toPlan createdAt -userId",
        options:{
            sort:{
                createdAt:-1
            }
        }
    }));
    // console.log(req.user.payments);
    res.send(req.user.payments)
})

app.get("/me",loginMiddleware,async (req,res)=>{
    // req.user.getPlan()
    await req.user.populate("whislist.$*");
    // console.log(req.user.whislist)
    res.send(req.user)
})


app.get("/google-logoutAll",(req,res)=>{
    let url=`https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${process.env.GOOGLECLIENTID}&scope=openid%20email%20profile&redirect_uri=${req.protocol}%3A//${req.headers.host}/logoutAll-google-callback&state=aroundTrip`
    res.send(url)
})

app.get("/logoutAll-google-callback",async (req,res)=>{
    try{
        let {data}=await axios({
            url:"https://oauth2.googleapis.com/token",
            method:"post",
            headers:{
                "Content-Type": "application/x-www-form-urlencoded"
            },
            data:`code=${req.query.code}&client_id=${process.env.GOOGLECLIENTID}&client_secret=${process.env.GOOGLESECRET}&redirect_uri=${req.protocol}%3A//${req.headers.host}/logoutAll-google-callback&grant_type=authorization_code`
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
                gid,
                handle:userInfo.email
            })
            user=newUser;
            // console.log(user)
        }
        user.logoutAll();
        let token=user.createJWTToken();
        await user.save();
        res.cookie("sid",token,{
            httpOnly:true,
            maxAge:1000*60*60*24*365*2,
            sameSite:"none",
            secure:true,
            path:"/"
        })
        res.redirect("https://bootflix.herokuapp.com");
    }catch(err){
        res.status(400).send(err.message);
    }
})

app.get("/movie/:id",async (req,res)=>{
    try{
        let movie=await Movie.findById(req.params.id);
        if(!movie)throw new Error("invalid id");
        res.send(movie)
    }catch(err){
        res.status(404).send(err.message);
    }
})

app.get("/addMovieToWhislist/:movieId",loginMiddleware,async (req,res)=>{
    try{
        let movie=await Movie.findById(req.params.movieId);
        if(!movie)throw new Error("invalid movie id");
        req.user.addMovieToWhislist(req.params.movieId);
        await req.user.save();
        res.send();
    }catch(err){
        res.status(404).send(err.message);
    }
})

app.get("/removeMovieFromWhislist/:movieId",loginMiddleware,async (req,res)=>{
    try{
        let movie=await Movie.findById(req.params.movieId);
        if(!movie)throw new Error("invalid movie id");
        req.user.removeMovieFromWhislist(req.params.movieId);
        await req.user.save();
        res.send();
    }catch(err){
        res.status(404).send(err.message);
    }
})

app.get("/getWhishList",loginMiddleware,async (req,res)=>{
    try{
        await req.user.populate("whislist.$*");
        // console.log(req.user)
        res.send(req.user.whislist);
    }catch(err){
        res.status(404).send(err.message);
    }
})



//twitter oauth
//https://apibootflix.herokuapp.com/twitter-oauth
//https://apibootflix.herokuapp.com/twitter-logoutAll

app.get("/twitter-oauth-link",async (req,res)=>{
    res.redirect((`https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${process.env.TWITTERCLIENTID}&redirect_uri=https://apibootflix.herokuapp.com/twitter-oauth&scope=tweet.read%20offline.access%20users.read&state=3027087406414.963&code_challenge=challenge&code_challenge_method=plain`));
})

app.get("/twitter-oauth",async (req,res)=>{
    try{
        if(req.query.error)return res.redirect("https://bootflix.herokuapp.com");
        let {data:response}=await axios({
            method:"post",
            url:"https://api.twitter.com/2/oauth2/token",
            headers:{
                'Content-Type': 'application/x-www-form-urlencoded',
                "Authorization":"Basic "+Buffer.from(process.env.TWITTERCLIENTID + ':' + process.env.TWITTERCLIENTSECRET).toString('base64')
                
            },
            data:`code=${req.query.code}&grant_type=authorization_code&client_id=${process.env.TWITTERCLIENTID}&redirect_uri=${encodeURIComponent("https://apibootflix.herokuapp.com/twitter-oauth")}&code_verifier=challenge`
        })
        // console.log(response.access_token);
        let {data}=await axios({
            method:"get",
            url:"https://api.twitter.com/2/users/me?user.fields=id%2Cusername%2Cname%2Cprofile_image_url",
            headers:{
                "Authorization":`Bearer ${response.access_token}`
            }
        })
        let {data:userInfo}=data;
        // console.log(userInfo)
        let tid=userInfo.id;
        let user=await User.findOne({tid});
        if(!user){
            let newUser=new User({
                firstName:userInfo.name,
                profilePic:userInfo.profile_image_url,
                tid,
                handle:userInfo.username
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
            secure:true,
            path:"/"
        })
        res.redirect("https://bootflix.herokuapp.com");
        
    }catch(err){
        if(err.message==="SLR")return res.redirect("https://bootflix.herokuapp.com/logoutall")
        res.status(400).send(err.message);
    }
})


app.get("/twitter-oauth-logout",async (req,res)=>{
    res.redirect((`https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${process.env.TWITTERCLIENTID}&redirect_uri=https://apibootflix.herokuapp.com/twitter-oauth-logoutAll&scope=tweet.read%20offline.access%20users.read&state=3027087406414.963&code_challenge=challenge&code_challenge_method=plain`));
})

app.get("/twitter-oauth-logoutAll",async (req,res)=>{
    try{
        if(req.query.error)return res.redirect("https://bootflix.herokuapp.com");
        let {data:response}=await axios({
            method:"post",
            url:"https://api.twitter.com/2/oauth2/token",
            headers:{
                'Content-Type': 'application/x-www-form-urlencoded',
                "Authorization":"Basic "+Buffer.from(process.env.TWITTERCLIENTID + ':' + process.env.TWITTERCLIENTSECRET).toString('base64')
                
            },
            data:`code=${req.query.code}&grant_type=authorization_code&client_id=${process.env.TWITTERCLIENTID}&redirect_uri=${encodeURIComponent("https://apibootflix.herokuapp.com/twitter-oauth-logoutAll")}&code_verifier=challenge`
        })
        // console.log(response.access_token);
        let {data}=await axios({
            method:"get",
            url:"https://api.twitter.com/2/users/me?user.fields=id%2Cusername%2Cname%2Cprofile_image_url",
            headers:{
                "Authorization":`Bearer ${response.access_token}`
            }
        })
        let {data:userInfo}=data;
        // console.log(userInfo)
        let tid=userInfo.id;
        let user=await User.findOne({tid});
        if(!user){
            let newUser=new User({
                firstName:userInfo.name,
                profilePic:userInfo.profile_image_url,
                tid,
                handle:userInfo.username
            })
            user=newUser;
            // console.log(user)
        }
        user.logoutAll();
        let token=user.createJWTToken();
        await user.save();
        res.cookie("sid",token,{
            httpOnly:true,
            maxAge:1000*60*60*24*365*2,
            sameSite:"none",
            secure:true,
            path:"/"
        })
        res.redirect("https://bootflix.herokuapp.com");
        
    }catch(err){
        console.log(err);
        res.status(404).send(err.message);
    }
})

app.get("/list-movies",async (req,res)=>{
    try{
        let {search,genre,language}=req.query;
        let gotQuery=search||genre||language||false;
        let stages=[{
            $match:{
                $and:[

                ]
            }
        }];
        if(genre){
            stages[0]["$match"]["$and"].push({
                genre:{$regex:"^"+genre+"$",$options:"imx"}
            })
        }

        if(language){
            stages[0]["$match"]["$and"].push({
                language:{$regex:"^"+language+"$",$options:"imx"}
            })
        }
        if(search){
            let dup=search;
            search="\\s*";
            for(let i=0;i<dup.length;i++){
                // console.log()
                search+=dup[i];
                search+="\\s*"
            }
            // console.log(search)
            stages[0]["$match"]["$and"].push({
                movieName:{$regex:search,$options:"ix"}
            })
        }
        let result;
        if(!gotQuery){
            result=await Movie.find({},null,{
                sort:{
                    year:-1
                }
            })
        }else{
            stages.push({
                $sort:{
                    year:-1
                }
            })
            result=await Movie.aggregate(stages)
        }
        
        res.send({
            result
        });
    }catch(err){
        res.status(404).send(err.message);
    }
})


app.get("/get-images/:imageName",async (req,res)=>{
    try{
        // console.log(req.params.)
        
        let  data=await req.googleClient.bucket("movie-images").file(req.params.imageName).getMetadata();
        res.set("Content-Type",data[0].contentType)
        let stream=await req.googleClient.bucket("movie-images").file(req.params.imageName).createReadStream()
        stream.pipe(res);
    }catch(err){
        // console.log(err)
        res.status(404).send(err.message);
    }
})


app.get("/movie-genrewise",async (req,res)=>{
    try{
        let movies=await Movie.find({},null,{
            sort:{
                year:-1
            }
        });
        let result={};
        movies.forEach(movie=>{
            movie.genre.forEach(genre=>{
                if(result[genre])result[genre].push(movie);
                else result[genre]=[movie]
            })
        })
        let response=[];
        Object.keys(result).forEach(genre=>{
            response.push({
                genre,
                value:result[genre]
            })
        })
        res.send(response);
    }catch(err){
        res.status(404).send(err.message);
    }
})

app.get("/addToHistory",loginMiddleware,async (req,res)=>{
    try{
        req.user.addToHistory(req.query);
    }catch(err){
        res.status(404).send(err.message);
    }
})

module.exports=app;