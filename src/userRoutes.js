const express=require("express"),
    app=express.Router(),
    User=require("../db/Models/User"),
    axios=require("axios"),
    loginMiddleware=require("../helper/loginMiddleWare");


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
            maxAge:1000*60*60*24*365*2
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

module.exports=app;