function adminMiddleware(req,res,next){
    return next();
    if(!req.user.isAdmin)res.status(404).send("not authorized");
    return next();
}

module.exports=adminMiddleware;