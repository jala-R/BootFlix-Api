const jwt=require("jsonwebtoken"),
    User=require("../db/Models/User");

async function loginMiddleware(req,res,next){
    try{
        console.log(req.cookies);
        if(!req.cookies||!req.cookies.sid)throw new Error("not authenticated");
        let token=req.cookies.sid;
        let {id}=(jwt.verify(token,process.env.JWTSECRET));
        let user=await User.findById(id);
        if(!user)throw new Error("not authenticated");
        for(let i=0;i<user.tokens.length;i++){
            if(user.tokens[i]===token){
                req.user=user;
                return next()
            }
        }
        throw new Error("not authenticated");
    }catch(err){
        // console.log(err)
        res.status(404).send(err.message);
    }
}


module.exports=loginMiddleware