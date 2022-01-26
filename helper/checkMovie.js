const jwt=require("jsonwebtoken");

function checkMovie(req,res,next){
    if(!req.cookies.mid)return res.status(404).send("movie not eligible");
    let payload=jwt.verify(req.cookies.mid,process.env.JWTSECRET);
    console.log(payload.movie);
    let movieLvl=payload.movie.plan;
    let {plan:userLvl}=req.user.getPlan();
    // console.log(userLvl);
    if(userLvl==="Preminum")return next();
    else if(userLvl==="Standard"){
        if(movieLvl==="Preminum")return res.status(404).send("movie not eligible");
        return next();
    }else{
        // console.log(movieLvl);
        if(movieLvl!="Free")return res.status(404).send("movie not eligible");
        return next();
    }
}

module.exports=checkMovie;