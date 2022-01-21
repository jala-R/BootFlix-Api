const Movie=require("../db/Models/Movies");


async function isEligible(req,res,next){
    try{
        return next();
        let movie=await Movie.findById(req.params.movieId);
        if(!movie)throw new Error("invalid movie");
        let movieLvl=movie.plan;
        let {plan:userLvl}=req.userLvl.getPlan();
        if(userLvl==="Preminum")return next();
        else if(userLvl==="Standard"){
            if(movieLvl==="Preminum")throw new Error("not eligible");
            return next();
        }else{
            if(movieLvl!="Free")throw new Error("not eligible");
            return next();
        }

    }catch(err){
        res.status(404).send(err.message);
    }
}

module.exports=isEligible;