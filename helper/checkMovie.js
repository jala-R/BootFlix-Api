const jwt=require("jsonwebtoken");

function checkMovie(req,res,next){
    if(!req.cookies.mid)res.status(404).send("movie not eligible");
    let payload=jwt.verify(req.cookies.mid,process.env.JWTSECRET);
    console.log(req.user);
    console.log(payload);
    next();
}

module.exports=checkMovie;