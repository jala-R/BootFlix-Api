const express=require("express"),
    app=express(),
    userRoutes=require("./src/userRoutes"),
    cookieParser=require("cookie-parser"),
    {Storage}=require("@google-cloud/storage"),
    storage = new Storage({keyFilename:"./envs/apikeys.json"}),
    adminRoutes=require("./src/adminRoutes");
require("./db/connect");
//Configs
app.use(express.json());
app.use(cookieParser(process.env.COOKIESECRET))


//Middleware
app.use((req,res,next)=>{
    req.googleClient=storage;
    next();
})
app.use((req,res,next)=>{
    res.set('Access-Control-Allow-Origin',`${req.headers.origin}`)
    res.set("Access-Control-Allow-Headers","Content-Type");
    res.set("Access-Control-Allow-Credentials","true");
    next();
})

//Router Merge Point
app.use(userRoutes)
app.use(adminRoutes)


app.listen(process.env.PORT,()=>{
    console.log(`server running on ${process.env.PORT}`);
})