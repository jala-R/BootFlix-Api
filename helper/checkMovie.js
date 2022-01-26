const jwt=require("jsonwebtoken");

function checkMovie(req,res,next){
    if(!req.cookies.mid)return res.status(404).send("movie not eligible");
    let payload=jwt.verify(req.cookies.mid,process.env.JWTSECRET);
    // console.log(payload);
    let moviePlan=payload.movie.plan;
    let {plan:userPlan}=req.user.getPlan();
    console.log(moviePlan,userPlan);
    next();
}

module.exports=checkMovie;